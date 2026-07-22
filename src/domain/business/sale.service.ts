import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { postJournalEntry } from "./journal.service";

type TxClient = Prisma.TransactionClient;

export type InstallmentPlanItem = { dueDate: Date; amount: number };

export type SaleLineInput = {
  productId?: string;
  description: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
};

async function nextSaleNumber(tx: TxClient, businessId: string) {
  const count = await tx.businessSale.count({ where: { businessId } });
  return `V-${String(count + 1).padStart(4, "0")}`;
}

function buildSaleJournalLines(params: {
  totalAmount: number;
  cogsTotal: number;
  cashReceived: number;
  trackInventory: boolean;
}) {
  const lines: { code: string; debit?: number; credit?: number }[] = [
    { code: "1200", debit: params.totalAmount },
    { code: "4100", credit: params.totalAmount },
  ];

  if (params.cogsTotal > 0 && params.trackInventory) {
    lines.push(
      { code: "5100", debit: params.cogsTotal },
      { code: "1300", credit: params.cogsTotal }
    );
  }

  if (params.cashReceived > 0) {
    lines.push(
      { code: "1100", debit: params.cashReceived },
      { code: "1200", credit: params.cashReceived }
    );
  }

  return lines;
}

export async function createBusinessSale(params: {
  businessId: string;
  customerId?: string;
  lines: SaleLineInput[];
  cashDownPayment: number;
  installmentPlan: InstallmentPlanItem[];
  saleDate: Date;
  notes?: string;
  trackInventory?: boolean;
}) {
  const trackInventory = params.trackInventory ?? true;

  return prisma.$transaction(async (tx) => {
    const subtotal = params.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
    const cogsTotal = params.lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
    const totalAmount = subtotal;
    const creditAmount = totalAmount - params.cashDownPayment;

    if (creditAmount > 0 && params.installmentPlan.length === 0) {
      throw new Error("Las ventas a crédito requieren un plan de cuotas");
    }

    const planTotal = params.installmentPlan.reduce((s, i) => s + i.amount, 0);
    if (params.installmentPlan.length > 0 && Math.abs(planTotal - creditAmount) > 0.01) {
      throw new Error(
        `El plan de cuotas ($${planTotal}) debe igualar el saldo a crédito ($${creditAmount})`
      );
    }

    const saleEntry = await postJournalEntry(tx, {
      businessId: params.businessId,
      entryDate: params.saleDate,
      description: "Venta comercial",
      reference: await nextSaleNumber(tx, params.businessId),
      lines: buildSaleJournalLines({
        totalAmount,
        cogsTotal,
        cashReceived: params.cashDownPayment,
        trackInventory,
      }),
    });

    const paymentTerms =
      params.cashDownPayment > 0 && creditAmount > 0
        ? "MIXED"
        : creditAmount > 0
          ? "CREDIT_INSTALLMENTS"
          : "CASH";

    const sale = await tx.businessSale.create({
      data: {
        businessId: params.businessId,
        customerId: params.customerId,
        saleNumber: saleEntry.reference!,
        saleDate: params.saleDate,
        paymentTerms,
        subtotal,
        totalAmount,
        cashReceived: params.cashDownPayment,
        cogsTotal,
        journalEntryId: saleEntry.id,
        notes: params.notes,
        lines: {
          create: params.lines.map((l) => ({
            productId: l.productId,
            description: l.description,
            quantity: l.qty,
            unitPrice: l.unitPrice,
            unitCost: l.unitCost,
            lineTotal: l.qty * l.unitPrice,
          })),
        },
        installments: {
          create: params.installmentPlan.map((inst, i) => ({
            installmentNo: i + 1,
            dueDate: inst.dueDate,
            expectedAmount: inst.amount,
            status: "PENDING",
          })),
        },
      },
    });

    if (trackInventory) {
      for (const line of params.lines) {
        if (!line.productId) continue;
        const item = await tx.inventoryItem.findUnique({
          where: {
            businessId_productId: {
              businessId: params.businessId,
              productId: line.productId,
            },
          },
        });
        if (!item) continue;

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: { decrement: line.qty } },
        });
        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: item.id,
            type: "SALE",
            quantity: line.qty,
            unitCost: line.unitCost,
            referenceType: "SALE",
            referenceId: sale.id,
            movementDate: params.saleDate,
          },
        });
      }
    }

    if (params.customerId) {
      await tx.businessCustomer.update({
        where: { id: params.customerId },
        data: { totalSales: { increment: totalAmount } },
      });
    }

    return sale;
  });
}

