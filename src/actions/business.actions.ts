"use server";

import { revalidatePath } from "next/cache";
import type { BusinessType, CapitalTransferType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  defaultExpenseCategories,
  getChartOfAccounts,
  slugifyBusinessName,
} from "@/domain/business/chart-of-accounts";
import { postJournalEntry } from "@/domain/business/journal.service";
import { assertSufficientCash } from "@/domain/business/business-cash-balance";
import { recordBusinessTransaction } from "@/domain/business/business-transaction.service";
import { postInventoryPurchase } from "@/domain/business/purchase.service";
import {
  createBusinessSale,
  deleteBusinessSale,
  processInstallmentPayment,
  type InstallmentPlanItem,
  type SaleLineInput,
} from "@/domain/business/sale.service";
import { getDefaultUserId } from "@/lib/user";

function revalidateBusiness(slug?: string) {
  revalidatePath("/business");
  if (slug) revalidatePath(`/business/${slug}`);
  revalidatePath("/accounts");
}

async function ensureUniqueSlug(userId: string, baseSlug: string) {
  let slug = baseSlug;
  let counter = 1;
  while (
    await prisma.business.findUnique({
      where: { userId_slug: { userId, slug } },
    })
  ) {
    slug = `${baseSlug}-${counter++}`;
  }
  return slug;
}

export async function createBusiness(data: {
  name: string;
  businessType: BusinessType;
  description?: string;
}) {
  const userId = await getDefaultUserId();
  const baseSlug = slugifyBusinessName(data.name);
  const slug = await ensureUniqueSlug(userId, baseSlug);

  const business = await prisma.$transaction(async (tx) => {
    const created = await tx.business.create({
      data: {
        userId,
        name: data.name,
        slug,
        businessType: data.businessType,
        description: data.description,
      },
    });

    const accounts = getChartOfAccounts(data.businessType);
    await tx.businessLedgerAccount.createMany({
      data: accounts.map((a) => ({
        businessId: created.id,
        code: a.code,
        name: a.name,
        type: a.type,
        isSystem: true,
      })),
    });

    await tx.businessExpenseCategory.createMany({
      data: defaultExpenseCategories.map((c) => ({
        businessId: created.id,
        name: c.name,
        color: c.color,
      })),
    });

    return created;
  });

  revalidateBusiness(business.slug);
  return { id: business.id, slug: business.slug };
}

export async function deleteBusiness(businessId: string) {
  const userId = await getDefaultUserId();
  const business = await prisma.business.findFirstOrThrow({
    where: { id: businessId, userId },
  });
  await prisma.business.delete({ where: { id: businessId } });
  revalidateBusiness(business.slug);
}

export async function createBusinessCustomer(data: {
  businessId: string;
  name: string;
  documentId?: string;
  phone?: string;
  email?: string;
  notes?: string;
}) {
  const userId = await getDefaultUserId();
  await prisma.business.findFirstOrThrow({
    where: { id: data.businessId, userId },
  });

  const customer = await prisma.businessCustomer.create({
    data: {
      businessId: data.businessId,
      name: data.name,
      documentId: data.documentId,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
    },
  });

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: data.businessId },
  });
  revalidateBusiness(business.slug);
  return customer.id;
}

export async function deleteBusinessCustomer(customerId: string) {
  const userId = await getDefaultUserId();
  const customer = await prisma.businessCustomer.findFirstOrThrow({
    where: { id: customerId },
    include: {
      sales: { include: { installments: true } },
      business: true,
    },
  });

  if (customer.business.userId !== userId) {
    throw new Error("No autorizado");
  }

  const hasPendingCredit = customer.sales.some((sale) =>
    sale.installments.some(
      (i) => Number(i.paidAmount) < Number(i.expectedAmount)
    )
  );
  if (hasPendingCredit) {
    throw new Error("No se puede eliminar: el cliente tiene cuotas pendientes");
  }

  if (customer.sales.length > 0) {
    throw new Error(
      "No se puede eliminar: el cliente tiene ventas registradas. Elimina las ventas primero."
    );
  }

  await prisma.businessCustomer.delete({ where: { id: customerId } });
  revalidateBusiness(customer.business.slug);
}

