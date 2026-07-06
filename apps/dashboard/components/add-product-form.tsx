'use client';

import { useActionState } from 'react';
import { Plus } from 'lucide-react';
import { addProduct, type AddProductState } from '@/app/(app)/products/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AddProductForm() {
  const [state, formAction, pending] = useActionState<AddProductState, FormData>(addProduct, null);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="name">Product name</Label>
        <Input id="name" name="name" placeholder="EzBillify" required />
      </div>
      <div className="flex-1 space-y-2">
        <Label htmlFor="base_url">Product URL</Label>
        <Input id="base_url" name="base_url" type="url" placeholder="https://app.ezbillify.com" required />
      </div>
      <Button type="submit" disabled={pending}>
        <Plus className="size-4" />
        {pending ? 'Adding…' : 'Add product'}
      </Button>
      {state?.error ? (
        <p className="text-sm text-destructive sm:w-full sm:basis-full">{state.error}</p>
      ) : null}
    </form>
  );
}
