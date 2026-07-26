"use server";

import { revalidatePath } from "next/cache";
import {
  Prisma,
  type AccountType,
  type PaymentMethod,
  type RecurrenceFrequency,
  type ReminderType,
  type TransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import { getDefaultUserId, getUserTimezone } from "@/lib/user";
import {
  parseCreateTransactionInput,
  type TransactionActionResult,
} from "@/domain/transactions/transaction.schema";
import {
  parseCreditCardStatementImport,
  type CreditCardStatementImportResult,
} from "@/domain/credit/credit-card-statement.schema";
import { importCreditCardStatementData } from "@/domain/credit/credit-card-statement-import.service";
import { processCreditCardStatementPdf } from "@/domain/credit/credit-card-statement-pdf.service";
import {
  parseCreditCardPaymentInput,
  type CreditCardPaymentResult,
} from "@/domain/credit/credit-card-payment.schema";
import { processCreditCardPayment } from "@/domain/credit/credit-card-payment.service";
import {
  computeInstallmentAmount,
} from "@/domain/credit/msi.constants";
import {
  computeNextRunAt,
  localMidnightToUtc,
} from "@/domain/billing/timezone";
import {
  allocatePayment,
  calculateExpectedReturn,
  computeOutstandingBalance,
  computeTotalPaid,
} from "@/domain/loans/loan-calculations";
import type { InterestType } from "@prisma/client";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/recurring");
  revalidatePath("/accounts");
  revalidatePath("/cards");
  revalidatePath("/budgets");
  revalidatePath("/goals");
  revalidatePath("/loans");
  revalidatePath("/calendar");
  revalidatePath("/reports");
  revalidatePath("/settings");
}

type DbTx = Prisma.TransactionClient;

function mapTransactionError(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2003") {
      return "Cuenta, categoría o tarjeta no encontrada";
    }
    if (err.code === "P2025") {
      return "Registro no encontrado";
    }
  }
  if (err instanceof Error) return err.message;
  return "No se pudo completar la operación";
}

async function applyTransactionEffects(
  tx: DbTx,
  params: {
  accountId?: string | null;
  creditCardId?: string | null;
  type: TransactionType;
  amount: number;
  paymentMethod: PaymentMethod;
  reverse?: boolean;
  tags?: string[];
}) {
  const multiplier = params.reverse ? -1 : 1;
  const amount = params.amount * multiplier;
  const isCardPaymentSource = params.tags?.includes("card-payment-source");

  if (params.type === "PAYMENT_TO_CARD") {
    if (!params.accountId || !params.creditCardId) {
      throw new Error("Pago a tarjeta requiere cuenta origen y tarjeta destino");
    }
    await tx.creditCard.update({
      where: { id: params.creditCardId },
      data: { usedBalance: { increment: -amount } },
    });
    return;
  }

  if (params.type === "INCOME") {
    if (!params.accountId) {
      throw new Error("Los ingresos deben estar asociados a una cuenta bancaria");
    }
    await tx.account.update({
      where: { id: params.accountId },
      data: { balance: { increment: amount } },
    });
    return;
  }

  if (params.paymentMethod === "CREDIT" && params.creditCardId) {
    await tx.creditCard.update({
      where: { id: params.creditCardId },
      data: { usedBalance: { increment: amount } },
    });
    return;
  }

  if (params.paymentMethod === "CASH") {
    return;
  }

  if (isCardPaymentSource) {
    if (!params.accountId) {
      throw new Error("La pata origen del pago requiere cuenta bancaria");
    }
    await tx.account.update({
      where: { id: params.accountId },
      data: { balance: { increment: -amount } },
    });
    return;
  }

  if (!params.accountId) {
    throw new Error("Los gastos con débito o transferencia requieren una cuenta bancaria");
  }

  await tx.account.update({
    where: { id: params.accountId },
    data: { balance: { decrement: amount } },
  });
}

