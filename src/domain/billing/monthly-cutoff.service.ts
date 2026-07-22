import type { PaymentMethod, Prisma, TransactionType } from "@prisma/client";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import {
  computeNextRunAt,
  cutoffCycleEndUtc,
  cutoffCycleStartUtc,
  isCreditCardCutoffProcessingWindow,
  isRecurringDue,
  toUserLocalTime,
} from "@/domain/billing/timezone";
import { getPaymentDueForCycle } from "@/services/credit-card.service";

export type MonthlyCutoffResult = {
  usersProcessed: number;
  creditCardStatementsClosed: number;
  recurringExecuted: number;
  remindersCreated: number;
  errors: string[];
};

type DbTx = Prisma.TransactionClient;

async function applyTransactionBalances(
  tx: DbTx,
  params: {
    type: TransactionType;
    amount: number;
    paymentMethod: PaymentMethod;
    accountId?: string | null;
    creditCardId?: string | null;
  }
) {
  if (params.type === "INCOME") {
    if (!params.accountId) throw new Error("Recurring income requires accountId");
    await tx.account.update({
      where: { id: params.accountId },
      data: { balance: { increment: params.amount } },
    });
    return;
  }

  if (params.paymentMethod === "CREDIT" && params.creditCardId) {
    await tx.creditCard.update({
      where: { id: params.creditCardId },
      data: { usedBalance: { increment: params.amount } },
    });
    return;
  }

  if (params.paymentMethod === "CASH") {
    return;
  }

  if (!params.accountId) throw new Error("Recurring expense requires accountId");
  await tx.account.update({
    where: { id: params.accountId },
    data: { balance: { decrement: params.amount } },
  });
}

export async function runMonthlyCutoffForAllUsers(
  instantUtc: Date = new Date()
): Promise<MonthlyCutoffResult> {
  const result: MonthlyCutoffResult = {
    usersProcessed: 0,
    creditCardStatementsClosed: 0,
    recurringExecuted: 0,
    remindersCreated: 0,
    errors: [],
  };

  const users = await prisma.user.findMany({
    select: { id: true, timezone: true },
  });

  for (const user of users) {
    try {
      const partial = await runMonthlyCutoffForUser(user.id, user.timezone, instantUtc);
      result.usersProcessed += 1;
      result.creditCardStatementsClosed += partial.creditCardStatementsClosed;
      result.recurringExecuted += partial.recurringExecuted;
      result.remindersCreated += partial.remindersCreated;
      result.errors.push(...partial.errors);
    } catch (err) {
      result.errors.push(
        `user ${user.id}: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  return result;
}

export async function runMonthlyCutoffForUser(
  userId: string,
  timezone: string,
  instantUtc: Date = new Date()
): Promise<Omit<MonthlyCutoffResult, "usersProcessed">> {
  const result = {
    creditCardStatementsClosed: 0,
    recurringExecuted: 0,
    remindersCreated: 0,
    errors: [] as string[],
  };

  const cards = await prisma.creditCard.findMany({
    where: { userId, isActive: true },
  });

  for (const card of cards) {
    if (!isCreditCardCutoffProcessingWindow(card.cutOffDate, timezone, instantUtc)) {
      continue;
    }

    const cycleEnd = cutoffCycleEndUtc(card.cutOffDate, timezone, instantUtc);
    const cycleStart = cutoffCycleStartUtc(cycleEnd, card.cutOffDate, timezone);

    const existing = await prisma.creditCardStatement.findUnique({
      where: {
        creditCardId_cycleEnd: {
          creditCardId: card.id,
          cycleEnd,
        },
      },
    });
    if (existing) continue;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.creditCardStatement.create({
          data: {
            userId,
            creditCardId: card.id,
            cycleStart,
            cycleEnd,
            usedBalanceAtClose: card.usedBalance,
          },
        });

        const cycleEndLocal = toUserLocalTime(cycleEnd, timezone);
        const paymentDueLocal = getPaymentDueForCycle(
          cycleEndLocal,
          card.cutOffDate,
          card.paymentDueDate
        );

        await tx.reminder.create({
          data: {
            userId,
            title: `Pago tarjeta ${card.name}`,
            description: `Corte cerrado. Pago mínimo / evitar intereses antes del ${paymentDueLocal.toLocaleDateString("es-CO")}`,
            type: "CARD_PAYMENT",
            dueDate: fromZonedTime(
              new Date(
                paymentDueLocal.getFullYear(),
                paymentDueLocal.getMonth(),
                paymentDueLocal.getDate(),
                12,
                0,
                0,
                0
              ),
              timezone
            ),
          },
        });
      });

      result.creditCardStatementsClosed += 1;
      result.remindersCreated += 1;
    } catch (err) {
      result.errors.push(
        `card ${card.id}: ${err instanceof Error ? err.message : "cutoff failed"}`
      );
    }
  }

  const recurringList = await prisma.recurringTransaction.findMany({
    where: { userId, isActive: true },
  });

  for (const recurring of recurringList) {
    if (!isRecurringDue(recurring.nextRunAt, timezone, instantUtc)) continue;

    try {
      await prisma.$transaction(async (tx) => {
        const amount = toNumber(recurring.amount);
        const txDate = recurring.nextRunAt;

        await tx.transaction.create({
          data: {
            userId,
            accountId: recurring.accountId,
            creditCardId: recurring.creditCardId,
            categoryId: recurring.categoryId,
            type: recurring.type,
            amount,
            description:
              recurring.description ??
              `Recurrente automática (${recurring.frequency.toLowerCase()})`,
            paymentMethod: recurring.paymentMethod,
            installments: recurring.installments,
            date: txDate,
          },
        });

        await applyTransactionBalances(tx, {
          type: recurring.type,
          amount,
          paymentMethod: recurring.paymentMethod,
          accountId: recurring.accountId,
          creditCardId: recurring.creditCardId,
        });

        const nextRunAt = computeNextRunAt({
          frequency: recurring.frequency,
          timezone,
          dayOfMonth: recurring.dayOfMonth,
          dayOfWeek: recurring.dayOfWeek,
          monthOfYear: recurring.monthOfYear,
          afterUtc: txDate,
        });

        await tx.recurringTransaction.update({
          where: { id: recurring.id },
          data: {
            lastRunAt: instantUtc,
            nextRunAt,
          },
        });
      });

      result.recurringExecuted += 1;
    } catch (err) {
      result.errors.push(
        `recurring ${recurring.id}: ${err instanceof Error ? err.message : "execution failed"}`
      );
    }
  }

  return result;
}
