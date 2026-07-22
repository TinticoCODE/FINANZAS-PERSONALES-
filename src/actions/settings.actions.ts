"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/user";

const ALLOWED_TIMEZONES = new Set([
  "America/Bogota",
  "America/Mexico_City",
  "America/Lima",
  "America/Santiago",
  "America/Buenos_Aires",
  "America/Caracas",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "UTC",
]);

export async function updateUserTimezone(timezone: string) {
  if (!ALLOWED_TIMEZONES.has(timezone)) {
    throw new Error("Zona horaria no soportada");
  }

  const userId = await getDefaultUserId();
  await prisma.user.update({
    where: { id: userId },
    data: { timezone },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/budgets");
  revalidatePath("/reports");
  revalidatePath("/calendar");
  revalidatePath("/transactions");
  revalidatePath("/recurring");
}
