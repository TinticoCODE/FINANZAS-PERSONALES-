"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, Trash2 } from "lucide-react";
import { deleteSaleAction } from "@/actions/business.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { salePaymentTermsLabels } from "@/lib/labels";
import type { BusinessSaleData } from "@/types";

type SalesListProps = {
  sales: BusinessSaleData[];
};

export function SalesList({ sales }: SalesListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete(sale: BusinessSaleData) {
    const hasCollections = sale.installments.some((i) => i.paidAmount > 0);
    const message = hasCollections
      ? "Esta venta tiene cuotas cobradas y no se puede eliminar."
      : `¿Eliminar la venta ${sale.saleNumber}? Se revertirá el asiento contable y el inventario.`;

    if (hasCollections) {
      alert(message);
      return;
    }

    if (!confirm(message)) return;

    startTransition(async () => {
      try {
        await deleteSaleAction(sale.id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al eliminar la venta");
      }
    });
  }

  if (sales.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Sin ventas registradas
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {sales.map((sale) => {
        const hasCollections = sale.installments.some((i) => i.paidAmount > 0);
        return (
          <li
            key={sale.id}
            className="flex items-center justify-between gap-3 py-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {sale.saleNumber} · {sale.customerName ?? "Sin cliente"}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                <span>{formatDate(sale.saleDate)}</span>
                {sale.customerPhone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {sale.customerPhone}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="font-medium">{formatCurrency(sale.totalAmount)}</p>
                <Badge variant="outline" className="text-xs">
                  {
                    salePaymentTermsLabels[
                      sale.paymentTerms as keyof typeof salePaymentTermsLabels
                    ]
                  }
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                disabled={pending || hasCollections}
                title={
                  hasCollections
                    ? "No se puede eliminar: hay cuotas cobradas"
                    : "Eliminar venta"
                }
                onClick={() => handleDelete(sale)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
