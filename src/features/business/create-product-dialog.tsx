"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, PackagePlus, Plus } from "lucide-react";
import {
  createBusinessProduct,
  restockProduct,
} from "@/actions/business.actions";
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
import { formatCurrency } from "@/lib/format";
import type { BusinessProductData } from "@/types";

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

type RestockDialogProps = {
  businessId: string;
  product: BusinessProductData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function RestockDialog({
  businessId,
  product,
  open,
  onOpenChange,
}: RestockDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState(String(product.unitCost || 0));
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (next) {
      setQuantity("1");
      setUnitCost(String(product.unitCost || 0));
      setError(null);
    }
    onOpenChange(next);
  }

  function submit(addQty: number) {
    if (addQty <= 0) {
      setError("La cantidad debe ser mayor a cero");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await restockProduct({
          businessId,
          productId: product.id,
          quantity: addQty,
          unitCost: Number(unitCost) || 0,
        });
        handleOpenChange(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al actualizar stock");
      }
    });
  }

  const quickAdds = [1, 5, 10];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Actualizar stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <p className="font-medium">{product.name}</p>
            <p className="text-muted-foreground">
              Stock actual: <strong>{product.stock}</strong> und · Costo:{" "}
              {formatCurrency(product.unitCost)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickAdds.map((n) => (
              <Button
                key={n}
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => submit(n)}
              >
                +{n}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="restock-qty">Unidades a agregar</Label>
            <Input
              id="restock-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="restock-cost">Costo unitario (COGS)</Label>
            <Input
              id="restock-cost"
              type="number"
              min={0}
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
          </div>
          {quantity && Number(quantity) > 0 && (
            <p className="text-xs text-muted-foreground">
              Nuevo stock: {product.stock + Number(quantity)} und · Entrada inventario:{" "}
              {formatCurrency(Number(quantity) * (Number(unitCost) || 0))}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            disabled={pending || !quantity || Number(quantity) <= 0}
            onClick={() => submit(Number(quantity))}
          >
            {pending ? "Guardando..." : "Agregar al stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ProductListProps = {
  businessId: string;
  products: BusinessProductData[];
};

export function ProductList({ businessId, products }: ProductListProps) {
  const [restockProductId, setRestockProductId] = useState<string | null>(null);
  const selectedProduct = products.find((p) => p.id === restockProductId);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center text-sm text-muted-foreground">
        <Package className="mb-2 h-8 w-8 opacity-40" />
        Sin productos registrados
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {products.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{p.name}</p>
              <p className="text-muted-foreground">
                Stock: <strong>{p.stock}</strong> und
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="font-medium">{formatCurrency(p.salePrice)}</p>
                <p className="text-xs text-muted-foreground">
                  Valor: {formatCurrency(p.inventoryValue)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => setRestockProductId(p.id)}
              >
                <PackagePlus className="mr-1 h-4 w-4" />
                Stock
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {selectedProduct && (
        <RestockDialog
          businessId={businessId}
          product={selectedProduct}
          open={restockProductId !== null}
          onOpenChange={(open) => !open && setRestockProductId(null)}
        />
      )}
    </>
  );
}
