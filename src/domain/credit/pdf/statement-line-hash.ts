import { createHash } from "node:crypto";

const IMPORT_HASH_TAG_PREFIX = "import-hash:";

export type StatementLineHashInput = {
  date: string;
  description: string;
  amount: number;
  type: "EXPENSE" | "PAYMENT_TO_CARD";
};

/** Hash estable por línea: fecha + descripción normalizada + monto + tipo. */
export function computeStatementLineHash(input: StatementLineHashInput): string {
  const payload = [
    input.date,
    input.description.trim().toUpperCase(),
    input.amount.toFixed(2),
    input.type,
  ].join("|");

  return createHash("sha256").update(payload).digest("hex").slice(0, 24);
}

export function statementLineHashTag(hash: string): string {
  return `${IMPORT_HASH_TAG_PREFIX}${hash}`;
}

export function isStatementLineHashTag(tag: string): boolean {
  return tag.startsWith(IMPORT_HASH_TAG_PREFIX);
}

/** SHA-256 del archivo PDF completo (idempotencia a nivel extracto). */
export function computePdfFileHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function pdfFileHashTag(hash: string): string {
  return `import-pdf:${hash.slice(0, 32)}`;
}
