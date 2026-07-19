"use server";

import { redirect } from "next/navigation";
import { getSession, verifyWebPassword } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") || "");
  if (!verifyWebPassword(password)) {
    return { error: "Mot de passe incorrect." };
  }
  const session = await getSession();
  session.authenticated = true;
  await session.save();
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
