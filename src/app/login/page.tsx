import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/");
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold">🥗 Nutrition</div>
          <p className="text-[color:var(--color-muted)] text-sm mt-1">
            Suivi calorique & macros
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
