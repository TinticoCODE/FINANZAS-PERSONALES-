"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
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
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import {
  generateInstallmentPlan,
  isPlanBalanced,
  planRowsTotal,
  type InstallmentFrequency,
  type InstallmentPlanRow,
} from "@/lib/installment-plan";
import { cn } from "@/lib/utils";
import type { BusinessProductData } from "@/types";

type CreateSaleDialogProps = {
  businessId: string;
  products: BusinessProductData[];
};

function productLabel(p: BusinessProductData) {
  return `${p.name} — ${formatCurrency(p.salePrice)}`;
}

function defaultFirstDueDate(frequency: InstallmentFrequency): string {
  const date = new Date();
  if (frequency === "monthly") {
    date.setMonth(date.getMonth() + 1);
  } else {
    date.setDate(date.getDate() + 15);
  }
  return date.toISOString().slice(0, 10);
}

export function CreateSaleDialog({ businessId, products }: CreateSaleDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [cashDown, setCashDown] = useState("0");
  const [installmentCount, setInstallmentCount] = useState("3");
  const [frequency, setFrequency] = useState<InstallmentFrequency>("monthly");
  const [firstDueDate, setFirstDueDate] = useState(defaultFirstDueDate("monthly"));
  const [planRows, setPlanRows] = useState<InstallmentPlanRow[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const product = products.find((p) => p.id === productId);
  const qty = Number(quantity) || 0;
  const total = product ? product.salePrice * qty : 0;
  const down = Number(cashDown) || 0;
  const credit = Math.max(total - down, 0);
  const installments = Number(installmentCount) || 1;
  const planTotal = planRowsTotal(planRows);
  const planBalanced = isPlanBalanced(credit, planRows);

  function regeneratePlan(count: number) {
    if (credit <= 0) {
      setPlanRows([]);
      return;
    }
    setPlanRows(
      generateInstallmentPlan({
        credit,
        count,
        frequency,
        firstDueDate,
      })
    );
  }

  useEffect(() => {
    if (open && credit > 0 && planRows.length === 0) {
      regeneratePlan(installments);
    }
  }, [open, credit, installments, frequency, firstDueDate, planRows.length]);

  function resetForm() {
    setProductId(products[0]?.id ?? "");
    setQuantity("1");
    setCashDown("0");
    setInstallmentCount("3");
    setFrequency("monthly");
    setFirstDueDate(defaultFirstDueDate("monthly"));
    setPlanRows([]);
    setCustomerName("");
    setCustomerPhone("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    setOpen(next);
  }

  function handleFrequencyChange(value: InstallmentFrequency) {
    const nextFirstDue = defaultFirstDueDate(value);
    setFrequency(value);
    setFirstDueDate(nextFirstDue);
    setPlanRows(
      generateInstallmentPlan({
        credit,
        count: installments,
        frequency: value,
        firstDueDate: nextFirstDue,
      })
    );
  }

  function handleInstallmentCountChange(value: string) {
    setInstallmentCount(value);
    regeneratePlan(Number(value) || 1);
  }

  function handleFirstDueDateChange(value: string) {
    setFirstDueDate(value);
    regeneratePlan(installments);
  }

  function handleCashDownChange(value: string) {
    setCashDown(value);
    const nextCredit = Math.max(total - (Number(value) || 0), 0);
    if (nextCredit <= 0) {
      setPlanRows([]);
      return;
    }
    setPlanRows(
      generateInstallmentPlan({
        credit: nextCredit,
        count: installments,
        frequency,
        firstDueDate,
      })
    );
  }

  function handleQuantityChange(value: string) {
    setQuantity(value);
    const nextTotal = product ? product.salePrice * (Number(value) || 0) : 0;
    const nextCredit = Math.max(nextTotal - down, 0);
    if (nextCredit <= 0) {
      setPlanRows([]);
      return;
    }
    setPlanRows(
      generateInstallmentPlan({
        credit: nextCredit,
        count: installments,
        frequency,
        firstDueDate,
      })
    );
  }

  function updatePlanRow(index: number, field: keyof InstallmentPlanRow, value: string) {
    setPlanRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function addPlanRow() {
    const last = planRows[planRows.length - 1];
    const nextDate = last?.dueDate
      ? (() => {
          const d = new Date(`${last.dueDate}T12:00:00`);
          if (frequency === "monthly") d.setMonth(d.getMonth() + 1);
          else d.setDate(d.getDate() + 15);
          return d.toISOString().slice(0, 10);
        })()
      : firstDueDate;
    const nextRows = [...planRows, { dueDate: nextDate, amount: "0" }];
    setPlanRows(nextRows);
    setInstallmentCount(String(nextRows.length));
  }

  function removePlanRow(index: number) {
    if (planRows.length <= 1) return;
    const nextRows = planRows.filter((_, i) => i !== index);
    setPlanRows(nextRows);
    setInstallmentCount(String(nextRows.length));
  }

  function handleSubmit() {
    if (!product || qty <= 0 || !customerName.trim()) return;
    if (credit > 0 && (!planBalanced || planRows.length === 0)) {
      setError("Las cuotas deben sumar exactamente el saldo a crédito");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const customerId = await createBusinessCustomer({
          businessId,
          name: customerName.trim(),
          phone: customerPhone.trim() || undefined,
        });
        await createSaleAction({
          businessId,
          customerId,
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
          installmentPlan: planRows.map((row) => ({
            dueDate: new Date(`${row.dueDate}T12:00:00`).toISOString(),
            amount: Number(row.amount) || 0,
          })),
          saleDate: new Date().toISOString(),
        });
        handleOpenChange(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrar la venta");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Nueva venta
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar venta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {products.length === 0 ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              Primero crea un producto en la pestaña Inventario.
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="sale-product">Producto</Label>
              <Select
                value={productId}
                onValueChange={(v) => {
                  if (!v) return;
                  setProductId(v);
                  const p = products.find((item) => item.id === v);
                  const nextCredit = Math.max(
                    (p ? p.salePrice * qty : 0) - down,
                    0
                  );
                  if (nextCredit <= 0) {
                    setPlanRows([]);
                    return;
                  }
                  setPlanRows(
                    generateInstallmentPlan({
                      credit: nextCredit,
                      count: installments,
                      frequency,
                      firstDueDate,
                    })
                  );
                }}
              >
                <SelectTrigger id="sale-product" className="w-full">
                  <span className="flex-1 truncate text-left">
                    {product ? (
                      productLabel(product)
                    ) : (
                      <span className="text-muted-foreground">
                        Selecciona un producto
                      </span>
                    )}
                  </span>
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
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
                onChange={(e) => handleQuantityChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale-down">Enganche</Label>
              <Input
                id="sale-down"
                type="number"
                min={0}
                value={cashDown}
                onChange={(e) => handleCashDownChange(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sale-customer-name">Nombre del cliente</Label>
            <Input
              id="sale-customer-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Escribe el nombre del cliente"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sale-customer-phone">Teléfono de contacto</Label>
            <Input
              id="sale-customer-phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="300 123 4567"
            />
          </div>

          {credit > 0 && (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Plan de cuotas</p>
              <p className="text-xs text-muted-foreground">
                Saldo a crédito: {formatCurrency(credit)}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="sale-frequency">Frecuencia</Label>
                  <Select
                    value={frequency}
                    onValueChange={(v) =>
                      v && handleFrequencyChange(v as InstallmentFrequency)
                    }
                  >
                    <SelectTrigger id="sale-frequency" className="w-full">
                      <span className="flex-1 truncate text-left">
                        {frequency === "monthly" ? "Mensual" : "Quincenal"}
                      </span>
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      <SelectItem value="monthly">Mensual</SelectItem>
                      <SelectItem value="biweekly">Quincenal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sale-installments">Nº de cuotas</Label>
                  <Input
                    id="sale-installments"
                    type="number"
                    min={1}
                    max={48}
                    value={installmentCount}
                    onChange={(e) => handleInstallmentCountChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale-first-due">Primera cuota</Label>
                <Input
                  id="sale-first-due"
                  type="date"
                  value={firstDueDate}
                  onChange={(e) => handleFirstDueDateChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Cuotas</Label>
                  <Button type="button" size="xs" variant="outline" onClick={addPlanRow}>
                    <Plus className="mr-1 h-3 w-3" />
                    Agregar
                  </Button>
                </div>
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {planRows.map((row, index) => (
                    <li
                      key={index}
                      className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2"
                    >
                      <span className="w-5 text-xs text-muted-foreground">{index + 1}</span>
                      <Input
                        type="date"
                        value={row.dueDate}
                        onChange={(e) => updatePlanRow(index, "dueDate", e.target.value)}
                      />
                      <Input
                        type="number"
                        min={0}
                        value={row.amount}
                        onChange={(e) => updatePlanRow(index, "amount", e.target.value)}
                        placeholder="Monto"
                      />
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={planRows.length <= 1}
                        onClick={() => removePlanRow(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>

              <p
                className={cn(
                  "text-xs",
                  planBalanced ? "text-muted-foreground" : "text-destructive"
                )}
              >
                Total cuotas: {formatCurrency(planTotal)}
                {!planBalanced && ` · Debe ser ${formatCurrency(credit)}`}
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
            disabled={
              pending ||
              !product ||
              qty <= 0 ||
              products.length === 0 ||
              !customerName.trim() ||
              (credit > 0 && !planBalanced)
            }
          >
            {pending ? "Registrando..." : "Confirmar venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
