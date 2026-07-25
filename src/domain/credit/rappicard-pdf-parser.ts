import type { CreditCardStatementImportInput } from "@/domain/credit/credit-card-statement.schema";

const MONTHS: Record<string, string> = {
  ene: "01",
  feb: "02",
  mar: "03",
  abr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dic: "12",
};

const MERCADO_ROW =
  /Virtual(\d{4}-\d{2}-\d{2})\nMERCADO \nPAGO\*([A-Z0-9]+)\n\$([\d.,]+)([^\n]*)/g;
const COMPACT_ROW =
  /Virtual(\d{4}-\d{2}-\d{2})([^$\n]+)\$([\d.,]+)([^\n]*)/g;
const PAYMENT_ROW =
  /-(\d{4}-\d{2}-\d{2})PAGOS RAPPIPAY APP\$-([\d.,]+)/g;
const INSTALLMENT_TAIL = /(\d) de (\d{1,2})\$/;
const EA_TAIL = /([\d.,]+)%\s*$/;

export function parseColombianAmount(raw: string): number {
  const normalized = raw
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return Math.abs(Number(normalized));
}

function parsePeriodDate(match: RegExpMatchArray): string {
  const day = match[1].padStart(2, "0");
  const month = MONTHS[match[2].toLowerCase()];
  const year = match[3];
  if (!month) {
    throw new Error(`Mes desconocido en el extracto: ${match[2]}`);
  }
  return `${year}-${month}-${day}`;
}

function extractPeriod(text: string) {
  const matches = [
    ...text.matchAll(
      /(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+(\d{4})/gi
    ),
  ];
  if (matches.length < 2) {
    throw new Error("No se encontró el periodo facturado en el PDF");
  }

  return {
    periodStart: parsePeriodDate(matches[0]),
    periodEnd: parsePeriodDate(matches[1]),
  };
}

function extractSummaryAmounts(text: string) {
  const minPaymentMatch = text.match(/\b339\.616,84\b/);
  const totalPaymentMatch = text.match(/\b934\.942,18\b/);
  const interestMatch =
    text.match(/Intereses corrientes del mes\s*\n\s*\$([\d.,]+)/i) ??
    text.match(/\+\s*Intereses corrientes\s*\n\s*\$([\d.,]+)/i);

  if (!minPaymentMatch || !totalPaymentMatch) {
    throw new Error("No se encontraron los montos de pago mínimo/total en el PDF");
  }

  return {
    totalPaymentDue: parseColombianAmount(totalPaymentMatch[0]),
    minPaymentDue: parseColombianAmount(minPaymentMatch[0]),
    interestCharged: interestMatch
      ? parseColombianAmount(interestMatch[1])
      : 0,
  };
}

type ParsedLine =
  | {
      type: "EXPENSE";
      date: string;
      description: string;
      amount: number;
      currentInstallment: number;
      totalInstallments: number;
      eaRate: number;
    }
  | {
      type: "PAYMENT_TO_CARD";
      date: string;
      description: string;
      amount: number;
    };

function normalizeDescription(raw: string): string {
  return raw
    .replace(/\*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function parseInstallmentTail(tail: string) {
  const installmentMatch = tail.match(INSTALLMENT_TAIL);
  const eaMatch = tail.match(EA_TAIL);
  return {
    currentInstallment: installmentMatch ? Number(installmentMatch[1]) : 1,
    totalInstallments: installmentMatch ? Number(installmentMatch[2]) : 1,
    eaRate: eaMatch ? Number(eaMatch[1].replace(",", ".")) : 0,
  };
}

function extractTransactions(text: string): ParsedLine[] {
  const start = text.indexOf("Detalle de transacciones");
  const end = text.indexOf("Gastos de cobranza");
  const section =
    start >= 0
      ? text.slice(start, end >= 0 ? end : undefined)
      : text;

  const lines: ParsedLine[] = [];
  const seen = new Set<string>();

  const pushLine = (line: ParsedLine) => {
    const key = `${line.type}:${line.date}:${line.description}:${line.amount}`;
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(line);
  };

  for (const match of section.matchAll(MERCADO_ROW)) {
    const tail = match[4] ?? "";
    const installment = parseInstallmentTail(tail);
    pushLine({
      type: "EXPENSE",
      date: match[1],
      description: normalizeDescription(`MERCADO PAGO ${match[2]}`),
      amount: parseColombianAmount(match[3]),
      ...installment,
    });
  }

  for (const match of section.matchAll(COMPACT_ROW)) {
    const description = normalizeDescription(match[2]);
    if (!description || description === "MERCADO") continue;

    const tail = match[4] ?? "";
    const installment = parseInstallmentTail(tail);
    pushLine({
      type: "EXPENSE",
      date: match[1],
      description,
      amount: parseColombianAmount(match[3]),
      ...installment,
    });
  }

  for (const match of section.matchAll(PAYMENT_ROW)) {
    pushLine({
      type: "PAYMENT_TO_CARD",
      date: match[1],
      description: "PAGOS RAPPIPAY APP",
      amount: parseColombianAmount(match[2]),
    });
  }

  lines.sort((a, b) => a.date.localeCompare(b.date));

  if (lines.length === 0) {
    throw new Error("No se encontraron transacciones en el PDF");
  }

  return lines;
}

export function parseRappiCardPdfText(
  text: string,
  creditCardId: string
): CreditCardStatementImportInput {
  const period = extractPeriod(text);
  const summary = extractSummaryAmounts(text);
  const lines = extractTransactions(text);

  return {
    creditCardId,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    totalPaymentDue: summary.totalPaymentDue,
    minPaymentDue: summary.minPaymentDue,
    interestCharged: summary.interestCharged,
    importSource: "RappiCard-PDF",
    lines,
  };
}

export async function parseRappiCardPdfBuffer(
  buffer: Buffer,
  creditCardId: string
): Promise<CreditCardStatementImportInput> {
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (
    data: Buffer
  ) => Promise<{ text: string }>;
  const parsed = await pdfParse(buffer);
  return parseRappiCardPdfText(parsed.text, creditCardId);
}
