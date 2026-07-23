/** Plazos MSI típicos en Colombia. */
export const MSI_INSTALLMENT_OPTIONS = [3, 6, 9] as const;

export type MsiTerm = (typeof MSI_INSTALLMENT_OPTIONS)[number];

export function isMsiTerm(value: number): value is MsiTerm {
  return (MSI_INSTALLMENT_OPTIONS as readonly number[]).includes(value);
}

export function computeInstallmentAmount(
  totalAmount: number,
  totalInstallments: number
): number {
  if (totalInstallments <= 0) return totalAmount;
  return Math.round((totalAmount / totalInstallments) * 100) / 100;
}
