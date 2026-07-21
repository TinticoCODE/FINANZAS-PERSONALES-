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
import { creditCards, budgets, reminders } from "@/services/mock-data";

export function FinancialCalendar() {
  const events = [
    ...reminders.map((r) => ({
      date: new Date(r.dueDate),
      title: r.title,
      type: r.type,
    })),
    ...creditCards.flatMap((card) => [
      {
        date: new Date(2026, 6, card.cutOffDate),
        title: `Corte ${card.name}`,
        type: "CUTOFF",
      },
      {
        date: new Date(2026, 6, card.paymentDueDate),
        title: `Pago ${card.name}`,
        type: "PAYMENT",
      },
    ]),
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
            <CardDescription>Julio 2026</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={new Date()}
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
            {upcomingEvents.map((event, index) => (
              <div
                key={`${event.title}-${index}`}
                className="flex items-start justify-between rounded-xl bg-muted/40 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.date.toLocaleDateString("es-CO", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {event.type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Presupuestos del mes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {budgets.slice(0, 3).map((budget) => (
              <div key={budget.id} className="flex justify-between text-sm">
                <span>{budget.category}</span>
                <span className="text-muted-foreground">
                  ${budget.spent.toLocaleString("es-CO")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
