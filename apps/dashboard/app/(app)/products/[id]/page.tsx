import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AnalyzePanel } from '@/components/analyze-panel';
import { CredentialForm } from '@/components/credential-form';
import { AuthTestsPanel } from '@/components/auth-tests-panel';
import type { AnalyzeResult, AuthRunResult, Product, SiteAnalysisRow } from '@/lib/types';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase.from('products').select('*').eq('id', id).single();
  if (!product) notFound();
  const p = product as Product;

  const { data: analysisRow } = await supabase
    .from('site_analyses')
    .select('result')
    .eq('product_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const initial = (analysisRow?.result as AnalyzeResult | undefined) ?? null;
  const login = initial?.login ?? null;

  const { data: cred } = await supabase
    .from('product_credentials')
    .select('identifier')
    .eq('product_id', id)
    .eq('label', 'default')
    .maybeSingle();

  const { data: lastRun } = await supabase
    .from('test_runs')
    .select('summary')
    .eq('product_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const latestRun = (lastRun?.summary as AuthRunResult | undefined) ?? null;

  const { data: historyRows } = await supabase
    .from('site_analyses')
    .select('id, created_at, login_scheme, login_url, pages_crawled')
    .eq('product_id', id)
    .order('created_at', { ascending: false })
    .limit(10);
  const history = (historyRows ?? []) as SiteAnalysisRow[];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/products"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-2 text-muted-foreground')}
      >
        <ArrowLeft className="size-4" />
        Products
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {p.name}
            {(p.platforms ?? []).map((pl) => (
              <Badge key={pl} variant="secondary">
                {pl}
              </Badge>
            ))}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <a
            href={p.base_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            <Globe className="size-4" />
            {p.base_url}
          </a>
        </CardContent>
      </Card>

      <Separator />
      <AnalyzePanel productId={p.id} baseUrl={p.base_url} initial={initial} autoRun={!initial} />

      {login?.found ? (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test credentials</CardTitle>
            </CardHeader>
            <CardContent>
              <CredentialForm
                productId={p.id}
                scheme={login.scheme}
                existingIdentifier={cred?.identifier as string | undefined}
              />
            </CardContent>
          </Card>

          <Separator />
          <AuthTestsPanel
            productId={p.id}
            canRun={!!cred}
            reason={cred ? undefined : 'Add test credentials above to enable authenticated tests.'}
            latest={latestRun}
          />
        </>
      ) : initial ? (
        <p className="text-sm text-muted-foreground">
          No login detected. If the app login lives on a subdomain, add that URL as a separate
          product and analyze it.
        </p>
      ) : null}

      {history.length > 0 ? (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Analysis history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between border-b py-2 last:border-0"
                >
                  <span className="text-muted-foreground">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-3">
                    <Badge variant="outline">{h.login_scheme ?? 'unknown'}</Badge>
                    <span className="tabular-nums text-muted-foreground">
                      {h.pages_crawled ?? 0} pages
                    </span>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
