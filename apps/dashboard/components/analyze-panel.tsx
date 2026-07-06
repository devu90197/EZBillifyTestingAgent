'use client';

import { useState, useTransition } from 'react';
import { ScanSearch, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { analyzeProductAction } from '@/app/(app)/products/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AnalyzeResult } from '@/lib/types';

export function AnalyzePanel({
  productId,
  baseUrl,
  initial,
}: {
  productId: string;
  baseUrl: string;
  initial: AnalyzeResult | null;
}) {
  const [result, setResult] = useState<AnalyzeResult | null>(initial);
  const [pending, startTransition] = useTransition();

  function runAnalyze() {
    startTransition(async () => {
      try {
        const r = await analyzeProductAction(productId, baseUrl);
        setResult(r);
        toast.success(
          r.login.found ? `Login detected: ${r.login.scheme}` : 'Analysis complete',
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Analysis failed');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Read-only crawl + automatic login detection.
          </p>
        </div>
        <Button onClick={runAnalyze} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
          {pending ? 'Analyzing…' : result ? 'Re-analyze' : 'Analyze'}
        </Button>
      </div>

      {!result ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Run an analysis to discover pages and detect how login works.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Login detection
                {result.login.found ? (
                  <Badge>{result.login.scheme}</Badge>
                ) : (
                  <Badge variant="secondary">not found</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {result.login.found ? (
                <>
                  <div className="text-muted-foreground">
                    Login URL:{' '}
                    <span className="font-mono text-foreground">{result.login.loginUrl}</span>
                  </div>
                  <div className="space-y-1">
                    {result.login.fields.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 font-mono text-xs">
                        <Badge variant="outline" className="w-24 justify-center">
                          {f.role}
                        </Badge>
                        <span className="text-foreground">{f.selector}</span>
                        {f.label ? <span className="text-muted-foreground">({f.label})</span> : null}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  No login form found at the homepage or common paths. If the app login lives on a
                  subdomain (e.g. app.{baseUrl.replace(/^https?:\/\//, '')}), add that URL as the
                  product instead.
                </p>
              )}
              {result.login.notes.length > 0 ? (
                <ul className="list-inside list-disc text-xs text-muted-foreground">
                  {result.login.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Discovered pages{' '}
                <span className="text-muted-foreground">({result.crawl.pagesCrawled})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Status</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Title</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.crawl.pages.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant={p.status >= 200 && p.status < 400 ? 'secondary' : 'destructive'}>
                          {p.status || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate font-mono text-xs">{p.url}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {p.title}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
