/** Plazos MSI frecuentes en Colombia (sugerencias UI, no límite de negocio). */
export const MSI_INSTALLMENT_SUGGESTIONS = [2, 3, 6, 9, 12, 18, 24] as const;

export const MSI_INSTALLMENT_OPTIONS = MSI_INSTALLMENT_SUGGESTIONS;

export type MsiTerm = (typeof MSI_INSTALLMENT_SUGGESTIONS)[number];

const MAX_INSTALLMENTS = 48;
const MIN_MSI_INSTALLMENTS = 2;

/** MSI = compra diferida marcada sin interés (cualquier plazo ≥ 2 meses). */
export function isMsiPurchase(
  installments: number,
  hasZeroInterest: boolean
): boolean {
  return hasZeroInterest && installments >= MIN_MSI_INSTALLMENTS;
}

/** @deprecated Usar isMsiPurchase. Mantenido por compatibilidad con importaciones legacy. */
export function isMsiTerm(value: number): boolean {
  return value >= MIN_MSI_INSTALLMENTS && value <= MAX_INSTALLMENTS;
}

export function computeInstallmentAmount(
  totalAmount: number,
  totalInstallments: number
): number {
  if (totalInstallments <= 0) return totalAmount;
  return Math.round((totalAmount / totalInstallments) * 100) / 100;
}
