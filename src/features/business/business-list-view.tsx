"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { createBusiness } from "@/actions/business.actions";
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
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/format";
import { businessTypeLabels } from "@/lib/labels";
import type { BusinessListItem } from "@/types";

type BusinessListViewProps = {
  businesses: BusinessListItem[];
};

export function BusinessListView({ businesses }: BusinessListViewProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [businessType, setBusinessType] = useState<string>("RETAIL");

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const name = formData.get("name") as string;
      const description = (formData.get("description") as string) || undefined;
      const result = await createBusiness({
        name,
        businessType: businessType as "RETAIL" | "MANUFACTURING" | "SERVICE",
        description,
      });
      setOpen(false);
      router.push(`/business/${result.slug}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emprendimientos"
        description="Ledger comercial aislado — inventario, ventas a crédito y capital propio"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo negocio
                </Button>
              }
            />
            <DialogContent>
              <form action={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Crear emprendimiento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input id="name" name="name" required placeholder="Hardware Tech" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de negocio</Label>
                    <Select value={businessType} onValueChange={(v) => v && setBusinessType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(businessTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea id="description" name="description" rows={2} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={pending}>
                    {pending ? "Creando..." : "Crear negocio"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {businesses.length === 0 ? (
        <EmptyState
          title="Sin emprendimientos"
          description="Crea tu primer negocio para llevar inventario, ventas a crédito y utilidades separadas de tus finanzas personales."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {businesses.map((b) => (
            <Link
              key={b.id}
              href={`/business/${b.slug}`}
              className="rounded-2xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{b.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {businessTypeLabels[b.businessType as keyof typeof businessTypeLabels]}
                  </p>
                </div>
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Capital</p>
                  <p className="font-medium">{formatCurrency(b.ownerCapital)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Caja</p>
                  <p className="font-medium">{formatCurrency(b.cashOnHand)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CxC</p>
                  <p className="font-medium">{formatCurrency(b.accountsReceivable)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
