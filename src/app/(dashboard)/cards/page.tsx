import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { CreditCardList } from "@/features/cards/credit-card-list";
import { creditCards } from "@/services/mock-data";

export default function CardsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarjetas de crédito"
        description="Administra tus tarjetas, cupos y fechas de pago"
        action={
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Agregar tarjeta
          </Button>
        }
      />
      <CreditCardList cards={creditCards} />
    </div>
  );
}
