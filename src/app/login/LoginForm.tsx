"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-3">
      <input
        type="email"
        name="email"
        autoFocus
        required
        placeholder="Email"
        className="input"
        autoComplete="email"
      />
      <input
        type="password"
        name="password"
        required
        placeholder="Mot de passe"
        className="input"
        autoComplete="current-password"
      />
      {state.error && (
        <p className="text-sm text-[color:var(--color-danger)]">{state.error}</p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
