import Link from "next/link";

/** Pied de page avec les liens légaux obligatoires (visible connecté ou non). */
export function Footer() {
  return (
    <footer className="mt-8 border-t border-[color:var(--color-border)] pt-4 text-center text-xs text-[color:var(--color-muted)]">
      <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link href="/legal/mentions" className="hover:text-[color:var(--color-fg)]">
          Mentions légales
        </Link>
        <span aria-hidden>·</span>
        <Link href="/legal/confidentialite" className="hover:text-[color:var(--color-fg)]">
          Confidentialité
        </Link>
        <span aria-hidden>·</span>
        <Link href="/legal/cgu" className="hover:text-[color:var(--color-fg)]">
          CGU
        </Link>
      </nav>
      <p className="mt-2">
        Outil de bien-être — ne remplace pas un avis médical.
      </p>
    </footer>
  );
}
