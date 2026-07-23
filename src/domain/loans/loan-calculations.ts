import type { InterestType } from "@prisma/client";
import { differenceInCalendarDays, differenceInCalendarMonths } from "date-fns";

export type LoanPaymentAllocation = {
  principalPaid: number;
  interestPaid: number;
};

export type LoanTab = "active" | "overdue" | "closed";

export function calculateExpectedReturn(
  principal: number,
  interestRate: number,
  interestType: InterestType,
  loanDate: Date,
  dueDate: Date
): number {
  if (principal <= 0) return 0;
  if (interestRate <= 0) return roundMoney(principal);

  const rate = interestRate / 100;

  switch (interestType) {
    case "FLAT":
      return roundMoney(principal * (1 + rate));
    case "MONTHLY": {
      const months = Math.max(differenceInCalendarMonths(dueDate, loanDate), 1);
      return roundMoney(principal * (1 + rate * months));
    }
    case "ANNUAL": {
      const days = Math.max(differenceInCalendarDays(dueDate, loanDate), 1);
      const years = days / 365;
      return roundMoney(principal * (1 + rate * years));
    }
    default:
      return roundMoney(principal);
  }
}

export function allocatePayment(
  amount: number,
  principalAmount: number,
  expectedReturnAmount: number,
  paidPrincipal: number,
  paidInterest: number
): LoanPaymentAllocation {
  const totalInterest = Math.max(expectedReturnAmount - principalAmount, 0);
  const remainingInterest = Math.max(totalInterest - paidInterest, 0);
  const remainingPrincipal = Math.max(principalAmount - paidPrincipal, 0);

  const interestPaid = roundMoney(Math.min(amount, remainingInterest));
  const principalPaid = roundMoney(
    Math.min(amount - interestPaid, remainingPrincipal)
  );

  return { principalPaid, interestPaid };
}

export function computeTotalPaid(
  payments: Array<{ amount: number; principalPaid?: number; interestPaid?: number }>
): { totalPaid: number; principalPaid: number; interestPaid: number } {
  return payments.reduce(
    (acc, payment) => {
      const hasBreakdown =
        (payment.principalPaid ?? 0) > 0 || (payment.interestPaid ?? 0) > 0;
      const principalPaid = hasBreakdown
        ? (payment.principalPaid ?? 0)
        : payment.amount;
      const interestPaid = hasBreakdown ? (payment.interestPaid ?? 0) : 0;

      return {
        totalPaid: acc.totalPaid + payment.amount,
        principalPaid: acc.principalPaid + principalPaid,
        interestPaid: acc.interestPaid + interestPaid,
      };
    },
    { totalPaid: 0, principalPaid: 0, interestPaid: 0 }
  );
}

export function computeOutstandingBalance(
  expectedReturnAmount: number,
  totalPaid: number
): number {
  return roundMoney(Math.max(expectedReturnAmount - totalPaid, 0));
}

export function computeProgressPercent(
  expectedReturnAmount: number,
  totalPaid: number
): number {
  if (expectedReturnAmount <= 0) return 0;
  return Math.min((totalPaid / expectedReturnAmount) * 100, 100);
}

export function isLoanOverdue(
  status: string,
  dueDate: Date | string,
  todayIso: string
): boolean {
  if (status !== "ACTIVE") return false;
  const dueDay = toDateInputValue(dueDate);
  return dueDay < todayIso;
}

export function computeDaysUntilDue(
  dueDate: Date | string,
  todayIso: string
): number {
  const due = parseDateInput(toDateInputValue(dueDate));
  const today = parseDateInput(todayIso);
  return differenceInCalendarDays(due, today);
}

export function filterLoansByTab<T extends { status: string; dueDate: string }>(
  loans: T[],
  tab: LoanTab,
  todayIso: string
): T[] {
  switch (tab) {
    case "active":
      return loans.filter(
        (loan) => loan.status === "ACTIVE" && !isLoanOverdue(loan.status, loan.dueDate, todayIso)
      );
    case "overdue":
      return loans.filter((loan) => isLoanOverdue(loan.status, loan.dueDate, todayIso));
    case "closed":
      return loans.filter((loan) => loan.status === "PAID");
    default:
      return loans;
  }
}

export function computeLoansSummary(
  loans: Array<{
    status: string;
    principalAmount: number;
    expectedReturnAmount: number;
    outstandingBalance: number;
    collectedAmount: number;
  }>
) {
  return {
    totalOutstanding: loans.reduce((sum, loan) => sum + loan.outstandingBalance, 0),
    totalPrincipalLent: loans.reduce((sum, loan) => sum + loan.principalAmount, 0),
    totalExpectedReturn: loans.reduce(
      (sum, loan) => sum + loan.expectedReturnAmount,
      0
    ),
    totalCollected: loans.reduce((sum, loan) => sum + loan.collectedAmount, 0),
    activeLoans: loans.filter((loan) => loan.status === "ACTIVE").length,
    paidLoans: loans.filter((loan) => loan.status === "PAID").length,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toDateInputValue(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