function validateTransactionFunding(data: {
  type: TransactionType;
  paymentMethod: PaymentMethod;
  accountId?: string;
  creditCardId?: string;
}): string | null {
  const hasAccount = Boolean(data.accountId);
  const hasCard = Boolean(data.creditCardId);

  if (data.type === "INCOME") {
    if (!hasAccount) return "Selecciona la cuenta donde ingresa el dinero";
    if (hasCard) return "Los ingresos no pueden asociarse a una tarjeta de crédito";
    return null;
  }

  if (data.paymentMethod === "CREDIT") {
    if (!hasCard) return "Selecciona la tarjeta de crédito usada en la compra";
    if (hasAccount) {
      return "Un gasto a crédito no puede restar saldo de una cuenta bancaria";
    }
    return null;
  }

  if (data.paymentMethod === "CASH") {
    if (hasCard) return "Un gasto en efectivo no puede asociarse a una tarjeta";
    return null;
  }

  if (!hasAccount) return "Selecciona la cuenta bancaria del gasto";
  if (hasCard) {
    return "Un gasto con débito o transferencia no puede asociarse a una tarjeta";
  }

  return null;
}

export async function createAccount(data: {
  name: string;
  type: AccountType;
  balance?: number;
  color?: string;
  icon?: string;
}) {
  const userId = await getDefaultUserId();
  await prisma.account.create({
    data: {
      userId,
      name: data.name,
      type: data.type,
      balance: data.balance ?? 0,
      color: data.color ?? "#6366f1",
      icon: data.icon,
    },
  });
  revalidateAll();
}

export async function deleteAccount(id: string) {
  const userId = await getDefaultUserId();
  const count = await prisma.transaction.count({ where: { accountId: id, userId } });
  if (count > 0) throw new Error("No puedes eliminar una cuenta con transacciones");
  await prisma.account.delete({ where: { id, userId } });
  revalidateAll();
}

export async function createCreditCard(data: {
  bank: string;
  name: string;
  lastFourDigits: string;
  creditLimit: number;
  interestRate?: number;
  cutOffDate: number;
  paymentDueDate: number;
  color?: string;
}) {
  const userId = await getDefaultUserId();
  await prisma.creditCard.create({
    data: {
      userId,
      bank: data.bank,
      name: data.name,
      lastFourDigits: data.lastFourDigits,
      creditLimit: data.creditLimit,
      usedBalance: 0,
      interestRate: data.interestRate ?? 0,
      cutOffDate: data.cutOffDate,
      paymentDueDate: data.paymentDueDate,
      color: data.color ?? "#8b5cf6",
    },
  });
  revalidateAll();
}

export async function deleteCreditCard(id: string) {
  const userId = await getDefaultUserId();
  await prisma.creditCard.delete({ where: { id, userId } });
  revalidateAll();
}

function resolveCreditInstallmentFields(
  amount: number,
  installments: number,
  hasZeroInterest?: boolean
) {
  const totalInstallments = Math.max(1, installments);

  if (totalInstallments < 1 || totalInstallments > 48) {
    throw new Error("El número de cuotas debe estar entre 1 y 48");
  }

  const isInstallments = totalInstallments > 1;
  const zeroInterest = Boolean(hasZeroInterest) && isInstallments;

  if (zeroInterest && totalInstallments < 2) {
    throw new Error("Las compras MSI requieren al menos 2 cuotas");
  }

  return {
    installments: totalInstallments,
    isInstallments,
    hasZeroInterest: zeroInterest,
    installmentAmount: isInstallments
      ? computeInstallmentAmount(amount, totalInstallments)
      : null,
  };
}

