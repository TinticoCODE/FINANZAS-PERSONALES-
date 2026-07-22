"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  MessageCircle,
  Package,
  PackageMinus,
  PackagePlus,
  Pencil,
  Phone,
  Plus,
} from "lucide-react";
import {
  createBusinessProduct,
  removeStockProduct,
  restockProduct,
  updateBusinessProductSupplier,
} from "@/actions/business.actions";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { mailtoUrl, telUrl, whatsappUrl } from "@/lib/contact-links";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BusinessProductData } from "@/types";

type CreateProductDialogProps = {
  businessId: string;
  trackInventory: boolean;
};

function SupplierFields({
  prefix = "",
  defaults,
}: {
  prefix?: string;
  defaults?: {
    supplierName?: string;
    supplierPhone?: string;
    supplierWhatsApp?: string;
    supplierEmail?: string;
  };
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}supplierName`}>Proveedor</Label>
        <Input
          id={`${prefix}supplierName`}
          name="supplierName"
          placeholder="Nombre del proveedor"
          defaultValue={defaults?.supplierName ?? ""}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}supplierWhatsApp`}>WhatsApp</Label>
          <Input
            id={`${prefix}supplierWhatsApp`}
            name="supplierWhatsApp"
            placeholder="300 123 4567"
            defaultValue={defaults?.supplierWhatsApp ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}supplierPhone`}>Teléfono</Label>
          <Input
            id={`${prefix}supplierPhone`}
            name="supplierPhone"
            placeholder="601 234 5678"
            defaultValue={defaults?.supplierPhone ?? ""}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}supplierEmail`}>Correo</Label>
        <Input
          id={`${prefix}supplierEmail`}
          name="supplierEmail"
          type="email"
          placeholder="proveedor@email.com"
          defaultValue={defaults?.supplierEmail ?? ""}
        />
      </div>
    </>
  );
}

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
        supplierName: (formData.get("supplierName") as string) || undefined,
        supplierPhone: (formData.get("supplierPhone") as string) || undefined,
        supplierWhatsApp: (formData.get("supplierWhatsApp") as string) || undefined,
        supplierEmail: (formData.get("supplierEmail") as string) || undefined,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
            <div className="border-t pt-4">
              <p className="mb-3 text-sm font-medium">Contacto del proveedor</p>
              <div className="space-y-3">
                <SupplierFields />
              </div>
            </div>
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

