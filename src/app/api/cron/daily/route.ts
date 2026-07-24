import { NextResponse } from "next/server";
import { runMonthlyCutoffForAllUsers } from "@/domain/billing/monthly-cutoff.service";
import { syncOverdueInstallments } from "@/domain/business/installment.service";
import { closePreviousMonthForAllUsers } from "@/domain/snapshots/monthly-snapshot.service";
import { disconnectDb } from "@/lib/prisma";

/**
 * Tarea programada diaria unificada — una sola activación de Neon por día.
 * Ejecuta: cierre mensual, cortes/recurrentes y mora de cuotas de negocio.
 * Programación: 0 5 * * * (05:00 UTC ≈ medianoche Colombia).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await closePreviousMonthForAllUsers();
    const cutoff = await runMonthlyCutoffForAllUsers();
    const overdue = await syncOverdueInstallments();

    return NextResponse.json({
      ok: true,
      snapshot,
      cutoff,
      overdue,
    });
  } finally {
    await disconnectDb();
  }
}
