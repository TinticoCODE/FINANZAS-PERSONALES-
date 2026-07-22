"use server";

import { revalidatePath } from "next/cache";
import type {
  AccountType,
  PaymentMethod,
  ReminderType,
  TransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import { getDefaultUserId } from "@/lib/user";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/cards");
  revalidatePath("/budgets");
  revalidatePath("/goals");
  revalidatePath("/loans");
  revalidatePath("/calendar");
  revalidatePath("/reports");
}

async function applyTransactionEffects(params: {
  accountId?: string | null;
  creditCardId?: string | null;
  type: TransactionType;
  amount: number;
  paymentMethod: PaymentMethod;
  reverse?: boolean;
}) {
  const multiplier = params.reverse ? -1 : 1;
  const amount = params.amount * multiplier;

  if (params.type === "INCOME") {
    if (!params.accountId) {
      throw new Error("Los ingresos deben estar asociados a una cuenta bancaria");
    }
    await prisma.account.update({
      where: { id: params.accountId },
      data: { balance: { increment: amount } },
    });
    return;
  }

  if (params.paymentMethod === "CREDIT" && params.creditCardId) {
    await prisma.creditCard.update({
      where: { id: params.creditCardId },
      data: { usedBalance: { increment: amount } },
    });
    return;
  }

  if (!params.accountId) {
    throw new Error("Los gastos con débito o efectivo requieren una cuenta bancaria");
  }

  await prisma.account.update({
    where: { id: params.accountId },
    data: { balance: { decrement: amount } },
  });
}

function validateTransactionFunding(data: {
  type: TransactionType;
  paymentMethod: PaymentMethod;
  accountId?: string;
  creditCardId?: string;
}) {
  const hasAccount = Boolean(data.accountId);
  const hasCard = Boolean(data.creditCardId);

  if (data.type === "INCOME") {
    if (!hasAccount) throw new Error("Selecciona la cuenta donde ingresa el dinero");
    if (hasCard) throw new Error("Los ingresos no pueden asociarse a una tarjeta de crédito");
    return;
  }

  if (data.paymentMethod === "CREDIT") {
    if (!hasCard) throw new Error("Selecciona la tarjeta de crédito usada en la compra");
    if (hasAccount) {
      throw new Error("Un gasto a crédito no puede restar saldo de una cuenta bancaria");
    }
    return;
  }

  if (!hasAccount) throw new Error("Selecciona la cuenta bancaria del gasto");
  if (hasCard) {
    throw new Error("Un gasto con débito o efectivo no puede asociarse a una tarjeta");
  }
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

export async function createTransaction(data: {
  accountId?: string;
  categoryId: string;
  creditCardId?: string;
  type: TransactionType;
  amount: number;
  description?: string;
  paymentMethod: PaymentMethod;
  tags?: string[];
  date?: string;
  installments?: number;
}) {
  const userId = await getDefaultUserId();
  const installments = Math.max(1, data.installments ?? 1);

  validateTransactionFunding({
    type: data.type,
    paymentMethod: data.paymentMethod,
    accountId: data.accountId,
    creditCardId: data.creditCardId,
  });

  if (data.paymentMethod === "CREDIT" && data.creditCardId) {
    if (installments < 1 || installments > 48) {
      throw new Error("El número de cuotas debe estar entre 1 y 48");
    }
  }

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
        installments,
        tags: data.tags ?? [],
        date: data.date ? new Date(data.date) : new Date(),
      },
    });

    await applyTransactionEffects({
      accountId: data.accountId,
      creditCardId: data.creditCardId,
      type: data.type,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
    });
  });

  revalidateAll();
}

export async function createCreditCardTransaction(data: {
  creditCardId: string;
  categoryId: string;
  amount: number;
  description?: string;
  date: string;
  installments: number;
}) {
  const userId = await getDefaultUserId();
  const installments = Math.max(1, data.installments);

  if (installments < 1 || installments > 48) {
    throw new Error("El número de cuotas debe estar entre 1 y 48");
  }

  const card = await prisma.creditCard.findFirst({
    where: { id: data.creditCardId, userId, isActive: true },
  });

  if (!card) throw new Error("Tarjeta de crédito no encontrada");

  await createTransaction({
    categoryId: data.categoryId,
    creditCardId: data.creditCardId,
    type: "EXPENSE",
    amount: data.amount,
    description: data.description,
    paymentMethod: "CREDIT",
    date: data.date,
    installments,
  });
}

