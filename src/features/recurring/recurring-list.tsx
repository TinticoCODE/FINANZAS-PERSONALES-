"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { formatUserDate } from "@/utils/dates";
import { useUserTimezone } from "@/contexts/user-timezone-context";
import type { RecurringTransactionData } from "@/types";
import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from "lucide-react";

type RecurringListProps = {
  items: RecurringTransactionData[];
  onToggle: (id: string, isActive: boolean) => void;
  onEdit: (item: RecurringTransactionData) => void;
  onDelete: (id: string) => void;
  pending?: boolean;
};

export function RecurringList({
  items,
  onToggle,
  onEdit,
  onDelete,
  pending,
}: RecurringListProps) {
  const timezone = useUserTimezone();

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Activa</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Frecuencia</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Próxima</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className={cn(
                "border-border/40",
                !item.isActive && "opacity-60"
              )}
            >
              <TableCell>
                <Switch
                  checked={item.isActive}
                  disabled={pending}
                  onCheckedChange={(checked) => onToggle(item.id, checked)}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      item.type === "INCOME"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-red-500/10 text-red-600"
                    )}
                  >
                    {item.type === "INCOME" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {item.description || item.category}
                    </p>
                    <Badge
                      variant="outline"
                      className="mt-0.5 text-[10px]"
                      style={{
                        borderColor: `${item.categoryColor}40`,
                        color: item.categoryColor,
                      }}
                    >
                      {item.category}
                    </Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{item.frequency}</TableCell>
              <TableCell className="text-muted-foreground">{item.fundSource}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatUserDate(item.nextRunAt, "dd MMM yyyy", timezone)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-medium",
                  item.type === "INCOME" ? "text-emerald-600" : "text-foreground"
                )}
              >
                {item.type === "INCOME" ? "+" : "-"}
                {formatCurrency(item.amount)}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={pending}
                    onClick={() => onEdit(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={pending}
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
