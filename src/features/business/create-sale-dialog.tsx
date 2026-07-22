"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import {
  createBusinessCustomer,
  createSaleAction,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import type { BusinessCustomerData, BusinessProductData } from "@/types";

type CreateSaleDialogProps = {
  businessId: string;
  products: BusinessProductData[];
  customers: BusinessCustomerData[];
};

function productLabel(p: BusinessProductData) {
  return `${p.name} — ${formatCurrency(p.salePrice)}`;
}

export function CreateSaleDialog({
  businessId,
  products,
  customers: initialCustomers,
}: CreateSaleDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [cashDown, setCashDown] = useState("0");
  const [installmentCount, setInstallmentCount] = useState("3");
  const [newCustomerName, setNewCustomerName] = useState("");

  const product = products.find((p) => p.id === productId);
  const qty = Number(quantity) || 0;
  const total = product ? product.salePrice * qty : 0;
  const down = Number(cashDown) || 0;
  const credit = Math.max(total - down, 0);
  const installments = Number(installmentCount) || 1;

  const plan = useMemo(() => {
    if (credit <= 0 || installments <= 0) return [];
    const base = Math.floor(credit / installments);
    const remainder = credit - base * installments;
    const today = new Date();
    return Array.from({ length: installments }, (_, i) => {
      const due = new Date(today);
      due.setMonth(due.getMonth() + i + 1);
      return {
        dueDate: due.toISOString(),
        amount: base + (i === installments - 1 ? remainder : 0),
      };
    });
  }, [credit, installments]);

  async function ensureCustomer(): Promise<string | undefined> {
    if (customerId) return customerId;
    if (!newCustomerName.trim()) return undefined;
    const id = await createBusinessCustomer({
      businessId,
      name: newCustomerName.trim(),
    });
    setCustomers((prev) => [
      ...prev,
      {
        id,
        name: newCustomerName.trim(),
        riskLevel: "LOW",
        totalOutstanding: 0,
        overdueDaysMax: 0,
      },
    ]);
    setCustomerId(id);
    return id;
  }

  function handleSubmit() {
    if (!product || qty <= 0) return;
    setError(null);
    startTransition(async () => {
      try {
        const cid = await ensureCustomer();
        await createSaleAction({
          businessId,
          customerId: cid,
          lines: [
            {
              productId: product.id,
              description: product.name,
              qty,
              unitPrice: product.salePrice,
              unitCost: product.unitCost,
            },
          ],
          cashDownPayment: down,
          installmentPlan: plan,
          saleDate: new Date().toISOString(),
        });
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrar la venta");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Nueva venta
          </Button>
        }
      />
      <DialogContent className="z-[100] max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar venta</DialogTitle>
        </DialogHeader>
        <div className="relative z-[100] space-y-4 py-2">
          {products.length === 0 ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              Primero crea un producto en la pestaña Inventario.
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="sale-product">Producto</Label>
              <Select
                value={productId}
                onValueChange={(v) => v && setProductId(v)}
              >
                <SelectTrigger id="sale-product" className="w-full">
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {products.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      label={productLabel(p)}
                    >
                      {productLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sale-qty">Cantidad</Label>
              <Input
                id="sale-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale-down">Enganche</Label>
              <Input
                id="sale-down"
                type="number"
                min={0}
                value={cashDown}
                onChange={(e) => setCashDown(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sale-customer">Cliente existente</Label>
            <Select
              value={customerId}
              onValueChange={(v) => setCustomerId(v ?? "")}
            >
              <SelectTrigger id="sale-customer" className="w-full">
                <SelectValue placeholder="Opcional — o crea uno abajo" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id} label={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sale-new-customer">O nuevo cliente</Label>
            <Input
              id="sale-new-customer"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </div>
          {credit > 0 && (
            <div className="space-y-2">
              <Label htmlFor="sale-installments">Cuotas</Label>
              <Input
                id="sale-installments"
                type="number"
                min={1}
                max={24}
                value={installmentCount}
                onChange={(e) => setInstallmentCount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Saldo a crédito: {formatCurrency(credit)} en {installments} cuotas
              </p>
            </div>
          )}
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p>
              Total venta: <strong>{formatCurrency(total)}</strong>
            </p>
            <p className="text-muted-foreground">
              Asiento: DR CxC / CR Ventas
              {product && product.unitCost > 0 && " + COGS/Inventario"}
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={pending || !product || qty <= 0 || products.length === 0}
          >
            {pending ? "Registrando..." : "Confirmar venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
