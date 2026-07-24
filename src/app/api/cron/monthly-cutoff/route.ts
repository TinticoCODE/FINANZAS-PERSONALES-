import { NextResponse } from "next/server";
import { runMonthlyCutoffForAllUsers } from "@/domain/billing/monthly-cutoff.service";
import { disconnectDb } from "@/lib/prisma";

/**
 * Obsoleto. Usar /api/cron/daily (tarea programada unificada para ahorrar horas de cómputo en Neon).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runMonthlyCutoffForAllUsers();
    return NextResponse.json({ ok: true, ...result });
  } finally {
    await disconnectDb();
  }
}
