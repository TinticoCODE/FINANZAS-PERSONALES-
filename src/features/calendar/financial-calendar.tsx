"use client";

import { motion } from "framer-motion";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BudgetData, CreditCardData, ReminderData } from "@/types";
import { formatUserDate, formatUserMonthYear, utcToUserLocal } from "@/utils/dates";
import { useUserTimezone } from "@/contexts/user-timezone-context";

type FinancialCalendarProps = {
  reminders: ReminderData[];
  cards: CreditCardData[];
  budgets: BudgetData[];
};

export function FinancialCalendar({ reminders, cards, budgets }: FinancialCalendarProps) {
  const timezone = useUserTimezone();
  const now = utcToUserLocal(new Date(), timezone);
  const monthLabel = formatUserMonthYear(new Date(), timezone);

  const events = [
    ...reminders.map((r) => ({
      date: utcToUserLocal(r.dueDate, timezone),
      title: r.title,
      type: r.type,
    })),
    ...cards.flatMap((card) => {
      const cutoffDate = card.nextCutoffDate
        ? utcToUserLocal(card.nextCutoffDate, timezone)
        : new Date(now.getFullYear(), now.getMonth(), card.cutOffDate);
      const paymentDate = card.nextPaymentDueDate
        ? utcToUserLocal(card.nextPaymentDueDate, timezone)
        : new Date(now.getFullYear(), now.getMonth(), card.paymentDueDate);

      return [
        {
          date: cutoffDate,
          title: `Corte ${card.name}`,
          type: "CUTOFF",
        },
        {
          date: paymentDate,
          title: `Pago ${card.name}`,
          type: "PAYMENT",
        },
      ];
    }),
  ];

  const upcomingEvents = events
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 6);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="h-4 w-4" />
              Calendario financiero
            </CardTitle>
            <CardDescription className="capitalize">{monthLabel}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={now}
              className="rounded-xl border"
            />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Próximos eventos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin eventos programados</p>
            ) : (
              upcomingEvents.map((event, index) => (
                <div
                  key={`${event.title}-${index}`}
                  className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatUserDate(event.date, "d MMM", timezone)}
                    </p>
                  </div>
                  <Badge variant="outline">{event.type}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Presupuestos activos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {budgets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin presupuestos este mes</p>
            ) : (
              budgets.slice(0, 4).map((budget) => (
                <div key={budget.id} className="flex justify-between text-sm">
                  <span>{budget.category}</span>
                  <span className="text-muted-foreground">
                    ${budget.spent.toLocaleString("es-CO")} / ${budget.budget.toLocaleString("es-CO")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
