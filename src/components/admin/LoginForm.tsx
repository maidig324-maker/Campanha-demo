'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { signIn } from '@/app/actions/admin';
import { Label, Input, FieldGroup } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full" size="lg">
      {pending ? 'Entrando...' : 'Entrar'}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(signIn, undefined);

  return (
    <form action={formAction} className="w-full max-w-sm">
      <FieldGroup>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoFocus placeholder="voce@loja.com" />
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" required placeholder="••••••••" />
      </FieldGroup>
      {state?.error && <p className="mb-4 text-sm text-status-confirmed">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
