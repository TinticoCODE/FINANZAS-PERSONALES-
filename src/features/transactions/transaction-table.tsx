"use client";

import { ArrowDownLeft, ArrowUpRight, MoreHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { Transaction } from "@/types";

type TransactionTableProps = {
  data: Transaction[];
  onDelete?: (id: string) => void;
  deleting?: boolean;
};

export function TransactionTable({ data, onDelete, deleting }: TransactionTableProps) {
  if (data.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Fecha</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Cuenta</TableHead>
            <TableHead>Método</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((tx) => (
            <TableRow
              key={tx.id}
              className="border-border/40 transition-colors hover:bg-muted/30"
            >
              <TableCell className="text-muted-foreground">
                {new Date(tx.date).toLocaleDateString("es-CO", {
                  day: "2-digit",
                  month: "short",
                })}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      tx.type === "INCOME"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-red-500/10 text-red-600"
                    )}
                  >
                    {tx.type === "INCOME" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{tx.description}</p>
                    {tx.tags.length > 0 && (
                      <div className="mt-0.5 flex gap-1">
                        {tx.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  style={{ borderColor: `${tx.categoryColor}40`, color: tx.categoryColor }}
                >
                  {tx.category}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{tx.account}</TableCell>
              <TableCell className="text-muted-foreground">{tx.paymentMethod}</TableCell>
              <TableCell
                className={cn(
                  "text-right font-medium",
                  tx.type === "INCOME" ? "text-emerald-600" : "text-foreground"
                )}
              >
                {tx.type === "INCOME" ? "+" : "-"}
                {formatCurrency(tx.amount)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-xs">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={deleting}
                      onClick={() => onDelete?.(tx.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
