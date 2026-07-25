import { z } from "zod";

export const creditCardPaymentSchema = z.object({
  sourceAccountId: z.string().min(1, "Selecciona la cuenta de origen"),
  creditCardId: z.string().min(1, "Selecciona la tarjeta"),
  amount: z.coerce.number().positive("El monto debe ser mayor a cero"),
  paymentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
  notes: z.string().optional(),
});

export type CreditCardPaymentInput = z.infer<typeof creditCardPaymentSchema>;

export type CreditCardPaymentResult =
  | {
      ok: true;
      transferGroupId: string;
      sourceTransactionId: string;
      cardPaymentTransactionId: string;
      newAccountBalance: number;
      newCardBalance: number;
    }
  | { ok: false; error: string };

export function parseCreditCardPaymentInput(
  data: unknown
):
  | { success: true; data: CreditCardPaymentInput }
  | { success: false; error: string } {
  const parsed = creditCardPaymentSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Datos inválidos" };
  }
  return { success: true, data: parsed.data };
}