export async function createTransaction(
  input: unknown
): Promise<TransactionActionResult> {
  const validation = parseCreateTransactionInput(input);
  if (!validation.success) {
    return {
      ok: false,
      error: validation.error,
      fieldErrors: validation.fieldErrors,
    };
  }

  const data = validation.data;

  const fundingError = validateTransactionFunding({
    type: data.type,
    paymentMethod: data.paymentMethod,
    accountId: data.accountId,
    creditCardId: data.creditCardId,
  });
  if (fundingError) {
    return { ok: false, error: fundingError };
  }

  let installmentFields: {
    installments: number;
    isInstallments: boolean;
    hasZeroInterest: boolean;
    installmentAmount: number | null;
  };

  try {
    installmentFields =
      data.paymentMethod === "CREDIT" && data.creditCardId
        ? resolveCreditInstallmentFields(
            data.amount,
            data.installments ?? 1,
            data.hasZeroInterest
          )
        : {
            installments: 1,
            isInstallments: false,
            hasZeroInterest: false,
            installmentAmount: null,
          };
  } catch (err) {
    return { ok: false, error: mapTransactionError(err) };
  }

  try {
    const userId = await getDefaultUserId();
    const timezone = await getUserTimezone();

    await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          userId,
          accountId: data.accountId || null,
          categoryId: data.categoryId,
          creditCardId: data.creditCardId || null,
          type: data.type,
          amount: data.amount,
          description: data.description,
          paymentMethod: data.paymentMethod,
          installments: installmentFields.installments,
          currentInstallment: 1,
          isInstallments: installmentFields.isInstallments,
          hasZeroInterest: installmentFields.hasZeroInterest,
          installmentAmount: installmentFields.installmentAmount,
          tags: data.tags ?? [],
          date: data.date
            ? parseLocalDateToUtc(data.date, timezone)
            : new Date(),
        },
      });

      await applyTransactionEffects(tx, {
        accountId: data.accountId,
        creditCardId: data.creditCardId,
        type: data.type,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
      });
    });
  } catch (err) {
    console.error("createTransaction failed:", err);
    return { ok: false, error: mapTransactionError(err) };
  }

  revalidateAll();
  return { ok: true };
}

export async function createCreditCardTransaction(data: {
  creditCardId: string;
  categoryId: string;
  amount: number;
  description?: string;
  date: string;
  installments: number;
  hasZeroInterest?: boolean;
}): Promise<TransactionActionResult> {
  const installments = Math.max(1, data.installments);

  try {
    const card = await prisma.creditCard.findFirst({
      where: {
        id: data.creditCardId,
        userId: await getDefaultUserId(),
        isActive: true,
      },
    });

    if (!card) {
      return { ok: false, error: "Tarjeta de crédito no encontrada" };
    }

    return createTransaction({
      categoryId: data.categoryId,
      creditCardId: data.creditCardId,
      type: "EXPENSE",
      amount: data.amount,
      description: data.description,
      paymentMethod: "CREDIT",
      date: data.date,
      installments,
      hasZeroInterest: data.hasZeroInterest,
    });
  } catch (err) {
    console.error("createCreditCardTransaction failed:", err);
    return { ok: false, error: mapTransactionError(err) };
  }
}

export async function deleteTransaction(
  id: string
): Promise<TransactionActionResult> {
  try {
    const userId = await getDefaultUserId();
    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) {
      return { ok: false, error: "Transacción no encontrada" };
    }

    await prisma.$transaction(async (tx) => {
      const groupId = existing.transferGroupId;
      const related = groupId
        ? await tx.transaction.findMany({
            where: { userId, transferGroupId: groupId },
          })
        : [existing];

      for (const row of related) {
        await applyTransactionEffects(tx, {
          accountId: row.accountId,
          creditCardId: row.creditCardId,
          type: row.type,
          amount: toNumber(row.amount),
          paymentMethod: row.paymentMethod,
          tags: row.tags,
          reverse: true,
        });
      }

      if (groupId) {
        await tx.transaction.deleteMany({
          where: { userId, transferGroupId: groupId },
        });
      } else {
        await tx.transaction.delete({ where: { id } });
      }
    });

    revalidateAll();
    return { ok: true };
  } catch (err) {
    console.error("deleteTransaction failed:", err);
    return { ok: false, error: mapTransactionError(err) };
  }
}

