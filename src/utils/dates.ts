import { format, formatDistanceToNow, isSameDay, isSameMonth, isSameYear } from "date-fns";
import { es } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { DEFAULT_TIMEZONE } from "@/domain/billing/timezone";

export { DEFAULT_TIMEZONE };

/** UTC de BD → Date con componentes en la zona del usuario (solo para formatear). */
export function utcToUserLocal(instantUtc: Date | string, timezone = DEFAULT_TIMEZONE): Date {
  const date = typeof instantUtc === "string" ? new Date(instantUtc) : instantUtc;
  return toZonedTime(date, timezone);
}

export function formatUserDate(
  instantUtc: Date | string,
  pattern = "dd/MM/yyyy",
  timezone = DEFAULT_TIMEZONE
): string {
  return format(utcToUserLocal(instantUtc, timezone), pattern, { locale: es });
}

export function formatUserDateTime(
  instantUtc: Date | string,
  pattern = "dd/MM/yyyy HH:mm",
  timezone = DEFAULT_TIMEZONE
): string {
  return format(utcToUserLocal(instantUtc, timezone), pattern, { locale: es });
}

export function formatUserMonthYear(
  instantUtc: Date | string,
  timezone = DEFAULT_TIMEZONE
): string {
  return format(utcToUserLocal(instantUtc, timezone), "MMMM yyyy", { locale: es });
}

export function formatUserRelative(
  instantUtc: Date | string,
  timezone = DEFAULT_TIMEZONE
): string {
  const local = utcToUserLocal(instantUtc, timezone);
  return formatDistanceToNow(local, { addSuffix: true, locale: es });
}

/** Comparaciones de calendario en TZ del usuario (no recalculan cortes). */
export function isSameUserDay(
  aUtc: Date | string,
  bUtc: Date | string,
  timezone = DEFAULT_TIMEZONE
): boolean {
  return isSameDay(utcToUserLocal(aUtc, timezone), utcToUserLocal(bUtc, timezone));
}

export function isSameUserMonth(
  aUtc: Date | string,
  bUtc: Date | string,
  timezone = DEFAULT_TIMEZONE
): boolean {
  const a = utcToUserLocal(aUtc, timezone);
  const b = utcToUserLocal(bUtc, timezone);
  return isSameYear(a, b) && isSameMonth(a, b);
}

/** Fecha local de hoy como yyyy-MM-dd (para inputs type=date). */
export function todayIsoInTimezone(timezone = DEFAULT_TIMEZONE): string {
  const local = utcToUserLocal(new Date(), timezone);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getLocalMonthYear(timezone = DEFAULT_TIMEZONE) {
  const local = utcToUserLocal(new Date(), timezone);
  return { year: local.getFullYear(), month: local.getMonth() + 1 };
}
