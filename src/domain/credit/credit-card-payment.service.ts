import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import { localMidnightToUtc } from "@/domain/billing/timezone";
import type { CreditCardPaymentInput } from "@/domain/credit/credit-card-payment.schema";

type DbTx = Prisma.TransactionClient;

async function ensurePaymentCategory(tx: DbTx, userId: string): Promise<string> {
  const existing = await tx.category.findFirst({
    where: { userId, name: "Pago tarjeta de crédito", type: "EXPENSE" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await tx.category.create({
    data: {
      userId,
      name: "Pago tarjeta de crédito",
      type: "EXPENSE",
      color: "#0ea5e9",
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Partida doble: débito en cuenta origen + abono en tarjeta destino.
 * - Paso 1: EXPENSE/TRANSFER en sourceAccountId (sale el dinero).
 * - Paso 2: PAYMENT_TO_CARD con sourceAccountId + creditCardId (reduce deuda).
 */
export async function processCreditCardPayment(
  userId: string,
  timezone: string,
  input: CreditCardPaymentInput
) {
  const paymentDate = (() => {
    const [y, m, d] = input.paymentDate.split("-").map(Number);
    return localMidnightToUtc({ year: y, month: m - 1, day: d }, timezone);
  })();

  const transferGroupId = randomUUID();

  return prisma.$transaction(async (tx) => {
    const [sourceAccount, card] = await Promise.all([
      tx.account.findFirst({
        where: { id: input.sourceAccountId, userId, isActive: true },
      }),
      tx.creditCard.findFirst({
        where: { id: input.creditCardId, userId, isActive: true },
      }),
    ]);

    if (!sourceAccount) {
      throw new Error("Cuenta de origen no encontrada");
    }
    if (!card) {
      throw new Error("Tarjeta de crédito no encontrada");
    }

    const sourceBalance = toNumber(sourceAccount.balance);
    if (input.amount > sourceBalance + 0.01) {
      throw new Error(
        `Saldo insuficiente en "${sourceAccount.name}". Disponible: ${sourceBalance.toLocaleString("es-CO")} COP`
      );
    }

    const cardBalance = toNumber(card.usedBalance);
    if (input.amount > cardBalance + 0.01) {
      throw new Error(
        `El pago supera la deuda de la tarjeta (${cardBalance.toLocaleString("es-CO")} COP)`
      );
    }

    const categoryId = await ensurePaymentCategory(tx, userId);
    const description =
      input.notes?.trim() ||
      `Pago tarjeta ${card.bank} •••• ${card.lastFourDigits}`;

    const sourceLeg = await tx.transaction.create({
      data: {
        userId,
        accountId: input.sourceAccountId,
        creditCardId: null,
        categoryId,
        type: "EXPENSE",
        amount: input.amount,
        description,
        paymentMethod: "TRANSFER",
        tags: ["card-payment", "card-payment-source", `transfer:${transferGroupId}`],
        transferGroupId,
        date: paymentDate,
      },
    });

    const cardLeg = await tx.transaction.create({
      data: {
        userId,
        accountId: input.sourceAccountId,
        creditCardId: input.creditCardId,
        categoryId,
        type: "PAYMENT_TO_CARD",
        amount: input.amount,
        description,
        paymentMethod: "TRANSFER",
        tags: ["card-payment", "card-payment-destination", `transfer:${transferGroupId}`],
        transferGroupId,
        date: paymentDate,
      },
    });

    await tx.account.update({
      where: { id: input.sourceAccountId },
      data: { balance: { decrement: input.amount } },
    });

    await tx.creditCard.update({
      where: { id: input.creditCardId },
      data: { usedBalance: { decrement: input.amount } },
    });

    const updatedAccount = await tx.account.findUniqueOrThrow({
      where: { id: input.sourceAccountId },
      select: { balance: true },
    });
    const updatedCard = await tx.creditCard.findUniqueOrThrow({
      where: { id: input.creditCardId },
      select: { usedBalance: true },
    });

    return {
      transferGroupId,
      sourceTransactionId: sourceLeg.id,
      cardPaymentTransactionId: cardLeg.id,
      newAccountBalance: toNumber(updatedAccount.balance),
      newCardBalance: toNumber(updatedCard.usedBalance),
    };
  });
}