export async function createBusinessProduct(data: {
  businessId: string;
  name: string;
  sku?: string;
  salePrice: number;
  unit?: string;
  isInventoryTracked?: boolean;
  initialStock?: number;
  unitCost?: number;
  cashPaid?: number;
  supplierName?: string;
  supplierPhone?: string;
  supplierWhatsApp?: string;
  supplierEmail?: string;
}) {
  const userId = await getDefaultUserId();
  const business = await prisma.business.findFirstOrThrow({
    where: { id: data.businessId, userId },
  });

  await prisma.$transaction(async (tx) => {
    const product = await tx.businessProduct.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        sku: data.sku,
        salePrice: data.salePrice,
        unit: data.unit ?? "und",
        isInventoryTracked: data.isInventoryTracked ?? business.businessType !== "SERVICE",
        supplierName: data.supplierName,
        supplierPhone: data.supplierPhone,
        supplierWhatsApp: data.supplierWhatsApp,
        supplierEmail: data.supplierEmail,
      },
    });

    const stock = data.initialStock ?? 0;
    const cost = data.unitCost ?? 0;
    if (stock > 0 && product.isInventoryTracked) {
      const item = await tx.inventoryItem.create({
        data: {
          businessId: data.businessId,
          productId: product.id,
          quantity: stock,
          unitCost: cost,
        },
      });

      if (cost > 0) {
        const totalCost = stock * cost;
        await postInventoryPurchase(tx, {
          businessId: data.businessId,
          productName: product.name,
          totalCost,
          cashPaid: data.cashPaid ?? totalCost,
          supplierName: data.supplierName,
          purchaseDate: new Date(),
          reference: `PRODUCT-${product.id}`,
        });
      }

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          type: "PURCHASE",
          quantity: stock,
          unitCost: cost,
          referenceType: "PRODUCT",
          referenceId: product.id,
        },
      });
    }
  });

  revalidateBusiness(business.slug);
}

export async function restockProduct(data: {
  businessId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  cashPaid?: number;
  supplierName?: string;
  date?: Date;
}) {
  const userId = await getDefaultUserId();
  const business = await prisma.business.findFirstOrThrow({
    where: { id: data.businessId, userId },
  });

  await prisma.$transaction(async (tx) => {
    const product = await tx.businessProduct.findFirstOrThrow({
      where: { id: data.productId, businessId: data.businessId },
    });

    const item = await tx.inventoryItem.upsert({
      where: {
        businessId_productId: {
          businessId: data.businessId,
          productId: data.productId,
        },
      },
      create: {
        businessId: data.businessId,
        productId: data.productId,
        quantity: data.quantity,
        unitCost: data.unitCost,
      },
      update: {
        quantity: { increment: data.quantity },
        unitCost: data.unitCost,
        lastRestocked: data.date ?? new Date(),
      },
    });

    const totalCost = data.quantity * data.unitCost;
    if (totalCost > 0) {
      await postInventoryPurchase(tx, {
        businessId: data.businessId,
        productName: product.name,
        totalCost,
        cashPaid: data.cashPaid ?? totalCost,
        supplierName: data.supplierName ?? product.supplierName ?? undefined,
        purchaseDate: data.date ?? new Date(),
        reference: `RESTOCK-${product.id}`,
      });
    }

    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: item.id,
        type: "PURCHASE",
        quantity: data.quantity,
        unitCost: data.unitCost,
        movementDate: data.date ?? new Date(),
      },
    });
  });

  revalidateBusiness(business.slug);
}

export async function updateBusinessProductSupplier(data: {
  productId: string;
  supplierName?: string;
  supplierPhone?: string;
  supplierWhatsApp?: string;
  supplierEmail?: string;
}) {
  const userId = await getDefaultUserId();
  const product = await prisma.businessProduct.findFirstOrThrow({
    where: { id: data.productId },
    include: { business: true },
  });

  if (product.business.userId !== userId) {
    throw new Error("No autorizado");
  }

  await prisma.businessProduct.update({
    where: { id: data.productId },
    data: {
      supplierName: data.supplierName || null,
      supplierPhone: data.supplierPhone || null,
      supplierWhatsApp: data.supplierWhatsApp || null,
      supplierEmail: data.supplierEmail || null,
    },
  });

  revalidateBusiness(product.business.slug);
}

