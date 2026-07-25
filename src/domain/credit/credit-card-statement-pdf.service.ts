import {
  parseCreditCardStatementImport,
  type CreditCardStatementImportResult,
} from "@/domain/credit/credit-card-statement.schema";
import { importCreditCardStatementData } from "@/domain/credit/credit-card-statement-import.service";
import { parseRappiCardStatementPdf } from "@/domain/credit/rappicard-statement-parser";
import {
  PdfPasswordIncorrectError,
  PdfPasswordRequiredError,
} from "@/domain/credit/pdf/pdf-text-extractor";
import { getDefaultUserId, getUserTimezone } from "@/lib/user";

export type ImportStatementPdfOptions = {
  creditCardId: string;
  buffer: Buffer;
  password?: string;
};

export async function processCreditCardStatementPdf(
  options: ImportStatementPdfOptions
): Promise<CreditCardStatementImportResult> {
  try {
    const parsed = await parseRappiCardStatementPdf(
      options.buffer,
      options.creditCardId,
      { password: options.password }
    );

    const { fileHash, ...payload } = parsed;
    const validation = parseCreditCardStatementImport({
      ...payload,
      sourceFileHash: fileHash,
    });

    if (!validation.success) {
      return {
        ok: false,
        error: validation.error,
        fieldErrors: validation.fieldErrors,
      };
    }

    const userId = await getDefaultUserId();
    const timezone = await getUserTimezone();
    const result = await importCreditCardStatementData(
      userId,
      timezone,
      validation.data
    );

    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof PdfPasswordRequiredError) {
      return { ok: false, error: err.message };
    }
    if (err instanceof PdfPasswordIncorrectError) {
      return { ok: false, error: err.message };
    }
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    throw err;
  }
}
