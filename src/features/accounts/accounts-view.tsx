"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { AccountType } from "@prisma/client";
import { createAccount, deleteAccount } from "@/actions/finance.actions";
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
import { PageHeader } from "@/components/shared/page-header";
import { AccountList } from "@/features/accounts/account-list";
import { EmptyState } from "@/components/shared/empty-state";
import { accountTypeLabels, defaultAccountColors } from "@/lib/labels";
import type { AccountData } from "@/types";

type AccountsViewProps = {
  accounts: AccountData[];
};

export function AccountsView({ accounts }: AccountsViewProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<AccountType>("CHECKING");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      await createAccount({
        name: formData.get("name") as string,
        type,
        balance: Number(formData.get("balance") || 0),
        color: defaultAccountColors[accounts.length % defaultAccountColors.length],
      });
      setOpen(false);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteAccount(id);
        router.refresh();
      } catch {
        alert("No puedes eliminar una cuenta con transacciones asociadas.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuentas"
        description="Administra tus cuentas bancarias y billeteras digitales"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" className="gap-2" />}>
              <Plus className="h-4 w-4" />
              Nueva cuenta
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva cuenta</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" name="name" placeholder="Ej: Cuenta principal" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={type} onValueChange={(v) => v && setType(v as AccountType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(accountTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="balance">Saldo inicial</Label>
                    <Input id="balance" name="balance" type="number" min="0" step="0.01" defaultValue="0" />
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

      {accounts.length === 0 ? (
        <EmptyState
          title="Sin cuentas"
          description="Crea tu primera cuenta para empezar a registrar movimientos."
          actionLabel="Nueva cuenta"
          onAction={() => setOpen(true)}
        />
      ) : (
        <AccountList accounts={accounts} onDelete={handleDelete} deleting={pending} />
      )}
    </div>
  );
}
