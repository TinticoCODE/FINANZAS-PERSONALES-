import { NextResponse } from "next/server";
import { closePreviousMonthForAllUsers } from "@/domain/snapshots/monthly-snapshot.service";
import { disconnectDb } from "@/lib/prisma";

/**
 * @deprecated Usar /api/cron/daily (cron unificado para ahorrar CU-hours en Neon).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await closePreviousMonthForAllUsers();
    return NextResponse.json({ ok: true, ...result });
  } finally {
    await disconnectDb();
  }
}
