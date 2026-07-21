"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { mainNavItems } from "@/lib/constants";
import { AppLogo } from "@/components/shared/app-logo";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/use-sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AppSidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapsed } = useSidebar();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="hidden h-full shrink-0 flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur-xl md:flex"
    >
      <div className="flex h-16 items-center justify-between border-b border-border/60 px-4">
        <AppLogo showText={!isCollapsed} size="sm" />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleCollapsed}
          className="shrink-0"
        >
          <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }}>
            <ChevronLeft className="h-4 w-4" />
          </motion.div>
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {mainNavItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            const linkContent = (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-accent"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <Icon
                  className={cn(
                    "relative z-10 h-4 w-4 shrink-0 transition-colors",
                    isActive && "text-primary"
                  )}
                />
                {!isCollapsed && (
                  <span className="relative z-10 truncate">{item.title}</span>
                )}
              </>
            );

            const link = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {linkContent}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger render={link} />
                  <TooltipContent side="right">{item.title}</TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </nav>
      </ScrollArea>
    </motion.aside>
  );
}
