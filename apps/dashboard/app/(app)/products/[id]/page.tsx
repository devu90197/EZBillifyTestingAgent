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
import type { AnalyzeResult, Product } from '@/lib/types';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase.from('products').select('*').eq('id', id).single();
  if (!product) notFound();
  const p = product as Product;

  const { data: latest } = await supabase
    .from('site_analyses')
    .select('result')
    .eq('product_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const initial = (latest?.result as AnalyzeResult | undefined) ?? null;

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

      <AnalyzePanel productId={p.id} baseUrl={p.base_url} initial={initial} />
    </div>
  );
}
