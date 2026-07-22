import {
  ArrowLeftRight,
  Calendar,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  PiggyBank,
  Settings,
  Target,
  Wallet,
  FileBarChart,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Transacciones", href: "/transactions", icon: ArrowLeftRight },
  { title: "Tarjetas", href: "/cards", icon: CreditCard },
  { title: "Presupuestos", href: "/budgets", icon: PiggyBank },
  { title: "Cuentas", href: "/accounts", icon: Wallet },
  { title: "Préstamos", href: "/loans", icon: HandCoins },
  { title: "Metas", href: "/goals", icon: Target },
  { title: "Calendario", href: "/calendar", icon: Calendar },
  { title: "Reportes", href: "/reports", icon: FileBarChart },
  { title: "Configuración", href: "/settings", icon: Settings },
];

export const budgetStatusColors = {
  safe: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
} as const;

export function getBudgetStatus(percent: number) {
  if (percent >= 90) return "danger" as const;
  if (percent >= 70) return "warning" as const;
  return "safe" as const;
}
