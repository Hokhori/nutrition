import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import { Footer } from "@/components/Footer";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold">🥗 Nutrition</div>
          <p className="text-[color:var(--color-muted)] text-sm mt-1">
            Suivi calorique & macros
          </p>
        </div>
        <LoginForm />
        <p className="mt-4 text-center text-sm text-[color:var(--color-muted)]">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-[color:var(--color-brand)]">
            Créer un compte
          </Link>
        </p>
      </div>
      <div className="w-full max-w-sm">
        <Footer />
      </div>
    </main>
  );
}
