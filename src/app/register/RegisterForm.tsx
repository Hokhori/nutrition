"use client";

import { useActionState } from "react";
import { registerAction, type RegisterState } from "./actions";

const initial: RegisterState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial);

  if (state.pending) {
    return (
      <p className="text-center text-sm text-[color:var(--color-brand)]">
        Compte créé ✓ — il doit être validé par un administrateur avant que tu puisses te
        connecter.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="email" name="email" required placeholder="Email" className="input" autoComplete="email" autoFocus />
      <input type="password" name="password" required placeholder="Mot de passe (8+ caractères)" className="input" autoComplete="new-password" />
      <input type="password" name="confirm" required placeholder="Confirmer le mot de passe" className="input" autoComplete="new-password" />
      {state.error && <p className="text-sm text-[color:var(--color-danger)]">{state.error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Création…" : "Créer mon compte"}
      </button>
    </form>
  );
}
