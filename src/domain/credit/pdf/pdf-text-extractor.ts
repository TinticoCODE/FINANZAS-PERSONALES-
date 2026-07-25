import { createHash } from "node:crypto";

export type PdfExtractOptions = {
  password?: string;
};

export type PdfExtractResult = {
  text: string;
  numPages: number;
  wasEncrypted: boolean;
  fileHash: string;
};

export class PdfPasswordRequiredError extends Error {
  constructor() {
    super("El PDF está protegido con contraseña");
    this.name = "PdfPasswordRequiredError";
  }
}

export class PdfPasswordIncorrectError extends Error {
  constructor() {
    super("Contraseña incorrecta para el PDF");
    this.name = "PdfPasswordIncorrectError";
  }
}

/** Normaliza saltos de línea de pdfjs/pdf-parse a un texto parseable con regex. */
export function normalizeStatementPdfText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/Virtual\s*\n+\s*(\d{4}-\d{2}-\d{2})/g, "Virtual$1")
    .replace(/-\s*\n+\s*(\d{4}-\d{2}-\d{2})/g, "-$1")
    .replace(/Virtual(\d{4}-\d{2}-\d{2})(?:[ \t]*\n){2,}/g, "Virtual$1\n")
    .replace(/-(\d{4}-\d{2}-\d{2})(?:[ \t]*\n){2,}/g, "-$1\n")
    .replace(/\n[ \t]*\n[ \t]*(?=\$)/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(
      /Virtual(\d{4}-\d{2}-\d{2})\n([^$\n]+)\n+\$([\d.,]+)/g,
      (_, date, desc, amount) => `Virtual${date}${desc.trim()}$${amount}`
    )
    .replace(
      /-(\d{4}-\d{2}-\d{2})\nPAGOS RAPPIPAY APP\n+\$-([\d.,]+)/gi,
      (_, date, amount) => `-${date}PAGOS RAPPIPAY APP$-${amount}`
    )
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function mapPdfJsError(err: unknown): never {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? Number((err as { code: unknown }).code)
      : undefined;

  // pdfjs PasswordResponses: NEED_PASSWORD = 1, INCORRECT_PASSWORD = 2
  if (code === 1) throw new PdfPasswordRequiredError();
  if (code === 2) throw new PdfPasswordIncorrectError();

  if (err instanceof Error) throw err;
  throw new Error("No se pudo leer el PDF");
}

async function extractWithPdfJs(
  buffer: Buffer,
  password?: string
): Promise<{ text: string; numPages: number; wasEncrypted: boolean }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  try {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      password: password ?? "",
      useSystemFonts: true,
      disableFontFace: true,
    });

    const doc = await loadingTask.promise;
    const parts: string[] = [];

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join("\n");
      parts.push(pageText);
    }

    const metadata = await doc.getMetadata().catch(() => null);
    const wasEncrypted = Boolean(
      metadata &&
        typeof metadata === "object" &&
        "info" in metadata &&
        metadata.info &&
        typeof metadata.info === "object" &&
        "IsAcroFormPresent" in metadata.info
    );

    return {
      text: normalizeStatementPdfText(parts.join("\n")),
      numPages: doc.numPages,
      wasEncrypted,
    };
  } catch (err) {
    mapPdfJsError(err);
  }
}

async function extractWithPdfParse(buffer: Buffer): Promise<{ text: string; numPages: number }> {
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (
    data: Buffer
  ) => Promise<{ text: string; numpages: number }>;

  const parsed = await pdfParse(buffer);
  return {
    text: normalizeStatementPdfText(parsed.text),
    numPages: parsed.numpages,
  };
}

/**
 * Extrae texto de un PDF. Usa pdfjs-dist (soporta contraseña).
 * Si falla sin contraseña, reintenta con pdf-parse como respaldo.
 */
export async function extractPdfText(
  buffer: Buffer,
  options: PdfExtractOptions = {}
): Promise<PdfExtractResult> {
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  try {
    const result = await extractWithPdfJs(buffer, options.password);
    return { ...result, fileHash };
  } catch (err) {
    if (
      err instanceof PdfPasswordRequiredError ||
      err instanceof PdfPasswordIncorrectError
    ) {
      throw err;
    }

    const fallback = await extractWithPdfParse(buffer);
    return {
      text: fallback.text,
      numPages: fallback.numPages,
      wasEncrypted: false,
      fileHash,
    };
  }
}
