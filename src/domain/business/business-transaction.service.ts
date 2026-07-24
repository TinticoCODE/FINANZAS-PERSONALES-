import type { BusinessTransactionType, Prisma } from "@prisma/client";

type DbTx = Prisma.TransactionClient;

export async function recordBusinessTransaction(
  tx: DbTx,
  params: {
    businessId: string;
    type: BusinessTransactionType;
    amount: number;
    cashEffect: number;
    transactionDate: Date;
    description: string;
    journalEntryId: string;
    supplierPayableId?: string;
    saleId?: string;
    capitalTransferId?: string;
    installmentPaymentId?: string;
    expenseId?: string;
  }
) {
  return tx.businessTransaction.create({
    data: {
      businessId: params.businessId,
      type: params.type,
      amount: params.amount,
      cashEffect: params.cashEffect,
      transactionDate: params.transactionDate,
      description: params.description,
      journalEntryId: params.journalEntryId,
      supplierPayableId: params.supplierPayableId,
      saleId: params.saleId,
      capitalTransferId: params.capitalTransferId,
      installmentPaymentId: params.installmentPaymentId,
      expenseId: params.expenseId,
    },
  });
}
