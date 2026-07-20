"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserByEmail, createUser, getAppConfig, listUsers } from "@/lib/services";

export type RegisterState = { error?: string; pending?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!EMAIL_RE.test(email)) return { error: "Email invalide." };
  if (password.length < 8) return { error: "Mot de passe : 8 caractères minimum." };
  if (password !== confirm) return { error: "Les mots de passe ne correspondent pas." };
  if (await getUserByEmail(email)) return { error: "Un compte existe déjà avec cet email." };

  // Le tout premier compte devient admin (bootstrap).
  const isFirst = (await listUsers()).length === 0;
  const { requireApproval } = await getAppConfig();
  const status: "active" | "pending" = isFirst ? "active" : requireApproval ? "pending" : "active";

  const user = await createUser({
    email,
    password,
    role: isFirst ? "admin" : "user",
    status,
  });

  if (status === "pending") return { pending: true };

  const session = await getSession();
  session.userId = user.id;
  session.role = user.role as "admin" | "user";
  await session.save();
  redirect("/");
}