export async function createBudget(data: {
  categoryId: string;
  amount: number;
  month: number;
  year: number;
}) {
  const userId = await getDefaultUserId();
  await prisma.budget.upsert({
    where: {
      userId_categoryId_month_year: {
        userId,
        categoryId: data.categoryId,
        month: data.month,
        year: data.year,
      },
    },
    update: { amount: data.amount },
    create: {
      userId,
      categoryId: data.categoryId,
      amount: data.amount,
      month: data.month,
      year: data.year,
    },
  });
  revalidateAll();
}

export async function deleteBudget(id: string) {
  const userId = await getDefaultUserId();
  await prisma.budget.delete({ where: { id, userId } });
  revalidateAll();
}

export async function createSavingsGoal(data: {
  name: string;
  targetAmount: number;
  savedAmount?: number;
  targetDate?: string;
  color?: string;
}) {
  const userId = await getDefaultUserId();
  await prisma.savingsGoal.create({
    data: {
      userId,
      name: data.name,
      targetAmount: data.targetAmount,
      savedAmount: data.savedAmount ?? 0,
      targetDate: data.targetDate
        ? parseLocalDateToUtc(data.targetDate, await getUserTimezone())
        : null,
      color: data.color ?? "#10b981",
    },
  });
  revalidateAll();
}

export async function updateSavingsGoal(
  id: string,
  data: { savedAmount?: number; targetAmount?: number; name?: string }
) {
  const userId = await getDefaultUserId();
  await prisma.savingsGoal.update({
    where: { id, userId },
    data,
  });
  revalidateAll();
}

export async function contributeToSavingsGoal(data: {
  goalId: string;
  amount: number;
  sourceAccountId: string;
}) {
  const userId = await getDefaultUserId();
  const amount = data.amount;

  if (amount <= 0) {
    return { ok: false as const, error: "El aporte debe ser mayor a cero" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.findFirst({
        where: { id: data.goalId, userId },
      });
      if (!goal) throw new Error("GOAL_NOT_FOUND");

      const account = await tx.account.findFirst({
        where: { id: data.sourceAccountId, userId, isActive: true },
      });
      if (!account) throw new Error("ACCOUNT_NOT_FOUND");

      const balance = toNumber(account.balance);
      if (balance < amount) throw new Error("INSUFFICIENT_BALANCE");

      const targetAmount = toNumber(goal.targetAmount);
      const currentSaved = toNumber(goal.savedAmount);
      const newSaved = Math.min(currentSaved + amount, targetAmount);

      await tx.account.update({
        where: { id: data.sourceAccountId },
        data: { balance: { decrement: amount } },
      });

      await tx.savingsGoal.update({
        where: { id: data.goalId },
        data: { savedAmount: newSaved },
      });
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "GOAL_NOT_FOUND") {
        return { ok: false as const, error: "Meta de ahorro no encontrada" };
      }
      if (err.message === "ACCOUNT_NOT_FOUND") {
        return { ok: false as const, error: "Cuenta bancaria no encontrada" };
      }
      if (err.message === "INSUFFICIENT_BALANCE") {
        return { ok: false as const, error: "Saldo insuficiente en la cuenta seleccionada" };
      }
    }
    console.error("contributeToSavingsGoal failed:", err);
    return { ok: false as const, error: "No se pudo registrar el aporte" };
  }

  revalidateAll();
  return { ok: true as const };
}

export async function deleteSavingsGoal(id: string) {
  const userId = await getDefaultUserId();
  await prisma.savingsGoal.delete({ where: { id, userId } });
  revalidateAll();
}

export async function createReminder(data: {
  title: string;
  description?: string;
  type: ReminderType;
  dueDate: string;
}) {
  const userId = await getDefaultUserId();
  await prisma.reminder.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      type: data.type,
      dueDate: parseLocalDateToUtc(data.dueDate, await getUserTimezone()),
    },
  });
  revalidateAll();
}

export async function markReminderRead(id: string) {
  const userId = await getDefaultUserId();
  await prisma.reminder.update({
    where: { id, userId },
    data: { isRead: true },
  });
  revalidateAll();
}

function parseLocalDateToUtc(dateStr: string, timezone: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return localMidnightToUtc({ year: y, month: m - 1, day: d }, timezone);
}

