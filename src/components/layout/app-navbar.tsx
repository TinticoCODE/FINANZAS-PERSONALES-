"use client";

import { useTheme } from "next-themes";
import { Bell, Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TransactionCommandMenu } from "@/features/search/transaction-command-menu";
import { LogoutButton } from "@/features/auth/logout-button";
import { useSidebar } from "@/hooks/use-sidebar";
import { Badge } from "@/components/ui/badge";
import { formatUserDate, formatUserRelative } from "@/utils/dates";
import { useUserTimezone } from "@/contexts/user-timezone-context";
import type { ReminderData } from "@/types";

type AppNavbarProps = {
  reminders: ReminderData[];
  userName?: string;
};

export function AppNavbar({ reminders, userName = "Admin" }: AppNavbarProps) {
  const { theme, setTheme } = useTheme();
  const { setMobileOpen } = useSidebar();
  const timezone = useUserTimezone();
  const unreadCount = reminders.filter((r) => !r.isRead).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex flex-1 items-center gap-4">
        <TransactionCommandMenu />
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Cambiar tema</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px]">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {reminders.length === 0 ? (
              <DropdownMenuItem disabled>Sin recordatorios</DropdownMenuItem>
            ) : (
              reminders.map((reminder) => (
                <DropdownMenuItem key={reminder.id} className="flex flex-col items-start gap-1 py-3">
                  <span className="font-medium">{reminder.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatUserDate(reminder.dueDate, "d MMM yyyy", timezone)}
                    {reminder.description ? ` · ${reminder.description}` : ""}
                  </span>
                  <span className="text-[10px] text-muted-foreground/80">
                    {formatUserRelative(reminder.dueDate, timezone)}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Avatar className="h-8 w-8" title={userName}>
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {userName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <LogoutButton />
      </div>
    </header>
  );
}
