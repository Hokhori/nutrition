import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/");
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold">🥗 Nutrition</div>
          <p className="text-[color:var(--color-muted)] text-sm mt-1">Créer un compte</p>
        </div>
        <RegisterForm />
        <p className="mt-4 text-center text-sm text-[color:var(--color-muted)]">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-[color:var(--color-brand)]">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
