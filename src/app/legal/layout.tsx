import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const tabs = [
  { href: "/legal/mentions", label: "Mentions légales" },
  { href: "/legal/confidentialite", label: "Confidentialité" },
  { href: "/legal/cgu", label: "CGU" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
          >
            <ArrowLeft size={16} /> Retour
          </Link>
          <span className="font-bold">🥗 Nutrition</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">
        <nav className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-1 text-sm text-[color:var(--color-fg)] hover:opacity-80"
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {children}
      </main>
    </div>
  );
}
