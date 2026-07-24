/** Identificador virtual para la caja del negocio (cuenta contable 1100). */
export const BUSINESS_CASH_DESTINATION = "BUSINESS_CASH";

export function isBusinessCashDestination(destinationAccountId: string): boolean {
  return destinationAccountId === BUSINESS_CASH_DESTINATION;
}
