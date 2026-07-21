"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";

export async function loginFormAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@sharkmoney.app";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  if (email !== adminEmail || password !== adminPassword) {
    return { error: "Correo o contraseña incorrectos" };
  }

  await createSession({ email, name: "Admin" });
  redirect("/");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
