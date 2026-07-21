import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { TransactionTable } from "@/features/transactions/transaction-table";
import { transactions } from "@/services/mock-data";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Transacciones"
        description="Administra todas tus entradas y salidas de dinero"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva transacción
            </Button>
          </div>
        }
      />
      <TransactionTable data={transactions} />
    </div>
  );
}
