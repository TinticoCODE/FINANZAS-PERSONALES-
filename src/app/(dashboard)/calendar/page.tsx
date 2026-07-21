import { PageHeader } from "@/components/shared/page-header";
import { FinancialCalendar } from "@/features/calendar/financial-calendar";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario financiero"
        description="Pagos pendientes, fechas de corte y recordatorios"
      />
      <FinancialCalendar />
    </div>
  );
}
