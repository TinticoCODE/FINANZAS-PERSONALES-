"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { getSemaphoreProgressClass } from "@/features/budgets/budget-analytics";
import { cn } from "@/lib/utils";

type BudgetProgressBarProps = {
  value: number;
  className?: string;
  trackClassName?: string;
};

export function BudgetProgressBar({
  value,
  className,
  trackClassName,
}: BudgetProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const colorClass = getSemaphoreProgressClass(clamped);

  return (
    <ProgressPrimitive.Root value={clamped} className={cn("w-full", className)}>
      <ProgressTrack className={cn("h-2.5 bg-muted/80", trackClassName)}>
        <ProgressIndicator
          className={cn("h-full transition-all duration-500", colorClass)}
        />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  );
}
