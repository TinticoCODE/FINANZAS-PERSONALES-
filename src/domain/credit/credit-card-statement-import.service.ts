import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import { localMidnightToUtc } from "@/domain/billing/timezone";
import { isMsiTerm } from "@/domain/credit/msi.constants";
import {
  computeStatementLineHash,
  pdfFileHashTag,
  statementLineHashTag,
} from "@/domain/credit/pdf/statement-line-hash";
import type {
  CreditCardStatementImportInput,
  CreditCardStatementLineInput,
  StatementExpenseLineInput,
} from "@/domain/credit/credit-card-statement.schema";

type DbTx = Prisma.TransactionClient;

function parseStatementDate(dateStr: string, timezone: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return localMidnightToUtc({ year: y, month: m - 1, day: d }, timezone);
}

function periodTag(periodStart: string, periodEnd: string): string {
  return `statement-import:${periodStart}:${periodEnd}`;
}

function lineDedupKey(line: CreditCardStatementLineInput): string {
  return computeStatementLineHash({
    date: line.date,
    description: line.description,
    amount: line.amount,
    type: line.type,
  });
}

async function ensureCategory(
  tx: DbTx,
  userId: string,
  name: string,
  type: "EXPENSE"
): Promise<string> {
  const existing = await tx.category.findFirst({
    where: { userId, name, type },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await tx.category.create({
    data: { userId, name, type, color: "#6366f1" },
    select: { id: true },
  });
  return created.id;
}

function buildExpenseDescription(line: StatementExpenseLineInput): string {
  if (line.totalInstallments <= 1) return line.description;
  return `${line.description} (${line.currentInstallment}/${line.totalInstallments})`;
}

function resolveInstallmentFields(line: StatementExpenseLineInput) {
  const totalInstallments = line.totalInstallments;
  const isInstallments = totalInstallments > 1;
  const hasZeroInterest =
    isInstallments && line.eaRate === 0 && isMsiTerm(totalInstallments);

  return {
    installments: totalInstallments,
    isInstallments,
    hasZeroInterest,
    installmentAmount: isInstallments ? line.amount : null,
  };
}

async function importExpenseLine(
  tx: DbTx,
  params: {
    userId: string;
    creditCardId: string;
    line: StatementExpenseLineInput;
    categoryId: string;
    timezone: string;
    importTag: string;
    lineHash: string;
  }
) {
  const installmentFields = resolveInstallmentFields(params.line);
  const hashTag = statementLineHashTag(params.lineHash);

  await tx.transaction.create({
    data: {
      userId: params.userId,
      creditCardId: params.creditCardId,
      accountId: null,
      categoryId: params.categoryId,
      type: "EXPENSE",
      amount: params.line.amount,
      description: buildExpenseDescription(params.line),
      paymentMethod: "CREDIT",
      installments: installmentFields.installments,
      isInstallments: installmentFields.isInstallments,
      hasZeroInterest: installmentFields.hasZeroInterest,
      installmentAmount: installmentFields.installmentAmount,
      tags: [params.importTag, "card-expense", hashTag],
      date: parseStatementDate(params.line.date, params.timezone),
    },
  });

  await tx.creditCard.update({
    where: { id: params.creditCardId },
    data: { usedBalance: { increment: params.line.amount } },
  });
}

async function importPaymentLine(
  tx: DbTx,
  params: {
    userId: string;
    creditCardId: string;
    line: Extract<CreditCardStatementLineInput, { type: "PAYMENT_TO_CARD" }>;
    categoryId: string;
    timezone: string;
    importTag: string;
    lineHash: string;
  }
) {
  const card = await tx.creditCard.findUniqueOrThrow({
    where: { id: params.creditCardId },
    select: { usedBalance: true },
  });

  const currentUsed = toNumber(card.usedBalance);
  if (params.line.amount > currentUsed + 0.01) {
    throw new Error(
      `El pago "${params.line.description}" (${params.line.amount.toLocaleString("es-CO")} COP) supera la deuda registrada (${currentUsed.toLocaleString("es-CO")} COP)`
    );
  }

  const hashTag = statementLineHashTag(params.lineHash);

  await tx.transaction.create({
    data: {
      userId: params.userId,
      creditCardId: params.creditCardId,
      accountId: null,
      categoryId: params.categoryId,
      type: "EXPENSE",
      amount: params.line.amount,
      description: params.line.description,
      paymentMethod: "TRANSFER",
      installments: 1,
      isInstallments: false,
      hasZeroInterest: false,
      tags: [params.importTag, "card-payment", hashTag],
      date: parseStatementDate(params.line.date, params.timezone),
    },
  });

  await tx.creditCard.update({
    where: { id: params.creditCardId },
    data: { usedBalance: { decrement: params.line.amount } },
  });
}

async function loadExistingLineHashes(
  tx: DbTx,
  userId: string,
  creditCardId: string
): Promise<Set<string>> {
  const existing = await tx.transaction.findMany({
    where: { userId, creditCardId },
    select: { tags: true },
  });

  const hashes = new Set<string>();
  for (const row of existing) {
    for (const tag of row.tags) {
      if (tag.startsWith("import-hash:")) {
        hashes.add(tag.slice("import-hash:".length));
      }
    }
  }
  return hashes;
}

export async function importCreditCardStatementData(
  userId: string,
  timezone: string,
  input: CreditCardStatementImportInput
) {
  const importTag = periodTag(input.periodStart, input.periodEnd);
  const cycleStart = parseStatementDate(input.periodStart, timezone);
  const cycleEnd = parseStatementDate(input.periodEnd, timezone);

  return prisma.$transaction(async (tx) => {
    const card = await tx.creditCard.findFirst({
      where: { id: input.creditCardId, userId, isActive: true },
    });
    if (!card) {
      throw new Error("Tarjeta de crédito no encontrada");
    }

    if (input.sourceFileHash) {
      const duplicatePdf = await tx.creditCardStatement.findFirst({
        where: {
          creditCardId: input.creditCardId,
          sourceFileHash: input.sourceFileHash,
        },
        select: { id: true },
      });
      if (duplicatePdf) {
        throw new Error("Este archivo PDF ya fue importado anteriormente");
      }
    }

    const existingStatement = await tx.creditCardStatement.findUnique({
      where: {
        creditCardId_cycleEnd: {
          creditCardId: input.creditCardId,
          cycleEnd,
        },
      },
    });

    const existingLineHashes = await loadExistingLineHashes(
      tx,
      userId,
      input.creditCardId
    );

    const linesToImport = input.lines.filter((line) => {
      const hash = lineDedupKey(line);
      return !existingLineHashes.has(hash);
    });

    const skippedCount = input.lines.length - linesToImport.length;

    if (linesToImport.length === 0) {
      throw new Error(
        existingStatement
          ? "Todas las transacciones de este extracto ya existen en la base de datos"
          : "No hay transacciones nuevas para importar"
      );
    }

    const expenseCategoryId =
      input.expenseCategoryId ??
      (await ensureCategory(tx, userId, "Compras tarjeta (importación)", "EXPENSE"));

    const paymentCategoryId =
      input.paymentCategoryId ??
      (await ensureCategory(tx, userId, "Pago tarjeta de crédito", "EXPENSE"));

    let expenseCount = 0;
    let paymentCount = 0;

    for (const line of linesToImport) {
      const lineHash = lineDedupKey(line);

      if (line.type === "EXPENSE") {
        await importExpenseLine(tx, {
          userId,
          creditCardId: input.creditCardId,
          line,
          categoryId: line.categoryId ?? expenseCategoryId,
          timezone,
          importTag,
          lineHash,
        });
        expenseCount++;
        continue;
      }

      await importPaymentLine(tx, {
        userId,
        creditCardId: input.creditCardId,
        line,
        categoryId: line.categoryId ?? paymentCategoryId,
        timezone,
        importTag,
        lineHash,
      });
      paymentCount++;
    }

    const updatedCard = await tx.creditCard.findUniqueOrThrow({
      where: { id: input.creditCardId },
      select: { usedBalance: true },
    });

    let statementId: string;

    if (existingStatement) {
      const updated = await tx.creditCardStatement.update({
        where: { id: existingStatement.id },
        data: {
          usedBalanceAtClose: updatedCard.usedBalance,
          totalPaymentDue: input.totalPaymentDue,
          minPaymentDue: input.minPaymentDue,
          interestCharged: input.interestCharged,
          importSource: input.importSource,
          sourceFileHash: input.sourceFileHash ?? existingStatement.sourceFileHash,
        },
      });
      statementId = updated.id;
    } else {
      const created = await tx.creditCardStatement.create({
        data: {
          userId,
          creditCardId: input.creditCardId,
          cycleStart,
          cycleEnd,
          usedBalanceAtClose: updatedCard.usedBalance,
          totalPaymentDue: input.totalPaymentDue,
          minPaymentDue: input.minPaymentDue,
          interestCharged: input.interestCharged,
          importSource: input.importSource,
          sourceFileHash: input.sourceFileHash,
        },
      });
      statementId = created.id;
    }

    return {
      statementId,
      importedCount: linesToImport.length,
      skippedCount,
      expenseCount,
      paymentCount,
      usedBalanceAtClose: toNumber(updatedCard.usedBalance),
    };
  });
}

export { pdfFileHashTag, statementLineHashTag, computeStatementLineHash };