export async function removeStockProduct(data: {
  businessId: string;
  productId: string;
  quantity: number;
  date?: Date;
}) {
  const userId = await getDefaultUserId();
  const business = await prisma.business.findFirstOrThrow({
    where: { id: data.businessId, userId },
  });

  if (data.quantity <= 0) {
    throw new Error("La cantidad debe ser mayor a cero");
  }

  await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: {
        businessId_productId: {
          businessId: data.businessId,
          productId: data.productId,
        },
      },
      include: { product: true },
    });

    if (!item) {
      throw new Error("No hay inventario registrado para este producto");
    }

    const currentQty = Number(item.quantity);
    if (data.quantity > currentQty) {
      throw new Error(`Stock insuficiente. Disponible: ${currentQty} und`);
    }

    const unitCost = Number(item.unitCost);
    const totalValue = data.quantity * unitCost;

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: { decrement: data.quantity } },
    });

    if (totalValue > 0) {
      await postJournalEntry(tx, {
        businessId: data.businessId,
        entryDate: data.date ?? new Date(),
        description: `Ajuste inventario — ${item.product.name}`,
        lines: [
          { code: "5100", debit: totalValue },
          { code: "1300", credit: totalValue },
        ],
      });
    }

    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: item.id,
        type: "ADJUSTMENT",
        quantity: data.quantity,
        unitCost,
        notes: "Reducción manual de stock",
        movementDate: data.date ?? new Date(),
      },
    });
  });

  revalidateBusiness(business.slug);
}

export async function createSaleAction(data: {
  businessId: string;
  customerId?: string;
  lines: SaleLineInput[];
  cashDownPayment: number;
  installmentPlan: { dueDate: string; amount: number }[];
  saleDate: string;
  notes?: string;
}) {
  const userId = await getDefaultUserId();
  const business = await prisma.business.findFirstOrThrow({
    where: { id: data.businessId, userId },
  });

  await createBusinessSale({
    businessId: data.businessId,
    customerId: data.customerId,
    lines: data.lines,
    cashDownPayment: data.cashDownPayment,
    installmentPlan: data.installmentPlan.map((i) => ({
      dueDate: new Date(i.dueDate),
      amount: i.amount,
    })),
    saleDate: new Date(data.saleDate),
    notes: data.notes,
    trackInventory: business.businessType !== "SERVICE",
  });

  revalidateBusiness(business.slug);
}

export async function deleteSaleAction(saleId: string) {
  const userId = await getDefaultUserId();
  const sale = await prisma.businessSale.findUniqueOrThrow({
    where: { id: saleId },
    include: { business: true },
  });

  if (sale.business.userId !== userId) {
    throw new Error("No autorizado");
  }

  await deleteBusinessSale(saleId);
  revalidateBusiness(sale.business.slug);
}

export async function processInstallmentPaymentAction(data: {
  installmentId: string;
  amount: number;
  destinationAccountId: string;
  paymentDate: string;
  notes?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const userId = await getDefaultUserId();
    const installment = await prisma.saleInstallment.findUniqueOrThrow({
      where: { id: data.installmentId },
      include: { sale: { include: { business: true } } },
    });

    if (installment.sale.business.userId !== userId) {
      return { ok: false, error: "No autorizado" };
    }

    if (data.amount <= 0) {
      return { ok: false, error: "El abono debe ser mayor a cero" };
    }

    if (!data.destinationAccountId?.trim()) {
      return { ok: false, error: "Selecciona la cuenta destino del cobro" };
    }

    await processInstallmentPayment({
      installmentId: data.installmentId,
      amount: data.amount,
      paymentDate: new Date(data.paymentDate),
      destinationAccountId: data.destinationAccountId,
      userId,
      notes: data.notes,
    });

    revalidateBusiness(installment.sale.business.slug);
    revalidatePath("/accounts");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No se pudo registrar el abono",
    };
  }
}

