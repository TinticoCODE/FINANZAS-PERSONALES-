"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const MONTH_OPTIONS = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

type PeriodSelectorProps = {
  year: number;
  month: number;
  periodLabel: string;
};

function buildYearOptions(currentYear: number) {
  return Array.from({ length: 6 }, (_, index) => currentYear - index);
}

export function PeriodSelector({ year, month, periodLabel }: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const updatePeriod = useCallback(
    (nextYear: number, nextMonth: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("year", String(nextYear));
      params.set("month", String(nextMonth));
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  const yearOptions = buildYearOptions(new Date().getFullYear());

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/80 p-4 backdrop-blur-sm sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CalendarRange className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium">Periodo de análisis</p>
          <p className="text-xs text-muted-foreground capitalize">{periodLabel}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="period-month" className="text-xs text-muted-foreground">
            Mes
          </Label>
          <Select
            value={String(month)}
            onValueChange={(value) => updatePeriod(year, Number(value ?? month))}
            disabled={pending}
          >
            <SelectTrigger id="period-month" className="w-[140px]">
              <span>{MONTH_OPTIONS[month - 1]?.label ?? "Mes"}</span>
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="period-year" className="text-xs text-muted-foreground">
            Año
          </Label>
          <Select
            value={String(year)}
            onValueChange={(value) => updatePeriod(Number(value ?? year), month)}
            disabled={pending}
          >
            <SelectTrigger id="period-year" className="w-[100px]">
              <span>{year}</span>
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((optionYear) => (
                <SelectItem key={optionYear} value={String(optionYear)}>
                  {optionYear}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
