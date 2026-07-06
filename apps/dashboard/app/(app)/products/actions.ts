'use server';

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AnalyzeResult } from '@/lib/types';

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