/** @deprecated Usar processInstallmentPaymentAction */
export async function payInstallmentAction(data: {
  installmentId: string;
  amount: number;
  paymentDate: string;
  notes?: string;
}) {
  const result = await processInstallmentPaymentAction({
    installmentId: data.installmentId,
    amount: data.amount,
    destinationAccountId: "BUSINESS_CASH",
    paymentDate: data.paymentDate,
    notes: data.notes,
  });
  if (!result.ok) throw new Error(result.error);
}

export async function recordCapitalTransfer(data: {
  businessId: string;
  type: CapitalTransferType;
  personalAccountId: string;
  amount: number;
  transferDate: string;
  notes?: string;
}) {
  const userId = await getDefaultUserId();
  const business = await prisma.business.findFirstOrThrow({
    where: { id: data.businessId, userId },
  });

  const account = await prisma.account.findFirstOrThrow({
    where: { id: data.personalAccountId, userId },
  });

  if (data.amount <= 0) throw new Error("El monto debe ser mayor a cero");

  const transferDate = parseTransferDate(data.transferDate);

  await prisma.$transaction(async (tx) => {
    const isInvestment = data.type === "OWNER_INVESTMENT";

    if (!isInvestment) {
      await assertSufficientCash(tx, data.businessId, data.amount);
    }

    const entry = await postJournalEntry(tx, {
      businessId: data.businessId,
      entryDate: transferDate,
      description: isInvestment
        ? "Inversión del dueño"
        : "Retiro de utilidades",
      lines: isInvestment
        ? [
            { code: "1100", debit: data.amount },
            { code: "3100", credit: data.amount },
          ]
        : [
            { code: "3100", debit: data.amount },
            { code: "1100", credit: data.amount },
          ],
    });

    const transfer = await tx.capitalTransfer.create({
      data: {
        businessId: data.businessId,
        userId,
        type: data.type,
        amount: data.amount,
        transferDate,
        personalAccountId: data.personalAccountId,
        journalEntryId: entry.id,
        notes: data.notes,
      },
    });

    await recordBusinessTransaction(tx, {
      businessId: data.businessId,
      type: isInvestment ? "CAPITAL_INJECTION" : "OWNER_WITHDRAWAL",
      amount: data.amount,
      cashEffect: isInvestment ? data.amount : -data.amount,
      transactionDate: transferDate,
      description: isInvestment ? "Inversión del dueño" : "Retiro de utilidades",
      journalEntryId: entry.id,
      capitalTransferId: transfer.id,
    });

    await tx.account.update({
      where: { id: account.id },
      data: {
        balance: isInvestment
          ? { decrement: data.amount }
          : { increment: data.amount },
      },
    });
  });

  revalidateBusiness(business.slug);
}

function parseTransferDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`);
  }
  return new Date(value);
}

export async function createBusinessExpenseAction(data: {
  businessId: string;
  categoryId: string;
  amount: number;
  expenseDate: string;
  description?: string;
}) {
  const userId = await getDefaultUserId();
  const business = await prisma.business.findFirstOrThrow({
    where: { id: data.businessId, userId },
  });

  await prisma.$transaction(async (tx) => {
    await assertSufficientCash(tx, data.businessId, data.amount);

    const entry = await postJournalEntry(tx, {
      businessId: data.businessId,
      entryDate: new Date(data.expenseDate),
      description: data.description ?? "Gasto operativo",
      lines: [
        { code: "5200", debit: data.amount },
        { code: "1100", credit: data.amount },
      ],
    });

    const expense = await tx.businessExpense.create({
      data: {
        businessId: data.businessId,
        categoryId: data.categoryId,
        amount: data.amount,
        expenseDate: new Date(data.expenseDate),
        description: data.description,
        journalEntryId: entry.id,
      },
    });

    await recordBusinessTransaction(tx, {
      businessId: data.businessId,
      type: "OPERATING_EXPENSE",
      amount: data.amount,
      cashEffect: -data.amount,
      transactionDate: new Date(data.expenseDate),
      description: data.description ?? "Gasto operativo",
      journalEntryId: entry.id,
      expenseId: expense.id,
    });
  });

  revalidateBusiness(business.slug);
}
