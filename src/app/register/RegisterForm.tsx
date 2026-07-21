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

      <div className="space-y-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-3 text-xs text-[color:var(--color-muted)]">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="acceptTerms" value="on" className="mt-0.5" required />
          <span>
            J’ai lu et j’accepte les{" "}
            <a href="/legal/cgu" target="_blank" className="text-[color:var(--color-brand)] underline">
              conditions d’utilisation
            </a>{" "}
            et la{" "}
            <a href="/legal/confidentialite" target="_blank" className="text-[color:var(--color-brand)] underline">
              politique de confidentialité
            </a>
            .
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="consentHealth" value="on" className="mt-0.5" required />
          <span>
            <strong className="text-[color:var(--color-fg)]">
              Je consens expressément au traitement de mes données de santé
            </strong>{" "}
            (poids, apports, objectifs) pour le suivi nutritionnel. Je peux retirer ce consentement
            à tout moment en supprimant mon compte.
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="confirmAge" value="on" className="mt-0.5" required />
          <span>Je certifie avoir au moins 13 ans.</span>
        </label>
      </div>

      {state.error && <p className="text-sm text-[color:var(--color-danger)]">{state.error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Création…" : "Créer mon compte"}
      </button>
    </form>
  );
}
