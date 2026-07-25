"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import {
  importCreditCardStatement,
  importCreditCardStatementPdf,
} from "@/actions/finance.actions";
import { RAPPICARD_JUN_JUL_2026_SAMPLE } from "@/domain/credit/credit-card-statement.schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import type { CreditCardData } from "@/types";

type ImportStatementDialogProps = {
  cards: CreditCardData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function buildTemplatePayload(creditCardId: string) {
  return {
    ...RAPPICARD_JUN_JUL_2026_SAMPLE,
    creditCardId,
  };
}

function looksLikePdfText(value: string): boolean {
  return /extracto de tarjeta|davivienda|rappicard|detalle de transacciones/i.test(
    value
  );
}

export function ImportStatementDialog({
  cards,
  open,
  onOpenChange,
}: ImportStatementDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [creditCardId, setCreditCardId] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfPassword, setPdfPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedCard = cards.find((card) => card.id === creditCardId);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSuccess(null);
    setPdfFileName(null);
    setPdfPassword("");
    if (cards.length === 1) {
      setCreditCardId(cards[0].id);
    }
  }, [open, cards]);

  useEffect(() => {
    if (creditCardId && !jsonText.trim()) {
      setJsonText(JSON.stringify(buildTemplatePayload(creditCardId), null, 2));
    }
  }, [creditCardId, jsonText]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setError(null);
      setSuccess(null);
      setJsonText("");
      setPdfFileName(null);
    setPdfPassword("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (cards.length !== 1) {
        setCreditCardId("");
      }
    }
    onOpenChange(next);
  }

  function handleLoadTemplate() {
    if (!creditCardId) {
      setError("Selecciona la tarjeta antes de cargar la plantilla");
      return;
    }
    setError(null);
    setSuccess(null);
    setJsonText(JSON.stringify(buildTemplatePayload(creditCardId), null, 2));
  }

  function handlePdfChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);
    setSuccess(null);
    setPdfFileName(file?.name ?? null);
  }

  function handlePdfImport() {
    if (!creditCardId) {
      setError("Selecciona la tarjeta antes de importar el PDF");
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Selecciona el archivo PDF del extracto");
      return;
    }

    const formData = new FormData();
    formData.append("creditCardId", creditCardId);
    formData.append("pdf", file);
    if (pdfPassword.trim()) {
      formData.append("password", pdfPassword.trim());
    }

    startTransition(async () => {
      const result = await importCreditCardStatementPdf(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const skipped =
        result.skippedCount > 0
          ? ` (${result.skippedCount} duplicadas omitidas)`
          : "";

      setSuccess(
        `Importados ${result.importedCount} movimientos (${result.expenseCount} consumos, ${result.paymentCount} pagos)${skipped}. Saldo al cierre: ${formatCurrency(result.usedBalanceAtClose)}.`
      );
      router.refresh();
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    let payload: unknown;
    try {
      const trimmed = jsonText.trim();

      if (looksLikePdfText(trimmed)) {
        setError(
          "Pegaste texto del PDF, no JSON. Usa la sección «Importar PDF» arriba y selecciona tu archivo .pdf."
        );
        return;
      }

      payload = JSON.parse(jsonText);
    } catch {
      setError(
        "El JSON no es válido. Revisa comas, comillas y llaves, o importa el PDF directamente."
      );
      return;
    }

    startTransition(async () => {
      const result = await importCreditCardStatement(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess(
        `Importados ${result.importedCount} movimientos (${result.expenseCount} consumos, ${result.paymentCount} pagos). Saldo al cierre: ${formatCurrency(result.usedBalanceAtClose)}.`
      );
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar extracto de tarjeta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-card">Tarjeta</Label>
            <Select
              value={creditCardId}
              onValueChange={(value) => {
                setCreditCardId(value ?? "");
                setJsonText("");
              }}
            >
              <SelectTrigger id="import-card" className="w-full">
                {selectedCard
                  ? `${selectedCard.bank} — ${selectedCard.name} •••• ${selectedCard.lastFourDigits}`
                  : "Selecciona tarjeta"}
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {cards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.bank} — {card.name} •••• {card.lastFourDigits}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
            <div>
              <p className="text-sm font-medium">Importar PDF (recomendado)</p>
              <p className="text-xs text-muted-foreground">
                Sube el extracto RappiCard en PDF; la app lo convierte e importa
                automáticamente.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                ref={fileInputRef}
                id="import-pdf"
                type="file"
                accept="application/pdf,.pdf"
                onChange={handlePdfChange}
                className="cursor-pointer"
              />
              <Button
                type="button"
                disabled={pending || !creditCardId}
                onClick={handlePdfImport}
              >
                {pending ? "Importando..." : "Importar PDF"}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-pdf-password">
                Contraseña del PDF (opcional)
              </Label>
              <Input
                id="import-pdf-password"
                type="password"
                value={pdfPassword}
                onChange={(event) => setPdfPassword(event.target.value)}
                placeholder="Solo si el extracto está protegido"
                autoComplete="off"
              />
            </div>
            {pdfFileName && (
              <p className="text-xs text-muted-foreground">Archivo: {pdfFileName}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="import-json">JSON del extracto (avanzado)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadTemplate}
                disabled={!creditCardId || pending}
              >
                Cargar plantilla RappiCard
              </Button>
            </div>
            <Textarea
              id="import-json"
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              rows={12}
              className="font-mono text-xs"
              placeholder='Pega aquí el JSON con periodStart, periodEnd, lines, etc.'
            />
            <p className="text-xs text-muted-foreground">
              Los movimientos <strong>EXPENSE</strong> incrementan la deuda;{" "}
              <strong>PAYMENT_TO_CARD</strong> la reduce. No pegues texto copiado
              del PDF en este campo.
            </p>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              {success}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending || !creditCardId}>
              {pending ? "Importando..." : "Importar JSON"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ImportStatementTrigger({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-2"
      onClick={onClick}
      disabled={disabled}
    >
      <FileUp className="h-4 w-4" />
      Importar extracto
    </Button>
  );
}
