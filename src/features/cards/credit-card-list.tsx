"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Calendar, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CreditCardData } from "@/types";

type CreditCardListProps = {
  cards: CreditCardData[];
};

function getDaysUntil(dayOfMonth: number): number {
  const today = new Date();
  const currentDay = today.getDate();
  if (currentDay <= dayOfMonth) {
    return dayOfMonth - currentDay;
  }
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
  return Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function CreditCardList({ cards }: CreditCardListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card, index) => {
        const utilization = (card.usedBalance / card.creditLimit) * 100;
        const available = card.creditLimit - card.usedBalance;
        const daysToCutoff = getDaysUntil(card.cutOffDate);
        const daysToPayment = getDaysUntil(card.paymentDueDate);
        const recommendedPayment = card.usedBalance * 0.3;
        const minPayment = card.usedBalance * 0.05;
        const isHighUtilization = utilization > 70;
        const isPaymentSoon = daysToPayment <= 5;

        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4 }}
          >
            <Card className="overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm">
              <div
                className="h-2"
                style={{ background: `linear-gradient(90deg, ${card.color}, ${card.color}80)` }}
              />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{card.name}</CardTitle>
                    <CardDescription>
                      {card.bank} •••• {card.lastFourDigits}
                    </CardDescription>
                  </div>
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Cupo total</p>
                    <p className="font-semibold">{formatCurrency(card.creditLimit)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Disponible</p>
                    <p className="font-semibold text-emerald-600">
                      {formatCurrency(available)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Saldo utilizado</p>
                    <p className="font-semibold">{formatCurrency(card.usedBalance)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tasa de interés</p>
                    <p className="font-semibold">{card.interestRate}%</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Utilización</span>
                    <span className={cn(isHighUtilization && "text-amber-600 font-medium")}>
                      {formatPercent(utilization)}
                    </span>
                  </div>
                  <Progress value={utilization} className="h-2" />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    Corte en {daysToCutoff} días
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn("gap-1", isPaymentSoon && "border-amber-500 text-amber-600")}
                  >
                    <Calendar className="h-3 w-3" />
                    Pago en {daysToPayment} días
                  </Badge>
                  {isHighUtilization && (
                    <Badge variant="outline" className="gap-1 border-red-500 text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      Alto uso
                    </Badge>
                  )}
                </div>

                <div className="rounded-xl bg-muted/50 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pago mínimo</span>
                    <span>{formatCurrency(minPayment)}</span>
                  </div>
                  <div className="mt-1 flex justify-between font-medium">
                    <span className="text-muted-foreground">Pago recomendado</span>
                    <span>{formatCurrency(recommendedPayment)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