function SupplierContact({
  product,
  onEdit,
}: {
  product: BusinessProductData;
  onEdit: () => void;
}) {
  const wa = product.supplierWhatsApp ? whatsappUrl(product.supplierWhatsApp) : "";
  const tel = product.supplierPhone ? telUrl(product.supplierPhone) : "";
  const mail = product.supplierEmail ? mailtoUrl(product.supplierEmail) : "";
  const hasContact = product.supplierName || wa || tel || mail;

  if (!hasContact) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Agregar proveedor
      </button>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      {product.supplierName && (
        <span className="text-xs text-muted-foreground">{product.supplierName}</span>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 gap-1 px-2 text-xs")}
        >
          <MessageCircle className="h-3 w-3 text-green-600" />
          WhatsApp
        </a>
      )}
      {tel && (
        <a
          href={tel}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 gap-1 px-2 text-xs")}
        >
          <Phone className="h-3 w-3" />
          {product.supplierPhone}
        </a>
      )}
      {mail && (
        <a
          href={mail}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 gap-1 px-2 text-xs")}
        >
          <Mail className="h-3 w-3" />
          {product.supplierEmail}
        </a>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        title="Editar proveedor"
        onClick={onEdit}
      >
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  );
}

type EditSupplierDialogProps = {
  product: BusinessProductData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function EditSupplierDialog({ product, open, onOpenChange }: EditSupplierDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateBusinessProductSupplier({
        productId: product.id,
        supplierName: (formData.get("supplierName") as string) || undefined,
        supplierPhone: (formData.get("supplierPhone") as string) || undefined,
        supplierWhatsApp: (formData.get("supplierWhatsApp") as string) || undefined,
        supplierEmail: (formData.get("supplierEmail") as string) || undefined,
      });
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Proveedor — {product.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <SupplierFields
              prefix="edit-"
              defaults={{
                supplierName: product.supplierName,
                supplierPhone: product.supplierPhone,
                supplierWhatsApp: product.supplierWhatsApp,
                supplierEmail: product.supplierEmail,
              }}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar contacto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type StockDialogProps = {
  businessId: string;
  product: BusinessProductData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type StockMode = "add" | "remove";

function StockDialog({ businessId, product, open, onOpenChange }: StockDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<StockMode>("add");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState(String(product.unitCost || 0));
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (next) {
      setMode("add");
      setQuantity("1");
      setUnitCost(String(product.unitCost || 0));
      setError(null);
    }
    onOpenChange(next);
  }

  function submitAdd(addQty: number) {
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

  function submitRemove(removeQty: number) {
    if (removeQty <= 0) {
      setError("La cantidad debe ser mayor a cero");
      return;
    }
    if (removeQty > product.stock) {
      setError(`Stock insuficiente. Disponible: ${product.stock} und`);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await removeStockProduct({
          businessId,
          productId: product.id,
          quantity: removeQty,
        });
        handleOpenChange(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al quitar stock");
      }
    });
  }

  function submit() {
    const qty = Number(quantity);
    if (mode === "add") submitAdd(qty);
    else submitRemove(qty);
  }

  const quickAdds = [1, 5, 10];
  const qtyNum = Number(quantity) || 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Actualizar stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "add" ? "default" : "outline"}
              className="gap-1"
              onClick={() => {
                setMode("add");
                setError(null);
              }}
            >
              <PackagePlus className="h-4 w-4" />
              Agregar stock
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "remove" ? "destructive" : "outline"}
              className="gap-1"
              onClick={() => {
                setMode("remove");
                setError(null);
              }}
            >
              <PackageMinus className="h-4 w-4" />
              Quitar stock
            </Button>
          </div>

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
                disabled={pending || (mode === "remove" && n > product.stock)}
                onClick={() => (mode === "add" ? submitAdd(n) : submitRemove(n))}
              >
                {mode === "add" ? `+${n}` : `−${n}`}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock-qty">
              Unidades a {mode === "add" ? "agregar" : "quitar"}
            </Label>
            <Input
              id="stock-qty"
              type="number"
              min={1}
              max={mode === "remove" ? product.stock : undefined}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          {mode === "add" && (
            <div className="space-y-2">
              <Label htmlFor="stock-cost">Costo unitario (COGS)</Label>
              <Input
                id="stock-cost"
                type="number"
                min={0}
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
          )}

          {qtyNum > 0 && (
            <p className={cn("text-xs text-muted-foreground", mode === "remove" && "text-destructive/80")}>
              {mode === "add" ? (
                <>
                  Nuevo stock: {product.stock + qtyNum} und · Entrada inventario:{" "}
                  {formatCurrency(qtyNum * (Number(unitCost) || 0))}
                </>
              ) : (
                <>Nuevo stock: {Math.max(0, product.stock - qtyNum)} und</>
              )}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant={mode === "remove" ? "destructive" : "default"}
            disabled={
              pending ||
              !quantity ||
              qtyNum <= 0 ||
              (mode === "remove" && qtyNum > product.stock)
            }
            onClick={submit}
          >
            {pending
              ? "Guardando..."
              : mode === "add"
                ? "Agregar al stock"
                : "Quitar del stock"}
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
  const [stockProductId, setStockProductId] = useState<string | null>(null);
  const [editSupplierProductId, setEditSupplierProductId] = useState<string | null>(null);
  const selectedProduct = products.find((p) => p.id === stockProductId);
  const editSupplierProduct = products.find((p) => p.id === editSupplierProductId);

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
          <li key={p.id} className="flex items-start justify-between gap-3 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{p.name}</p>
              <p className="text-muted-foreground">
                Stock: <strong>{p.stock}</strong> und
              </p>
              <SupplierContact
                product={p}
                onEdit={() => setEditSupplierProductId(p.id)}
              />
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
                onClick={() => setStockProductId(p.id)}
              >
                <PackagePlus className="mr-1 h-4 w-4" />
                Stock
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {selectedProduct && (
        <StockDialog
          businessId={businessId}
          product={selectedProduct}
          open={stockProductId !== null}
          onOpenChange={(open) => !open && setStockProductId(null)}
        />
      )}

      {editSupplierProduct && (
        <EditSupplierDialog
          product={editSupplierProduct}
          open={editSupplierProductId !== null}
          onOpenChange={(open) => !open && setEditSupplierProductId(null)}
        />
      )}
    </>
  );
}
