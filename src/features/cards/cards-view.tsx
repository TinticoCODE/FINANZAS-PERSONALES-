"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createCreditCard, deleteCreditCard } from "@/actions/finance.actions";
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
import { PageHeader } from "@/components/shared/page-header";
import { CreditCardList } from "@/features/cards/credit-card-list";
import { EmptyState } from "@/components/shared/empty-state";
import type { CreditCardData } from "@/types";

type CardsViewProps = {
  cards: CreditCardData[];
};

export function CardsView({ cards }: CardsViewProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      await createCreditCard({
        bank: formData.get("bank") as string,
        name: formData.get("name") as string,
        lastFourDigits: formData.get("lastFourDigits") as string,
        creditLimit: Number(formData.get("creditLimit")),
        interestRate: Number(formData.get("interestRate") || 0),
        cutOffDate: Number(formData.get("cutOffDate")),
        paymentDueDate: Number(formData.get("paymentDueDate")),
      });
      setOpen(false);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteCreditCard(id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarjetas de crédito"
        description="Administra tus tarjetas, cupos y fechas de pago"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" className="gap-2" />}>
              <Plus className="h-4 w-4" />
              Nueva tarjeta
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva tarjeta</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank">Banco</Label>
                    <Input id="bank" name="bank" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input id="name" name="name" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lastFourDigits">Últimos 4 dígitos</Label>
                    <Input id="lastFourDigits" name="lastFourDigits" maxLength={4} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="creditLimit">Cupo total</Label>
                    <Input id="creditLimit" name="creditLimit" type="number" min="0" required />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cutOffDate">Día de corte</Label>
                    <Input id="cutOffDate" name="cutOffDate" type="number" min="1" max="31" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentDueDate">Día de pago</Label>
                    <Input id="paymentDueDate" name="paymentDueDate" type="number" min="1" max="31" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interestRate">Tasa Efectiva Anual — TEA (%)</Label>
                    <Input id="interestRate" name="interestRate" type="number" min="0" step="0.01" defaultValue="0" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={pending}>
                    {pending ? "Guardando..." : "Guardar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {cards.length === 0 ? (
        <EmptyState
          title="Sin tarjetas"
          description="Agrega tus tarjetas de crédito para hacer seguimiento de cupos y pagos."
          actionLabel="Nueva tarjeta"
          onAction={() => setOpen(true)}
        />
      ) : (
        <CreditCardList cards={cards} onDelete={handleDelete} deleting={pending} />
      )}
    </div>
  );
}
