import { PageHeader } from "@/components/shared/page-header";
import { FinancialCalendar } from "@/features/calendar/financial-calendar";
import { getCalendarData } from "@/services/data.service";

export default async function CalendarPage() {
  const { reminders, cards, budgets } = await getCalendarData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario"
        description="Pagos, fechas de corte y recordatorios financieros"
      />
      <FinancialCalendar reminders={reminders} cards={cards} budgets={budgets} />
    </div>
  );
}
