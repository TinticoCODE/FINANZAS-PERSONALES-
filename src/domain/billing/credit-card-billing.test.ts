import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCurrentBillingCycle,
  getInstallmentPaymentDates,
  getNextCutoffDate,
  getPaymentDueForCycle,
  getUpcomingBillingDates,
} from "./credit-card-billing";
import { localMidnightToUtc } from "./timezone";
import { calculatePaymentToAvoidInterest } from "@/services/credit-card.service";

const TZ = "America/Bogota";

function utcOnLocalDay(parts: { year: number; month: number; day: number }): Date {
  return localMidnightToUtc(
    { year: parts.year, month: parts.month - 1, day: parts.day },
    TZ
  );
}

describe("credit-card-billing", () => {
  it("calcula el próximo corte en el mismo mes si aún no ha pasado", () => {
    const instant = utcOnLocalDay({ year: 2026, month: 7, day: 10 });
    const next = getNextCutoffDate(15, TZ, instant);
    assert.equal(next.getFullYear(), 2026);
    assert.equal(next.getMonth(), 6);
    assert.equal(next.getDate(), 15);
  });

  it("avanza al corte del mes siguiente si hoy ya pasó el día de corte", () => {
    const instant = utcOnLocalDay({ year: 2026, month: 7, day: 20 });
    const next = getNextCutoffDate(15, TZ, instant);
    assert.equal(next.getFullYear(), 2026);
    assert.equal(next.getMonth(), 7);
    assert.equal(next.getDate(), 15);
  });

  it("ajusta el día de corte en febrero cuando el configurado es 31", () => {
    const instant = utcOnLocalDay({ year: 2026, month: 2, day: 5 });
    const next = getNextCutoffDate(31, TZ, instant);
    assert.equal(next.getFullYear(), 2026);
    assert.equal(next.getMonth(), 1);
    assert.equal(next.getDate(), 28);
  });

  it("asigna la fecha de pago al mes siguiente cuando vence antes del corte", () => {
    const cycle = getCurrentBillingCycle(25, TZ, utcOnLocalDay({ year: 2026, month: 7, day: 10 }));
    const due = getPaymentDueForCycle(cycle.cycleEnd, 25, 5);
    assert.equal(due.getFullYear(), 2026);
    assert.equal(due.getMonth(), 7);
    assert.equal(due.getDate(), 5);
  });

  it("genera fechas de cuota MSI según ciclo de la compra", () => {
    const purchase = utcOnLocalDay({ year: 2026, month: 6, day: 10 });
    const dates = getInstallmentPaymentDates(purchase, 4, 25, 5, TZ);
    assert.equal(dates.length, 4);
    assert.equal(dates[0].getMonth(), 6);
    assert.equal(dates[1].getMonth(), 7);
    assert.equal(dates[2].getMonth(), 8);
    assert.equal(dates[3].getMonth(), 9);
  });

  it("expone días hasta corte y pago recalculados desde hoy", () => {
    const instant = utcOnLocalDay({ year: 2026, month: 7, day: 10 });
    const upcoming = getUpcomingBillingDates(15, 25, TZ, instant);
    assert.equal(upcoming.daysToCutoff, 5);
    assert.ok(upcoming.daysToPayment >= 0);
    assert.equal(upcoming.activeCycle.cycleEnd.getDate(), 15);
  });
});

describe("calculatePaymentToAvoidInterest", () => {
  it("suma compras a 1 cuota del ciclo actual y cuotas MSI de ciclos previos", () => {
    const instant = utcOnLocalDay({ year: 2026, month: 7, day: 10 });
    const config = { cutOffDate: 15, paymentDueDate: 25, interestRate: 24 };

    const result = calculatePaymentToAvoidInterest(
      config,
      [
        {
          date: utcOnLocalDay({ year: 2026, month: 7, day: 8 }),
          amount: 100_000,
          installments: 1,
        },
        {
          date: utcOnLocalDay({ year: 2026, month: 5, day: 8 }),
          amount: 600_000,
          installments: 6,
          hasZeroInterest: true,
          installmentAmount: 100_000,
        },
      ],
      TZ,
      instant
    );

    assert.equal(result.singleInstallmentCurrentCycle, 100_000);
    assert.equal(result.msiInstallmentsDue, 100_000);
    assert.equal(result.total, 200_000);
  });
});
