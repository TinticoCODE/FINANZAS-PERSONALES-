import type { PrismaClient, Prisma } from "@prisma/client";
import { toNumber } from "@/lib/decimal";

export type JournalLineInput = {
  code: string;
  debit?: number;
  credit?: number;
};

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function getAccountIdByCode(
  tx: DbClient,
  businessId: string,
  code: string
) {
  const account = await tx.businessLedgerAccount.findUnique({
    where: { businessId_code: { businessId, code } },
  });
  if (!account) {
    throw new Error(`Cuenta contable ${code} no encontrada en el negocio`);
  }
  return account.id;
}

export async function getLedgerBalance(
  tx: DbClient,
  businessId: string,
  code: string
): Promise<number> {
  const account = await tx.businessLedgerAccount.findUnique({
    where: { businessId_code: { businessId, code } },
    include: { lines: { select: { debit: true, credit: true } } },
  });
  if (!account) return 0;

  const netDebit = account.lines.reduce(
    (sum, line) => sum + toNumber(line.debit) - toNumber(line.credit),
    0
  );

  // Pasivo, patrimonio e ingresos tienen saldo normal acreedor (crédito − débito)
  if (
    account.type === "LIABILITY" ||
    account.type === "EQUITY" ||
    account.type === "REVENUE"
  ) {
    return -netDebit;
  }

  return netDebit;
}

function validateBalanced(lines: JournalLineInput[]) {
  const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Asiento desbalanceado: débitos ${totalDebit} ≠ créditos ${totalCredit}`
    );
  }
}

export async function postJournalEntry(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    entryDate: Date;
    description: string;
    reference?: string;
    lines: JournalLineInput[];
  }
) {
  validateBalanced(params.lines);

  const entry = await tx.businessJournalEntry.create({
    data: {
      businessId: params.businessId,
      entryDate: params.entryDate,
      description: params.description,
      reference: params.reference,
    },
  });

  for (const line of params.lines) {
    const ledgerAccountId = await getAccountIdByCode(
      tx,
      params.businessId,
      line.code
    );
    await tx.businessJournalLine.create({
      data: {
        journalEntryId: entry.id,
        ledgerAccountId,
        debit: line.debit ?? 0,
        credit: line.credit ?? 0,
      },
    });
  }

  return entry;
}
