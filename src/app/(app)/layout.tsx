import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect("/login");
  return (
    <div className="min-h-dvh">
      <NavBar />
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">{children}</main>
    </div>
  );
}
