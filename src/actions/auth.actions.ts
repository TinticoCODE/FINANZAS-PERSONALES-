"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";

export async function loginFormAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Pedro999@";

  if (username !== adminUsername || password !== adminPassword) {
    return { error: "Usuario o contraseña incorrectos" };
  }

  await createSession({
    email: "admin@sharkmoney.app",
    name: "Admin",
  });
  redirect("/");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
