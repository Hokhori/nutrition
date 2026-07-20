import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-dvh">
      <NavBar isAdmin={user.role === "admin"} />
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">{children}</main>
    </div>
  );
}