export async function deleteTransaction(id: string) {
  const userId = await getDefaultUserId();
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) return;

  await prisma.$transaction(async (tx) => {
    await applyTransactionEffects({
      accountId: existing.accountId,
      creditCardId: existing.creditCardId,
      type: existing.type,
      amount: toNumber(existing.amount),
      paymentMethod: existing.paymentMethod,
      reverse: true,
    });
    await tx.transaction.delete({ where: { id } });
  });

  revalidateAll();
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
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
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
      dueDate: new Date(data.dueDate),
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

function revalidateLoans() {
  revalidatePath("/loans");
  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function createAccountReceivable(data: {
  debtorName: string;
  principalAmount: number;
  sourceAccountId: string;
  loanDate: string;
  interestRate?: number;
  notes?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getDefaultUserId();
  const amount = data.principalAmount;

  if (amount <= 0) {
    return { ok: false, error: "El monto del préstamo debe ser mayor a cero" };
  }

  if (!data.debtorName.trim()) {
    return { ok: false, error: "Ingresa el nombre del deudor" };
  }

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

      await tx.accountReceivable.create({
        data: {
          userId,
          debtorName: data.debtorName.trim(),
          principalAmount: amount,
          outstandingBalance: amount,
          interestRate: data.interestRate ?? 0,
          loanDate: new Date(data.loanDate),
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
    console.error("createAccountReceivable failed:", err);
    return { ok: false, error: "No se pudo registrar el préstamo" };
  }

  revalidateLoans();
  return { ok: true };
}

export async function registerReceivablePayment(data: {
  receivableId: string;
  amount: number;
  destinationAccountId: string;
  paymentDate: string;
  notes?: string;
}) {
  const userId = await getDefaultUserId();
  const amount = data.amount;

  if (amount <= 0) throw new Error("El abono debe ser mayor a cero");

  await prisma.$transaction(async (tx) => {
    const receivable = await tx.accountReceivable.findFirst({
      where: { id: data.receivableId, userId },
    });
    if (!receivable) throw new Error("Préstamo no encontrado");
    if (receivable.status !== "ACTIVE") {
      throw new Error("Solo se pueden registrar abonos en préstamos activos");
    }

    const outstanding = toNumber(receivable.outstandingBalance);
    if (amount > outstanding) {
      throw new Error("El abono supera el saldo pendiente del deudor");
    }

    const destination = await tx.account.findFirst({
      where: { id: data.destinationAccountId, userId, isActive: true },
    });
    if (!destination) throw new Error("Cuenta receptora no encontrada");

    const newOutstanding = outstanding - amount;

    await tx.accountReceivable.update({
      where: { id: data.receivableId },
      data: {
        outstandingBalance: newOutstanding,
        status: newOutstanding <= 0 ? "PAID" : "ACTIVE",
      },
    });

    await tx.account.update({
      where: { id: data.destinationAccountId },
      data: { balance: { increment: amount } },
    });

    await tx.receivablePayment.create({
      data: {
        receivableId: data.receivableId,
        amount,
        paymentDate: new Date(data.paymentDate),
        destinationAccountId: data.destinationAccountId,
        notes: data.notes,
      },
    });
  });

  revalidateLoans();
}

export async function deleteAccountReceivable(id: string) {
  const userId = await getDefaultUserId();

  await prisma.$transaction(async (tx) => {
    const receivable = await tx.accountReceivable.findFirst({
      where: { id, userId },
      include: { _count: { select: { payments: true } } },
    });
    if (!receivable) return;

    if (receivable._count.payments > 0) {
      throw new Error("No puedes eliminar un préstamo que ya tiene abonos registrados");
    }

    await tx.account.update({
      where: { id: receivable.sourceAccountId },
      data: { balance: { increment: toNumber(receivable.outstandingBalance) } },
    });

    await tx.accountReceivable.delete({ where: { id } });
  });

  revalidateLoans();
}
