"use server";

import { revalidatePath } from "next/cache";
import {
  getMonthlyHistoryForUser,
  getYearlyMonthlySnapshots,
  persistMonthlySnapshot,
} from "@/domain/snapshots/monthly-snapshot.service";
import { getDefaultUserId, getUserTimezone } from "@/lib/user";

/**
 * Historial mensual/anual.
 * - Con `year`: devuelve los 12 cierres mensuales del año (mes actual dinámico, pasados inmutables).
 * - `month` opcional: refina el periodo seleccionado en la interfaz.
 */
export async function getMonthlyHistory(year: number, month?: number) {
  if (year < 2000 || year > 2100) {
    return { ok: false as const, error: "Año inválido" };
  }
  if (month !== undefined && (month < 1 || month > 12)) {
    return { ok: false as const, error: "Mes inválido" };
  }

  const data = await getMonthlyHistoryForUser(year, month);
  return { ok: true as const, data };
}

/** Fuerza el cierre de un mes (solo si no existe). Útil para carga retroactiva manual. */
export async function createMonthlySnapshotAction(year: number, month: number) {
  const userId = await getDefaultUserId();
  const timezone = await getUserTimezone();

  const snapshot = await persistMonthlySnapshot(userId, year, month, timezone);
  revalidatePath("/reports");
  return { ok: true as const, snapshot };
}

export async function getYearSnapshotsAction(year: number) {
  const userId = await getDefaultUserId();
  const timezone = await getUserTimezone();
  const snapshots = await getYearlyMonthlySnapshots(userId, year, timezone);
  return snapshots;
}
