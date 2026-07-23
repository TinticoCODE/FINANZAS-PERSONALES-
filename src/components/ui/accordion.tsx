"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AccordionContextValue = {
  openItems: string[];
  toggleItem: (value: string) => void;
  type: "single" | "multiple";
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

function useAccordion() {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion components must be used within Accordion");
  }
  return context;
}

type AccordionProps = React.ComponentProps<"div"> & {
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  collapsible?: boolean;
};

function Accordion({
  type = "single",
  defaultValue,
  value,
  onValueChange,
  collapsible = true,
  className,
  children,
  ...props
}: AccordionProps) {
  const [internalOpen, setInternalOpen] = React.useState<string[]>(() => {
    if (!defaultValue) return [];
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  });

  const openItems = React.useMemo(() => {
    if (value === undefined) return internalOpen;
    return Array.isArray(value) ? value : value ? [value] : [];
  }, [value, internalOpen]);

  const setOpenItems = React.useCallback(
    (next: string[]) => {
      if (value === undefined) {
        setInternalOpen(next);
      }
      if (type === "single") {
        onValueChange?.(next[0] ?? "");
      } else {
        onValueChange?.(next);
      }
    },
    [onValueChange, type, value]
  );

  const toggleItem = React.useCallback(
    (itemValue: string) => {
      const isOpen = openItems.includes(itemValue);
      if (type === "single") {
        if (isOpen && collapsible) {
          setOpenItems([]);
          return;
        }
        setOpenItems([itemValue]);
        return;
      }

      if (isOpen) {
        setOpenItems(openItems.filter((item) => item !== itemValue));
      } else {
        setOpenItems([...openItems, itemValue]);
      }
    },
    [collapsible, openItems, setOpenItems, type]
  );

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div data-slot="accordion" className={cn("space-y-2", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

function AccordionItem({
  value,
  className,
  ...props
}: React.ComponentProps<"div"> & { value: string }) {
  return (
    <div
      data-slot="accordion-item"
      data-value={value}
      className={cn("rounded-xl border border-border/60", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  itemValue,
  ...props
}: React.ComponentProps<"button"> & { itemValue: string }) {
  const { openItems, toggleItem } = useAccordion();
  const isOpen = openItems.includes(itemValue);

  return (
    <button
      type="button"
      data-slot="accordion-trigger"
      data-state={isOpen ? "open" : "closed"}
      className={cn(
        "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-muted/40",
        className
      )}
      onClick={() => toggleItem(itemValue)}
      {...props}
    >
      {children}
      <ChevronDownIcon
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </button>
  );
}

function AccordionContent({
  className,
  children,
  itemValue,
  ...props
}: React.ComponentProps<"div"> & { itemValue: string }) {
  const { openItems } = useAccordion();
  const isOpen = openItems.includes(itemValue);

  if (!isOpen) return null;

  return (
    <div
      data-slot="accordion-content"
      data-state={isOpen ? "open" : "closed"}
      className={cn("border-t border-border/60 px-3 py-3 text-sm", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
