import Link from 'next/link';
import { Package, ScanSearch, ListChecks } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

async function count(table: string): Promise<number | null> {
  const supabase = await createClient();
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) return null;
  return count ?? 0;
}

export default async function DashboardPage() {
  const [products, analyses, runs] = await Promise.all([
    count('products'),
    count('site_analyses'),
    count('test_runs'),
  ]);
  const schemaMissing = products === null;

  const stats = [
    { label: 'Products', value: products ?? 0, icon: Package },
    { label: 'Analyses', value: analyses ?? 0, icon: ScanSearch },
    { label: 'Test runs', value: runs ?? 0, icon: ListChecks },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Onboard a product, analyze it, and test it automatically.
        </p>
      </div>

      {schemaMissing ? (
        <Alert>
          <AlertTitle>Finish the database setup</AlertTitle>
          <AlertDescription>
            Run <code className="rounded bg-muted px-1">supabase db push</code> to create the
            platform tables, then reload.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Get started</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Add a product by its URL — EZT crawls it and auto-detects how its login works.
          </p>
          <Link href="/products" className={buttonVariants()}>
            Add a product
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
