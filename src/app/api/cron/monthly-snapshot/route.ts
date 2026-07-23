import { NextResponse } from "next/server";
import { closePreviousMonthForAllUsers } from "@/domain/snapshots/monthly-snapshot.service";

/**
 * Cron diario — persiste el cierre del mes anterior si aún no existe.
 * Schedule: 0 4 * * * (antes del corte de tarjetas).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await closePreviousMonthForAllUsers();
  return NextResponse.json({ ok: true, ...result });
}
