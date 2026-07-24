import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessTransactionType } from "@prisma/client";
import { toNumber } from "@/lib/decimal";
import { getLedgerBalance } from "@/domain/business/journal.service";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type BusinessCashSummary = {
  capitalInjected: number;
  cashCollections: number;
  supplierPayments: number;
  operatingExpenses: number;
  ownerWithdrawals: number;
  computedCash: number;
  ledgerCash: number;
  accountsPayable: number;
  isConsistent: boolean;
};

const CASH_ACCOUNT = "1100";
const PAYABLES_ACCOUNT = "2100";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Impide que la caja (1100) quede negativa tras un egreso. */
export async function assertSufficientCash(
  tx: DbClient,
  businessId: string,
  cashOutflow: number
): Promise<void> {
  if (cashOutflow <= 0) return;

  const available = await getLedgerBalance(tx, businessId, CASH_ACCOUNT);
  if (cashOutflow > available + 0.01) {
    throw new Error(
      `Caja insuficiente. Disponible: ${available.toLocaleString("es-CO")} COP · ` +
        `Requerido: ${cashOutflow.toLocaleString("es-CO")} COP. ` +
        `Inyecta capital o registra el saldo como deuda al proveedor (CxP).`
    );
  }
}

/**
 * Calcula el balance de caja con partida doble:
 * Caja = (Capital inyectado + Cobros) − (Pagos a proveedores + Gastos operativos + Retiros)
 *
 * `ledgerCash` (cuenta 1100) es la fuente de verdad; `computedCash` debe coincidir.
 */
export async function computeBusinessCashBalance(
  tx: DbClient,
  businessId: string
): Promise<BusinessCashSummary> {
  const [ledgerCash, accountsPayable, capitalAgg, capitalTxAgg, txAgg] = await Promise.all([
    getLedgerBalance(tx, businessId, CASH_ACCOUNT),
    getLedgerBalance(tx, businessId, PAYABLES_ACCOUNT),
    tx.capitalTransfer.aggregate({
      where: { businessId, type: "OWNER_INVESTMENT" },
      _sum: { amount: true },
    }),
    tx.businessTransaction.aggregate({
      where: { businessId, type: "CAPITAL_INJECTION" },
      _sum: { amount: true },
    }),
    tx.businessTransaction.groupBy({
      by: ["type"],
      where: { businessId },
      _sum: { amount: true, cashEffect: true },
    }),
  ]);

  const capitalFromTx = toNumber(capitalTxAgg._sum.amount);
  let capitalInjected =
    capitalFromTx > 0 ? capitalFromTx : toNumber(capitalAgg._sum.amount);
  let cashCollections = 0;
  let supplierPayments = 0;
  let operatingExpenses = 0;
  let ownerWithdrawals = 0;

  for (const row of txAgg) {
    const amount = toNumber(row._sum.amount);
    const cashEffect = toNumber(row._sum.cashEffect);

    switch (row.type as BusinessTransactionType) {
      case "CAPITAL_INJECTION":
        break;
      case "CASH_SALE":
        cashCollections += amount;
        break;
      case "INSTALLMENT_PAYMENT":
        cashCollections += cashEffect;
        break;
      case "CREDIT_SALE":
        cashCollections += Math.max(cashEffect, 0);
        break;
      case "SUPPLIER_PURCHASE":
        supplierPayments += Math.abs(Math.min(cashEffect, 0));
        break;
      case "OPERATING_EXPENSE":
        operatingExpenses += amount;
        break;
      case "OWNER_WITHDRAWAL":
        ownerWithdrawals += amount;
        break;
      default:
        break;
    }
  }

  const computedCash = roundMoney(
    capitalInjected + cashCollections - supplierPayments - operatingExpenses - ownerWithdrawals
  );

  return {
    capitalInjected: roundMoney(capitalInjected),
    cashCollections: roundMoney(cashCollections),
    supplierPayments: roundMoney(supplierPayments),
    operatingExpenses: roundMoney(operatingExpenses),
    ownerWithdrawals: roundMoney(ownerWithdrawals),
    computedCash,
    ledgerCash: roundMoney(ledgerCash),
    accountsPayable: roundMoney(accountsPayable),
    isConsistent: Math.abs(computedCash - ledgerCash) <= 0.02,
  };
}

export async function getAvailableCash(
  tx: DbClient,
  businessId: string
): Promise<number> {
  return getLedgerBalance(tx, businessId, CASH_ACCOUNT);
}
