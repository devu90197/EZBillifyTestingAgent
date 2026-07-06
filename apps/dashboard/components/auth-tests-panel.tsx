'use client';

import { useState, useTransition } from 'react';
import { PlayCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { runAuthTests } from '@/app/(app)/products/actions';
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
import type { AuthRunResult } from '@/lib/types';

export function AuthTestsPanel({
  productId,
  canRun,
  reason,
  latest,
}: {
  productId: string;
  canRun: boolean;
  reason?: string;
  latest: AuthRunResult | null;
}) {
  const [result, setResult] = useState<AuthRunResult | null>(latest);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      try {
        const r = await runAuthTests(productId);
        setResult(r);
        toast[r.loginSuccess ? 'success' : 'error'](
          r.loginSuccess ? `Signed in · ${r.passed}/${r.pagesChecked} pages OK` : 'Login failed',
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Authenticated run failed');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Authenticated tests</h2>
          <p className="text-sm text-muted-foreground">
            Log in with the saved credentials, then crawl and check pages behind auth.
          </p>
        </div>
        <Button onClick={run} disabled={!canRun || pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
          {pending ? 'Running…' : 'Run authenticated tests'}
        </Button>
      </div>

      {!canRun && reason ? <p className="text-sm text-muted-foreground">{reason}</p> : null}

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Last run
              <Badge variant={result.loginSuccess ? 'default' : 'destructive'}>
                {result.loginSuccess ? 'login ok' : 'login failed'}
              </Badge>
              <span className="text-sm font-normal text-muted-foreground">
                {result.passed}/{result.pagesChecked} pages passed
                {result.failed ? ` · ${result.failed} failed` : ''}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{result.detail}</p>
            <p className="text-sm font-medium">
              Pages discovered after login{' '}
              <span className="text-muted-foreground">({result.pagesChecked})</span>
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Status</TableHead>
                  <TableHead>URL (behind auth)</TableHead>
                  <TableHead className="w-24 text-right">Console errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.checks.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant={c.ok ? 'secondary' : 'destructive'}>{c.status || '—'}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate font-mono text-xs">{c.url}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.consoleErrors}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
