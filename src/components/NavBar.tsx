"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Apple, Target, TrendingUp } from "lucide-react";
import { logoutAction } from "@/app/login/actions";

const links = [
  { href: "/", label: "Jour", icon: Home },
  { href: "/foods", label: "Aliments", icon: Apple },
  { href: "/goal", label: "Objectif", icon: Target },
  { href: "/progress", label: "Progrès", icon: TrendingUp },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <>
      {/* Barre du haut (desktop + logo) */}
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-bold">
            🥗 Nutrition
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
                    active
                      ? "bg-[color:var(--color-surface-2)] text-[color:var(--color-fg)]"
                      : "text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>
          <form action={logoutAction}>
            <button className="text-sm text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]">
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      {/* Barre du bas (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] sm:hidden">
        <div className="mx-auto flex max-w-2xl">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
                  active ? "text-[color:var(--color-brand)]" : "text-[color:var(--color-muted)]"
                }`}
              >
                <Icon size={20} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
