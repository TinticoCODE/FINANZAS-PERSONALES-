import { z } from "zod";

/** Movimiento de consumo en el extracto (incrementa deuda de la tarjeta). */
export const statementExpenseLineSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
  description: z.string().min(1, "Descripción requerida"),
  amount: z.coerce.number().positive("El monto debe ser mayor a cero"),
  type: z.literal("EXPENSE"),
  currentInstallment: z.coerce.number().int().min(1).max(48),
  totalInstallments: z.coerce.number().int().min(1).max(48),
  eaRate: z.coerce.number().min(0).max(100),
  categoryId: z.string().optional(),
});

/** Abono registrado en el extracto (reduce deuda de la tarjeta). */
export const statementPaymentLineSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
  description: z.string().min(1, "Descripción requerida"),
  amount: z.coerce.number().positive("El monto debe ser mayor a cero"),
  type: z.literal("PAYMENT_TO_CARD"),
  categoryId: z.string().optional(),
});

export const creditCardStatementLineSchema = z.discriminatedUnion("type", [
  statementExpenseLineSchema,
  statementPaymentLineSchema,
]);

export const creditCardStatementImportSchema = z
  .object({
    creditCardId: z.string().min(1, "Selecciona la tarjeta"),
    periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    totalPaymentDue: z.coerce.number().nonnegative(),
    minPaymentDue: z.coerce.number().nonnegative(),
    interestCharged: z.coerce.number().nonnegative().default(0),
    importSource: z.string().default("RappiCard"),
    sourceFileHash: z.string().optional(),
    expenseCategoryId: z.string().optional(),
    paymentCategoryId: z.string().optional(),
    lines: z.array(creditCardStatementLineSchema).min(1, "El extracto no tiene movimientos"),
  })
  .superRefine((data, ctx) => {
    for (const [index, line] of data.lines.entries()) {
      if (line.type !== "EXPENSE") continue;
      if (line.currentInstallment > line.totalInstallments) {
        ctx.addIssue({
          code: "custom",
          message: "La cuota actual no puede superar el total de cuotas",
          path: ["lines", index, "currentInstallment"],
        });
      }
    }
  });

export type CreditCardStatementImportInput = z.infer<
  typeof creditCardStatementImportSchema
>;
export type CreditCardStatementLineInput = z.infer<
  typeof creditCardStatementLineSchema
>;
export type StatementExpenseLineInput = z.infer<typeof statementExpenseLineSchema>;
export type StatementPaymentLineInput = z.infer<typeof statementPaymentLineSchema>;

export type CreditCardStatementImportResult =
  | {
      ok: true;
      statementId: string;
      importedCount: number;
      skippedCount: number;
      expenseCount: number;
      paymentCount: number;
      usedBalanceAtClose: number;
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function parseCreditCardStatementImport(
  data: unknown
):
  | { success: true; data: CreditCardStatementImportInput }
  | { success: false; error: string; fieldErrors: Record<string, string> } {
  const parsed = creditCardStatementImportSchema.safeParse(data);
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".") || "form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }

  return {
    success: false,
    error: "Revisa los datos del extracto",
    fieldErrors,
  };
}

/** Payload de prueba — RappiCard 19 jun 2026 → 20 jul 2026 */
export const RAPPICARD_JUN_JUL_2026_SAMPLE: CreditCardStatementImportInput = {
  creditCardId: "REEMPLAZAR_CON_ID_TARJETA",
  periodStart: "2026-06-19",
  periodEnd: "2026-07-20",
  totalPaymentDue: 934_942.18,
  minPaymentDue: 339_616.84,
  interestCharged: 6_307.16,
  importSource: "RappiCard",
  lines: [
    {
      date: "2026-05-13",
      description: "MERCADO PAGO MUNDOSONI",
      amount: 259_900,
      currentInstallment: 3,
      totalInstallments: 3,
      eaRate: 0,
      type: "EXPENSE",
    },
    {
      date: "2026-05-29",
      description: "MERCADO PAGO INVICTACO",
      amount: 309_900,
      currentInstallment: 2,
      totalInstallments: 3,
      eaRate: 28.17,
      type: "EXPENSE",
    },
    {
      date: "2026-06-08",
      description: "MERCADO PAGO MERCADOLI",
      amount: 694_046,
      currentInstallment: 2,
      totalInstallments: 8,
      eaRate: 0,
      type: "EXPENSE",
    },
    {
      date: "2026-06-28",
      description: "HOTMART DL",
      amount: 9_300,
      currentInstallment: 1,
      totalInstallments: 3,
      eaRate: 28.78,
      type: "EXPENSE",
    },
    {
      date: "2026-06-28",
      description: "PAGOS RAPPIPAY APP",
      amount: 426_614.75,
      type: "PAYMENT_TO_CARD",
    },
    {
      date: "2026-06-28",
      description: "EBN HOTMART",
      amount: 9_300,
      currentInstallment: 1,
      totalInstallments: 3,
      eaRate: 28.78,
      type: "EXPENSE",
    },
    {
      date: "2026-06-28",
      description: "HOTMART DL",
      amount: 25_392,
      currentInstallment: 1,
      totalInstallments: 3,
      eaRate: 28.78,
      type: "EXPENSE",
    },
    {
      date: "2026-07-04",
      description: "DOLLARCITY PLAZA MALAM",
      amount: 8_000,
      currentInstallment: 1,
      totalInstallments: 1,
      eaRate: 0,
      type: "EXPENSE",
    },
    {
      date: "2026-07-06",
      description: "GOOGLE Tango Live Str",
      amount: 1_650,
      currentInstallment: 1,
      totalInstallments: 1,
      eaRate: 0,
      type: "EXPENSE",
    },
    {
      date: "2026-07-13",
      description: "SHOPIFY 557576953",
      amount: 3_388.01,
      currentInstallment: 1,
      totalInstallments: 1,
      eaRate: 0,
      type: "EXPENSE",
    },
  ],
};
