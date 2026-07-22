import { NextResponse } from "next/server";
import { syncOverdueInstallments } from "@/domain/business/installment.service";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncOverdueInstallments();
  return NextResponse.json({ ok: true, ...result });
}