function revalidateLoans() {
  revalidatePath("/loans");
  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function createLoan(data: {
  debtorName: string;
  principalAmount: number;
  sourceAccountId: string;
  loanDate: string;
  dueDate: string;
  interestRate?: number;
  interestType?: InterestType;
  notes?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getDefaultUserId();
  const timezone = await getUserTimezone();
  const amount = data.principalAmount;
  const interestRate = data.interestRate ?? 0;
  const interestType = data.interestType ?? "FLAT";

  if (amount <= 0) {
    return { ok: false, error: "El monto del préstamo debe ser mayor a cero" };
  }

  if (!data.debtorName.trim()) {
    return { ok: false, error: "Ingresa el nombre del deudor" };
  }

  if (!data.dueDate) {
    return { ok: false, error: "Ingresa la fecha de vencimiento" };
  }

  const loanDate = parseLocalDateToUtc(data.loanDate, timezone);
  const dueDate = parseLocalDateToUtc(data.dueDate, timezone);

  if (dueDate <= loanDate) {
    return { ok: false, error: "La fecha de vencimiento debe ser posterior al préstamo" };
  }

  const expectedReturnAmount = calculateExpectedReturn(
    amount,
    interestRate,
    interestType,
    loanDate,
    dueDate
  );

  try {
    await prisma.$transaction(async (tx) => {
      const account = await tx.account.findFirst({
        where: { id: data.sourceAccountId, userId, isActive: true },
      });
      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      await tx.account.update({
        where: { id: data.sourceAccountId },
        data: { balance: { decrement: amount } },
      });

      await tx.loan.create({
        data: {
          userId,
          debtorName: data.debtorName.trim(),
          principalAmount: amount,
          outstandingBalance: expectedReturnAmount,
          interestRate,
          interestType,
          expectedReturnAmount,
          loanDate,
          dueDate,
          sourceAccountId: data.sourceAccountId,
          notes: data.notes,
          status: "ACTIVE",
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ACCOUNT_NOT_FOUND") {
      return { ok: false, error: "Cuenta bancaria no encontrada" };
    }
    console.error("createLoan failed:", err);
    return { ok: false, error: "No se pudo registrar el préstamo" };
  }

  revalidateLoans();
  return { ok: true };
}

/** Obsoleto. Usar createLoan */
export const createAccountReceivable = createLoan;

export async function registerLoanPayment(data: {
  loanId: string;
  amount: number;
  destinationAccountId: string;
  paymentDate: string;
  notes?: string;
}) {
  const userId = await getDefaultUserId();
  const timezone = await getUserTimezone();
  const amount = data.amount;

  if (amount <= 0) throw new Error("El abono debe ser mayor a cero");

  await prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findFirst({
      where: { id: data.loanId, userId },
      include: { payments: true },
    });
    if (!loan) throw new Error("Préstamo no encontrado");
    if (loan.status !== "ACTIVE") {
      throw new Error("Solo se pueden registrar abonos en préstamos activos");
    }

    const principalAmount = toNumber(loan.principalAmount);
    const storedExpectedReturn = toNumber(loan.expectedReturnAmount);
    const expectedReturnAmount =
      storedExpectedReturn > 0
        ? storedExpectedReturn
        : calculateExpectedReturn(
            principalAmount,
            toNumber(loan.interestRate),
            loan.interestType,
            loan.loanDate,
            loan.dueDate
          );

    const { totalPaid, principalPaid, interestPaid } = computeTotalPaid(
      loan.payments.map((payment) => ({
        amount: toNumber(payment.amount),
        principalPaid: toNumber(payment.principalPaid),
        interestPaid: toNumber(payment.interestPaid),
      }))
    );

    const outstanding = computeOutstandingBalance(expectedReturnAmount, totalPaid);
    if (amount > outstanding) {
      throw new Error("El abono supera el saldo pendiente (capital + intereses)");
    }

    const destination = await tx.account.findFirst({
      where: { id: data.destinationAccountId, userId, isActive: true },
    });
    if (!destination) throw new Error("Cuenta receptora no encontrada");

    const allocation = allocatePayment(
      amount,
      principalAmount,
      expectedReturnAmount,
      principalPaid,
      interestPaid
    );

    const newOutstanding = computeOutstandingBalance(
      expectedReturnAmount,
      totalPaid + amount
    );

    await tx.loan.update({
      where: { id: data.loanId },
      data: {
        outstandingBalance: newOutstanding,
        status: newOutstanding <= 0 ? "PAID" : "ACTIVE",
      },
    });

    await tx.account.update({
      where: { id: data.destinationAccountId },
      data: { balance: { increment: amount } },
    });

    await tx.loanPayment.create({
      data: {
        loanId: data.loanId,
        amount,
        principalPaid: allocation.principalPaid,
        interestPaid: allocation.interestPaid,
        paymentDate: parseLocalDateToUtc(data.paymentDate, timezone),
        destinationAccountId: data.destinationAccountId,
        notes: data.notes,
      },
    });
  });

  revalidateLoans();
}

/** Obsoleto. Usar registerLoanPayment */
export async function registerReceivablePayment(data: {
  receivableId: string;
  amount: number;
  destinationAccountId: string;
  paymentDate: string;
  notes?: string;
}) {
  return registerLoanPayment({
    loanId: data.receivableId,
    amount: data.amount,
    destinationAccountId: data.destinationAccountId,
    paymentDate: data.paymentDate,
    notes: data.notes,
  });
}

export async function deleteLoan(id: string) {
  const userId = await getDefaultUserId();

  await prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findFirst({
      where: { id, userId },
      include: { _count: { select: { payments: true } } },
    });
    if (!loan) return;

    const isClosed = loan.status === "PAID";

    if (isClosed) {
      await tx.loan.delete({ where: { id } });
      return;
    }

    if (loan._count.payments > 0) {
      throw new Error("No puedes eliminar un préstamo activo que ya tiene abonos registrados");
    }

    await tx.account.update({
      where: { id: loan.sourceAccountId },
      data: { balance: { increment: toNumber(loan.principalAmount) } },
    });

    await tx.loan.delete({ where: { id } });
  });

  revalidateLoans();
}

/** Obsoleto. Usar deleteLoan */
export const deleteAccountReceivable = deleteLoan;

export async function createRecurringTransaction(data: {
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId?: string;
  creditCardId?: string;
  paymentMethod: PaymentMethod;
  description?: string;
  frequency: RecurrenceFrequency;
  dayOfMonth?: number;
  dayOfWeek?: number;
  monthOfYear?: number;
  installments?: number;
  startDate: string;
}) {
  const userId = await getDefaultUserId();
  const timezone = await getUserTimezone();

  const fundingError = validateTransactionFunding({
    type: data.type,
    paymentMethod: data.paymentMethod,
    accountId: data.accountId,
    creditCardId: data.creditCardId,
  });
  if (fundingError) throw new Error(fundingError);

  const nextRunAt = parseLocalDateToUtc(data.startDate, timezone);

  await prisma.recurringTransaction.create({
    data: {
      userId,
      accountId: data.accountId || null,
      creditCardId: data.creditCardId || null,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      frequency: data.frequency,
      dayOfMonth: data.dayOfMonth ?? null,
      dayOfWeek: data.dayOfWeek ?? null,
      monthOfYear: data.monthOfYear ?? null,
      paymentMethod: data.paymentMethod,
      installments: Math.max(1, data.installments ?? 1),
      nextRunAt,
    },
  });

  revalidateAll();
}

export async function updateRecurringTransaction(
  id: string,
  data: {
    amount?: number;
    description?: string;
    frequency?: RecurrenceFrequency;
    dayOfMonth?: number | null;
    dayOfWeek?: number | null;
    monthOfYear?: number | null;
    isActive?: boolean;
    nextRunAt?: string;
  }
) {
  const userId = await getDefaultUserId();
  const timezone = await getUserTimezone();

  const existing = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new Error("Transacción recurrente no encontrada");

  let nextRunAt = existing.nextRunAt;
  if (data.nextRunAt) {
    nextRunAt = parseLocalDateToUtc(data.nextRunAt, timezone);
  } else if (
    data.frequency ||
    data.dayOfMonth !== undefined ||
    data.dayOfWeek !== undefined ||
    data.monthOfYear !== undefined
  ) {
    nextRunAt = computeNextRunAt({
      frequency: data.frequency ?? existing.frequency,
      timezone,
      dayOfMonth: data.dayOfMonth ?? existing.dayOfMonth,
      dayOfWeek: data.dayOfWeek ?? existing.dayOfWeek,
      monthOfYear: data.monthOfYear ?? existing.monthOfYear,
      afterUtc: existing.lastRunAt ?? new Date(),
    });
  }

  await prisma.recurringTransaction.update({
    where: { id, userId },
    data: {
      amount: data.amount,
      description: data.description,
      frequency: data.frequency,
      dayOfMonth: data.dayOfMonth,
      dayOfWeek: data.dayOfWeek,
      monthOfYear: data.monthOfYear,
      isActive: data.isActive,
      nextRunAt,
    },
  });

  revalidateAll();
}

export async function deleteRecurringTransaction(id: string) {
  const userId = await getDefaultUserId();
  await prisma.recurringTransaction.delete({ where: { id, userId } });
  revalidateAll();
}

export async function toggleRecurringTransaction(id: string, isActive: boolean) {
  const userId = await getDefaultUserId();
  await prisma.recurringTransaction.update({
    where: { id, userId },
    data: { isActive },
  });
  revalidateAll();
}

/**
 * Importación masiva de extracto de tarjeta de crédito.
 * Todo el periodo se persiste en una sola transacción Prisma (atomicidad).
 */
export async function importCreditCardStatement(
  input: unknown
): Promise<CreditCardStatementImportResult> {
  const validation = parseCreditCardStatementImport(input);
  if (!validation.success) {
    return {
      ok: false,
      error: validation.error,
      fieldErrors: validation.fieldErrors,
    };
  }

  try {
    const userId = await getDefaultUserId();
    const timezone = await getUserTimezone();
    const result = await importCreditCardStatementData(
      userId,
      timezone,
      validation.data
    );

    revalidateAll();
    return { ok: true, ...result };
  } catch (err) {
    console.error("importCreditCardStatement failed:", err);
    return { ok: false, error: mapTransactionError(err) };
  }
}

/**
 * Importa un extracto RappiCard desde archivo PDF.
 */
export async function importCreditCardStatementPdf(
  formData: FormData
): Promise<CreditCardStatementImportResult> {
  const creditCardId = formData.get("creditCardId");
  const file = formData.get("pdf");
  const password = formData.get("password");

  if (typeof creditCardId !== "string" || !creditCardId) {
    return { ok: false, error: "Selecciona la tarjeta de crédito" };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecciona un archivo PDF del extracto" };
  }

  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    return { ok: false, error: "El archivo debe ser un PDF" };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await processCreditCardStatementPdf({
      creditCardId,
      buffer,
      password: typeof password === "string" && password ? password : undefined,
    });

    if (result.ok) {
      revalidateAll();
    }

    return result;
  } catch (err) {
    console.error("importCreditCardStatementPdf failed:", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : mapTransactionError(err),
    };
  }
}

/**
 * Pago de tarjeta con partida doble: debita cuenta origen y reduce deuda de la tarjeta.
 */
export async function payCreditCard(
  input: unknown
): Promise<CreditCardPaymentResult> {
  const validation = parseCreditCardPaymentInput(input);
  if (!validation.success) {
    return { ok: false, error: validation.error };
  }

  try {
    const userId = await getDefaultUserId();
    const timezone = await getUserTimezone();
    const result = await processCreditCardPayment(
      userId,
      timezone,
      validation.data
    );
    revalidateAll();
    return { ok: true, ...result };
  } catch (err) {
    console.error("payCreditCard failed:", err);
    return { ok: false, error: mapTransactionError(err) };
  }
}
