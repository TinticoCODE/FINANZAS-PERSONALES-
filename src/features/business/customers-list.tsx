"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, Trash2 } from "lucide-react";
import { deleteBusinessCustomer } from "@/actions/business.actions";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { CustomerRiskBadge } from "@/features/business/overdue-installments-table";
import type { BusinessCustomerData } from "@/types";

type CustomersListProps = {
  customers: BusinessCustomerData[];
};

export function CustomersList({ customers }: CustomersListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete(customer: BusinessCustomerData) {
    if (
      !confirm(
        `¿Eliminar al cliente ${customer.name}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteBusinessCustomer(customer.id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al eliminar cliente");
      }
    });
  }

  if (customers.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Los clientes se crean al registrar ventas
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {customers.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{c.name}</p>
            {c.phone ? (
              <p className="inline-flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3 w-3" />
                {c.phone}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Sin teléfono</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CustomerRiskBadge level={c.riskLevel} />
            <span className="text-muted-foreground">
              {formatCurrency(c.totalOutstanding)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              disabled={pending || c.totalOutstanding > 0}
              title={
                c.totalOutstanding > 0
                  ? "No se puede eliminar: tiene saldo pendiente"
                  : "Eliminar cliente"
              }
              onClick={() => handleDelete(c)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
