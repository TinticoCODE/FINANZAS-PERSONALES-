"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { importCreditCardStatement } from "@/actions/finance.actions";
import { RAPPICARD_JUN_JUL_2026_SAMPLE } from "@/domain/credit/credit-card-statement.schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export function ImportStatementDialog({
  cards,
  open,
  onOpenChange,
}: ImportStatementDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creditCardId, setCreditCardId] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedCard = cards.find((card) => card.id === creditCardId);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSuccess(null);
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    let payload: unknown;
    try {
      payload = JSON.parse(jsonText);
    } catch {
      setError("El JSON no es válido. Revisa comas, comillas y llaves.");
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

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="import-json">JSON del extracto</Label>
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
              rows={16}
              className="font-mono text-xs"
              placeholder='Pega aquí el JSON con periodStart, periodEnd, lines, etc.'
              required
            />
            <p className="text-xs text-muted-foreground">
              Los movimientos <strong>EXPENSE</strong> incrementan la deuda;{" "}
              <strong>PAYMENT_TO_CARD</strong> la reduce. Todo se guarda en una
              sola transacción atómica.
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
              {pending ? "Importando..." : "Importar extracto"}
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
