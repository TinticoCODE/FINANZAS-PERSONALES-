"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { recordCapitalTransfer } from "@/actions/business.actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const transferTypeLabels = {
  OWNER_INVESTMENT: "Inversión (personal → negocio)",
  OWNER_WITHDRAWAL: "Retiro de utilidades (negocio → personal)",
} as const;

type CapitalTransferDialogProps = {
  businessId: string;
  accounts: { id: string; name: string }[];
};

export function CapitalTransferDialog({
  businessId,
  accounts,
}: CapitalTransferDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<string>("OWNER_INVESTMENT");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const selectedAccountName =
    accounts.find((a) => a.id === accountId)?.name ?? "Selecciona cuenta";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!accountId) {
      setError("Selecciona una cuenta personal");
      return;
    }

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await recordCapitalTransfer({
          businessId,
          type: type as "OWNER_INVESTMENT" | "OWNER_WITHDRAWAL",
          personalAccountId: accountId,
          amount: Number(formData.get("amount")),
          transferDate:
            (formData.get("transferDate") as string) ||
            new Date().toISOString().slice(0, 10),
          notes: (formData.get("notes") as string) || undefined,
        });
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrar transferencia");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Capital
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Transferencia de capital</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {accounts.length === 0 && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                Crea una cuenta personal en Cuentas antes de transferir capital.
              </p>
            )}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tipo de transferencia">
                    {transferTypeLabels[type as keyof typeof transferTypeLabels]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER_INVESTMENT">
                    {transferTypeLabels.OWNER_INVESTMENT}
                  </SelectItem>
                  <SelectItem value="OWNER_WITHDRAWAL">
                    {transferTypeLabels.OWNER_WITHDRAWAL}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cuenta personal</Label>
              <Select value={accountId} onValueChange={(v) => v && setAccountId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona cuenta">
                    {selectedAccountName}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <Input id="amount" name="amount" type="number" min={1} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferDate">Fecha</Label>
              <Input
                id="transferDate"
                name="transferDate"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !accountId}>
              {pending ? "Procesando..." : "Registrar transferencia"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