export async function registerInstallmentPayment(params: {
  installmentId: string;
  amount: number;
  paymentDate: Date;
  notes?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const installment = await tx.saleInstallment.findUniqueOrThrow({
      where: { id: params.installmentId },
      include: { sale: { include: { business: true } } },
    });

    const remaining =
      Number(installment.expectedAmount) - Number(installment.paidAmount);
    if (params.amount > remaining + 0.01) {
      throw new Error(`El abono excede el saldo pendiente de la cuota ($${remaining})`);
    }

    const entry = await postJournalEntry(tx, {
      businessId: installment.sale.businessId,
      entryDate: params.paymentDate,
      description: `Cobro cuota #${installment.installmentNo} — ${installment.sale.saleNumber}`,
      lines: [
        { code: "1100", debit: params.amount },
        { code: "1200", credit: params.amount },
      ],
    });

    const newPaid = Number(installment.paidAmount) + params.amount;
    const expected = Number(installment.expectedAmount);
    const isPaid = newPaid >= expected - 0.01;

    await tx.installmentPayment.create({
      data: {
        installmentId: params.installmentId,
        amount: params.amount,
        paymentDate: params.paymentDate,
        journalEntryId: entry.id,
        notes: params.notes,
      },
    });

    await tx.saleInstallment.update({
      where: { id: params.installmentId },
      data: {
        paidAmount: newPaid,
        lastPaymentDate: params.paymentDate,
        status: isPaid ? "PAID" : "PARTIAL",
        paidAt: isPaid ? params.paymentDate : undefined,
        overdueDays: isPaid ? 0 : installment.overdueDays,
      },
    });

    return entry;
  });
}

function reverseJournalLines(
  lines: { debit: unknown; credit: unknown; ledgerAccount: { code: string } }[]
) {
  return lines.map((line) => ({
    code: line.ledgerAccount.code,
    debit: Number(line.credit),
    credit: Number(line.debit),
  }));
}

export async function deleteBusinessSale(saleId: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.businessSale.findUniqueOrThrow({
      where: { id: saleId },
      include: {
        lines: true,
        installments: { include: { payments: true } },
        journalEntry: {
          include: { lines: { include: { ledgerAccount: true } } },
        },
        business: true,
      },
    });

    const hasPayments = sale.installments.some(
      (i) => Number(i.paidAmount) > 0 || i.payments.length > 0
    );
    if (hasPayments) {
      throw new Error(
        "No se puede eliminar una venta con cuotas cobradas. Registra la anulación manualmente."
      );
    }

    await postJournalEntry(tx, {
      businessId: sale.businessId,
      entryDate: new Date(),
      description: `Anulación ${sale.saleNumber}`,
      reference: `VOID-${sale.saleNumber}`,
      lines: reverseJournalLines(sale.journalEntry.lines),
    });

    const trackInventory = sale.business.businessType !== "SERVICE";
    if (trackInventory) {
      for (const line of sale.lines) {
        if (!line.productId) continue;
        await tx.inventoryItem.updateMany({
          where: {
            businessId: sale.businessId,
            productId: line.productId,
          },
          data: { quantity: { increment: Number(line.quantity) } },
        });
      }
      await tx.inventoryMovement.deleteMany({
        where: { referenceType: "SALE", referenceId: sale.id },
      });
    }

    if (sale.customerId) {
      await tx.businessCustomer.update({
        where: { id: sale.customerId },
        data: {
          totalSales: { decrement: Number(sale.totalAmount) },
          totalOutstanding: { decrement: Math.max(Number(sale.totalAmount) - Number(sale.cashReceived), 0) },
        },
      });
    }

    await tx.businessSale.delete({ where: { id: saleId } });
    // Conservar asiento original + anulación = neto cero en libros
  });
}
