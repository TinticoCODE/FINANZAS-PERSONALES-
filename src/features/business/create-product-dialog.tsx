"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus } from "lucide-react";
import { createBusinessProduct } from "@/actions/business.actions";
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

type CreateProductDialogProps = {
  businessId: string;
  trackInventory: boolean;
};

export function CreateProductDialog({
  businessId,
  trackInventory,
}: CreateProductDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createBusinessProduct({
        businessId,
        name: formData.get("name") as string,
        sku: (formData.get("sku") as string) || undefined,
        salePrice: Number(formData.get("salePrice")),
        initialStock: trackInventory ? Number(formData.get("initialStock") || 0) : 0,
        unitCost: trackInventory ? Number(formData.get("unitCost") || 0) : 0,
        isInventoryTracked: trackInventory,
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Plus className="mr-1 h-4 w-4" />
            Producto
          </Button>
        }
      />
      <DialogContent>
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" name="sku" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice">Precio de venta</Label>
              <Input id="salePrice" name="salePrice" type="number" min={0} required />
            </div>
            {trackInventory && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="initialStock">Stock inicial</Label>
                  <Input id="initialStock" name="initialStock" type="number" min={0} defaultValue={0} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitCost">Costo unitario (COGS)</Label>
                  <Input id="unitCost" name="unitCost" type="number" min={0} defaultValue={0} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProductList({
  products,
}: {
  products: { id: string; name: string; salePrice: number; stock: number; inventoryValue: number }[];
}) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center text-sm text-muted-foreground">
        <Package className="mb-2 h-8 w-8 opacity-40" />
        Sin productos registrados
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {products.map((p) => (
        <li key={p.id} className="flex items-center justify-between py-3 text-sm">
          <div>
            <p className="font-medium">{p.name}</p>
            <p className="text-muted-foreground">Stock: {p.stock}</p>
          </div>
          <div className="text-right">
            <p className="font-medium">${p.salePrice.toLocaleString("es-CO")}</p>
            <p className="text-xs text-muted-foreground">
              Valor: ${p.inventoryValue.toLocaleString("es-CO")}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
