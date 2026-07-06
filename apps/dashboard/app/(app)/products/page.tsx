import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AddProductForm } from '@/components/add-product-form';
import type { Product } from '@/lib/types';

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  const products = (data ?? []) as Product[];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="text-sm text-muted-foreground">
          Any website or app you add here can be tested automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a product</CardTitle>
        </CardHeader>
        <CardContent>
          <AddProductForm />
        </CardContent>
      </Card>

      {error ? (
        <Alert>
          <AlertTitle>Database not ready</AlertTitle>
          <AlertDescription>
            Run <code className="rounded bg-muted px-1">supabase db push</code> to create the
            tables, then reload. ({error.message})
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your products</CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No products yet. Add one above.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Platforms</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <Link href={`/products/${p.id}`} className="hover:underline">
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.base_url}</TableCell>
                      <TableCell className="space-x-1">
                        {(p.platforms ?? []).map((pl) => (
                          <Badge key={pl} variant="secondary">
                            {pl}
                          </Badge>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
