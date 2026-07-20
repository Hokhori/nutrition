"use server";

import { redirect } from "next/navigation";
import { getSession, verifyPasswordHash, type Role } from "@/lib/auth";
import { getUserByEmail } from "@/lib/services";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Email et mot de passe requis." };

  const user = await getUserByEmail(email);
  if (!user || !verifyPasswordHash(user.passwordHash, password)) {
    return { error: "Email ou mot de passe incorrect." };
  }
  if (user.status !== "active") {
    return { error: "Compte en attente de validation par un administrateur." };
  }

  const session = await getSession();
  session.userId = user.id;
  session.role = user.role as Role;
  await session.save();
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
