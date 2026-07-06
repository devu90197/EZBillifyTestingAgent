'use client';

import { useActionState, useEffect } from 'react';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { saveCredentials, type CredState } from '@/app/(app)/products/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LABELS: Record<string, { type: string; label: string; placeholder: string }> = {
  'email-password': { type: 'email', label: 'Email', placeholder: 'qa@example.com' },
  'username-password': { type: 'username', label: 'Username', placeholder: 'qa_user' },
  'phone-password': { type: 'phone', label: 'Phone', placeholder: '+91…' },
};

export function CredentialForm({
  productId,
  scheme,
  existingIdentifier,
}: {
  productId: string;
  scheme: string;
  existingIdentifier?: string;
}) {
  const [state, formAction, pending] = useActionState<CredState, FormData>(saveCredentials, null);
  const cfg = LABELS[scheme] ?? LABELS['email-password'];

  useEffect(() => {
    if (state?.ok) toast.success('Test credentials saved (encrypted).');
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="identifier_type" value={cfg.type} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="identifier">{cfg.label}</Label>
          <Input
            id="identifier"
            name="identifier"
            placeholder={cfg.placeholder}
            defaultValue={existingIdentifier ?? ''}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="secret">Password</Label>
          <Input id="secret" name="secret" type="password" placeholder="••••••••" required />
        </div>
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        <KeyRound className="size-4" />
        {pending ? 'Saving…' : existingIdentifier ? 'Update credentials' : 'Save credentials'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Stored encrypted (AES-256-GCM) and used only to drive automated tests.
      </p>
    </form>
  );
}
