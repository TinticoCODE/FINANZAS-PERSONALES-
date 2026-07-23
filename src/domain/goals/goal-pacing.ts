import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
} from "date-fns";

export type GoalPacingStatus =
  | "completed"
  | "on_track"
  | "at_risk"
  | "behind"
  | "overdue"
  | "no_date";

export type GoalPacing = {
  missingAmount: number;
  percent: number;
  status: GoalPacingStatus;
  monthlySuggested: number | null;
  weeklySuggested: number | null;
  daysRemaining: number | null;
  progressIndicatorClass: string;
  pacingMessage: string | null;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeGoalPacing(
  targetAmount: number,
  savedAmount: number,
  targetDate: Date | string | null | undefined,
  referenceDate: Date = new Date()
): GoalPacing {
  const missingAmount = Math.max(targetAmount - savedAmount, 0);
  const percent = targetAmount > 0 ? (savedAmount / targetAmount) * 100 : 0;

  if (missingAmount <= 0) {
    return {
      missingAmount: 0,
      percent,
      status: "completed",
      monthlySuggested: null,
      weeklySuggested: null,
      daysRemaining: null,
      progressIndicatorClass: "bg-emerald-500",
      pacingMessage: "Meta alcanzada",
    };
  }

  if (!targetDate) {
    return {
      missingAmount,
      percent,
      status: "no_date",
      monthlySuggested: null,
      weeklySuggested: null,
      daysRemaining: null,
      progressIndicatorClass: "bg-primary",
      pacingMessage: null,
    };
  }

  const target =
    typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  const daysRemaining = differenceInCalendarDays(target, referenceDate);

  if (daysRemaining < 0) {
    return {
      missingAmount,
      percent,
      status: "overdue",
      monthlySuggested: null,
      weeklySuggested: null,
      daysRemaining,
      progressIndicatorClass: "bg-destructive",
      pacingMessage: "La fecha límite ya pasó — acelera tus aportes",
    };
  }

  const monthsRemaining = Math.max(
    differenceInCalendarMonths(target, referenceDate),
    1
  );
  const weeksRemaining = Math.max(
    differenceInCalendarWeeks(target, referenceDate),
    1
  );
  const monthlySuggested = roundMoney(missingAmount / monthsRemaining);
  const weeklySuggested = roundMoney(missingAmount / weeksRemaining);

  let status: GoalPacingStatus = "on_track";
  let progressIndicatorClass = "bg-sky-500";

  if (daysRemaining <= 30 && percent < 20) {
    status = "at_risk";
    progressIndicatorClass = "bg-destructive";
  } else if (percent < 50 && daysRemaining <= 60) {
    status = "behind";
    progressIndicatorClass = "bg-amber-500";
  }

  return {
    missingAmount,
    percent,
    status,
    monthlySuggested,
    weeklySuggested,
    daysRemaining,
    progressIndicatorClass,
    pacingMessage: null,
  };
}

export function formatPacingSuggestion(
  pacing: GoalPacing,
  formatCurrency: (value: number) => string
): string | null {
  if (pacing.status === "completed") return pacing.pacingMessage;
  if (pacing.status === "overdue") return pacing.pacingMessage;
  if (pacing.status === "no_date") return null;
  if (pacing.monthlySuggested == null || pacing.weeklySuggested == null) {
    return null;
  }

  return `Ahorro sugerido: ${formatCurrency(pacing.monthlySuggested)} por mes / ${formatCurrency(pacing.weeklySuggested)} por semana para cumplir a tiempo`;
}
