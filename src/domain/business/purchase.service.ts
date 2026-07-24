import type { Prisma } from "@prisma/client";
import { postJournalEntry } from "@/domain/business/journal.service";
import {
  assertSufficientCash,
} from "@/domain/business/business-cash-balance";
import { recordBusinessTransaction } from "@/domain/business/business-transaction.service";

type DbTx = Prisma.TransactionClient;

export type InventoryPurchaseFunding = {
  businessId: string;
  productName: string;
  totalCost: number;
  cashPaid: number;
  supplierName?: string;
  supplierId?: string;
  dueDate?: Date;
  purchaseDate: Date;
  reference?: string;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

async function upsertSupplier(
  tx: DbTx,
  businessId: string,
  supplierName: string,
  supplierId?: string
) {
  if (supplierId) {
    const existing = await tx.businessSupplier.findFirst({
      where: { id: supplierId, businessId },
    });
    if (existing) return existing.id;
  }

  const supplier = await tx.businessSupplier.upsert({
    where: {
      businessId_name: { businessId, name: supplierName },
    },
    create: { businessId, name: supplierName },
    update: {},
  });

  return supplier.id;
}

/**
 * Registra compra de inventario con partida doble.
 * Si la caja no alcanza, el remanente debe ir a CxP (cuenta 2100).
 */
export async function postInventoryPurchase(
  tx: DbTx,
  params: InventoryPurchaseFunding
) {
  const totalCost = roundMoney(params.totalCost);
  if (totalCost <= 0) return null;

  const cashPaid = roundMoney(Math.max(0, Math.min(params.cashPaid, totalCost)));
  const payableAmount = roundMoney(totalCost - cashPaid);

  if (payableAmount > 0.01 && !params.supplierName?.trim()) {
    throw new Error(
      "Indica el proveedor para registrar la deuda (CxP) o reduce el monto pagado en caja."
    );
  }

  if (cashPaid > 0) {
    await assertSufficientCash(tx, params.businessId, cashPaid);
  }

  const lines: { code: string; debit?: number; credit?: number }[] = [
    { code: "1300", debit: totalCost },
  ];

  if (cashPaid > 0) lines.push({ code: "1100", credit: cashPaid });
  if (payableAmount > 0.01) lines.push({ code: "2100", credit: payableAmount });

  const entry = await postJournalEntry(tx, {
    businessId: params.businessId,
    entryDate: params.purchaseDate,
    description: `Compra inventario — ${params.productName}`,
    reference: params.reference,
    lines,
  });

  let supplierPayableId: string | undefined;

  if (payableAmount > 0.01) {
    const supplierName = params.supplierName!.trim();
    const supplierId = await upsertSupplier(
      tx,
      params.businessId,
      supplierName,
      params.supplierId
    );

    const payable = await tx.supplierPayable.create({
      data: {
        businessId: params.businessId,
        supplierId,
        supplierName,
        description: `Compra inventario — ${params.productName}`,
        totalAmount: payableAmount,
        dueDate: params.dueDate,
        status: "OPEN",
        journalEntryId: entry.id,
      },
    });
    supplierPayableId = payable.id;
  }

  await recordBusinessTransaction(tx, {
    businessId: params.businessId,
    type: "SUPPLIER_PURCHASE",
    amount: totalCost,
    cashEffect: -cashPaid,
    transactionDate: params.purchaseDate,
    description: `Compra inventario — ${params.productName}`,
    journalEntryId: entry.id,
    supplierPayableId,
  });

  return { entry, supplierPayableId, cashPaid, payableAmount };
}
