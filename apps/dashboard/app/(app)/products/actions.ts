'use server';

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { encryptSecret, decryptSecret } from '@/lib/crypto';
import type { AnalyzeResult, AuthRunResult } from '@/lib/types';

export type AddProductState = { error?: string } | null;

export async function addProduct(
  _prev: AddProductState,
  formData: FormData,
): Promise<AddProductState> {
  const name = String(formData.get('name') ?? '').trim();
  const base_url = String(formData.get('base_url') ?? '').trim();
  if (!name || !base_url) return { error: 'Name and URL are required.' };
  try {
    // eslint-disable-next-line no-new
    new URL(base_url);
  } catch {
    return { error: 'Enter a valid URL (including https://).' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .insert({ name, base_url })
    .select('id')
    .single();
  if (error) return { error: error.message };

  redirect(`/products/${data.id}`);
}

export async function analyzeProductAction(
  productId: string,
  baseUrl: string,
): Promise<AnalyzeResult> {
  const result = await runAnalyze(baseUrl);

  // Best-effort persist (works once the schema is pushed).
  const supabase = await createClient();
  const { data: analysis } = await supabase
    .from('site_analyses')
    .insert({
      product_id: productId,
      origin: result.origin,
      pages_crawled: result.crawl.pagesCrawled,
      login_scheme: result.login.scheme,
      login_url: result.login.loginUrl ?? null,
      result,
      finished_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (analysis) {
    const rows = result.crawl.pages.slice(0, 50).map((p) => ({
      analysis_id: analysis.id,
      url: p.url,
      status: p.status,
      title: p.title,
      depth: p.depth,
    }));
    if (rows.length) await supabase.from('discovered_pages').insert(rows);
  }

  revalidatePath(`/products/${productId}`);
  return result;
}

export type CredState = { error?: string; ok?: boolean } | null;

export async function saveCredentials(_prev: CredState, formData: FormData): Promise<CredState> {
  const productId = String(formData.get('productId') ?? '');
  const identifierType = String(formData.get('identifier_type') ?? 'email');
  const identifier = String(formData.get('identifier') ?? '').trim();
  const secret = String(formData.get('secret') ?? '');
  if (!productId || !identifier || !secret) return { error: 'Identifier and secret are required.' };

  const supabase = await createClient();
  // Replace any existing default credential for this product.
  await supabase.from('product_credentials').delete().eq('product_id', productId).eq('label', 'default');
  const { error } = await supabase.from('product_credentials').insert({
    product_id: productId,
    label: 'default',
    identifier_type: identifierType,
    identifier,
    secret_encrypted: encryptSecret(secret),
  });
  if (error) return { error: error.message };

  revalidatePath(`/products/${productId}`);
  return { ok: true };
}

export async function runAuthTests(productId: string): Promise<AuthRunResult> {
  const supabase = await createClient();

  const { data: product, error: pErr } = await supabase
    .from('products')
    .select('base_url')
    .eq('id', productId)
    .single();
  if (pErr || !product) throw new Error('Product not found.');

  const { data: analysis } = await supabase
    .from('site_analyses')
    .select('result')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const login = (analysis?.result as AnalyzeResult | undefined)?.login;
  if (!login?.found) throw new Error('Run an analysis that detects a login first.');

  const { data: cred } = await supabase
    .from('product_credentials')
    .select('identifier, secret_encrypted')
    .eq('product_id', productId)
    .eq('label', 'default')
    .maybeSingle();
  if (!cred) throw new Error('Add test credentials first.');

  const config = {
    baseUrl: product.base_url as string,
    login: { loginUrl: login.loginUrl, scheme: login.scheme, fields: login.fields },
    credentials: { identifier: cred.identifier as string, secret: decryptSecret(cred.secret_encrypted as string) },
    maxPages: 15,
    maxDepth: 1,
  };

  const result = await runAuthCli(config);

  await supabase.from('test_runs').insert({
    product_id: productId,
    kind: 'web-auth',
    status: result.loginSuccess && result.failed === 0 ? 'passed' : result.loginSuccess ? 'partial' : 'failed',
    started_at: result.startedAt,
    finished_at: result.finishedAt,
    summary: result,
  });

  revalidatePath(`/products/${productId}`);
  return result;
}

function runAuthCli(config: unknown): Promise<AuthRunResult> {
  const root = repoRoot();
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['--filter', '@ezt/cli', 'exec', 'tsx', 'src/index.ts', 'run-auth'], {
      cwd: root,
      shell: process.platform === 'win32',
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(err.slice(-500) || `run-auth exited ${code}`));
      try {
        resolve(JSON.parse(out) as AuthRunResult);
      } catch {
        reject(new Error('Could not parse authenticated-run output.'));
      }
    });
    child.stdin.write(JSON.stringify(config));
    child.stdin.end();
  });
}

function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function runAnalyze(url: string): Promise<AnalyzeResult> {
  const root = repoRoot();
  return new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      ['--filter', '@ezt/cli', 'exec', 'tsx', 'src/index.ts', 'analyze', url, '--json', '--max-pages', '20', '--max-depth', '2'],
      { cwd: root, shell: process.platform === 'win32' },
    );
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(err.slice(-500) || `analyzer exited ${code}`));
      try {
        resolve(JSON.parse(out) as AnalyzeResult);
      } catch {
        reject(new Error('Could not parse analyzer output.'));
      }
    });
  });
}
