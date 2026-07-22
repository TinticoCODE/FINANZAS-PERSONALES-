import { NextResponse } from "next/server";
import { runMonthlyCutoffForAllUsers } from "@/domain/billing/monthly-cutoff.service";

/**
 * Vercel Cron — evalúa cortes de tarjeta y RecurringTransaction
 * usando la zona horaria de cada usuario (no UTC absoluto del servidor).
 *
 * Schedule recomendado: cada hora (`0 * * * *`) para cubrir medianoche local.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runMonthlyCutoffForAllUsers();
  return NextResponse.json({ ok: true, ...result });
}
