import { z } from "zod";

export const createTransactionSchema = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().min(1, "Selecciona una categoría"),
  creditCardId: z.string().optional(),
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.coerce.number().positive("El monto debe ser mayor a cero"),
  description: z.string().optional(),
  paymentMethod: z.enum(["DEBIT", "CREDIT", "CASH", "TRANSFER"]),
  tags: z.array(z.string()).optional(),
  date: z.string().optional(),
  installments: z.coerce.number().int().min(1).max(48).optional(),
  hasZeroInterest: z.boolean().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export type TransactionActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function parseCreateTransactionInput(
  data: unknown
):
  | { success: true; data: CreateTransactionInput }
  | { success: false; error: string; fieldErrors: Record<string, string> } {
  const parsed = createTransactionSchema.safeParse(data);
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0]?.toString() ?? "form";
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }

  return {
    success: false,
    error: "Revisa los datos del formulario",
    fieldErrors,
  };
}
