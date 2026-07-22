export type InstallmentFrequency = "monthly" | "biweekly";

export type InstallmentPlanRow = {
  dueDate: string;
  amount: string;
};

function defaultFirstDueDate(frequency: InstallmentFrequency): string {
  const date = new Date();
  if (frequency === "monthly") {
    date.setMonth(date.getMonth() + 1);
  } else {
    date.setDate(date.getDate() + 15);
  }
  return date.toISOString().slice(0, 10);
}

export function generateInstallmentPlan(params: {
  credit: number;
  count: number;
  frequency: InstallmentFrequency;
  firstDueDate?: string;
}): InstallmentPlanRow[] {
  const { credit, count, frequency } = params;
  if (credit <= 0 || count <= 0) return [];

  const base = Math.floor(credit / count);
  const remainder = credit - base * count;
  const start = new Date(`${params.firstDueDate ?? defaultFirstDueDate(frequency)}T12:00:00`);

  return Array.from({ length: count }, (_, i) => {
    const due = new Date(start);
    if (frequency === "monthly") {
      due.setMonth(start.getMonth() + i);
    } else {
      due.setDate(start.getDate() + i * 15);
    }
    return {
      dueDate: due.toISOString().slice(0, 10),
      amount: String(base + (i === count - 1 ? remainder : 0)),
    };
  });
}

export function planRowsTotal(rows: InstallmentPlanRow[]): number {
  return rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}

export function isPlanBalanced(credit: number, rows: InstallmentPlanRow[]): boolean {
  if (credit <= 0) return true;
  return Math.abs(planRowsTotal(rows) - credit) <= 0.01;
}
