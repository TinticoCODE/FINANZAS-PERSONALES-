import {
  ArrowLeftRight,
  Building2,
  Calendar,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  PiggyBank,
  RefreshCw,
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
  { title: "Recurrentes", href: "/recurring", icon: RefreshCw },
  { title: "Tarjetas", href: "/cards", icon: CreditCard },
  { title: "Presupuestos", href: "/budgets", icon: PiggyBank },
  { title: "Cuentas", href: "/accounts", icon: Wallet },
  { title: "Préstamos", href: "/loans", icon: HandCoins },
  { title: "Negocios", href: "/business", icon: Building2 },
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

export const TIMEZONE_OPTIONS = [
  { value: "America/Bogota", label: "Bogotá, Colombia (COT)" },
  { value: "America/Mexico_City", label: "Ciudad de México (CST)" },
  { value: "America/Lima", label: "Lima, Perú (PET)" },
  { value: "America/Santiago", label: "Santiago, Chile (CLT)" },
  { value: "America/Buenos_Aires", label: "Buenos Aires (ART)" },
  { value: "America/Caracas", label: "Caracas, Venezuela (VET)" },
  { value: "America/New_York", label: "Nueva York (EST)" },
  { value: "America/Los_Angeles", label: "Los Ángeles (PST)" },
  { value: "Europe/Madrid", label: "Madrid, España (CET)" },
  { value: "UTC", label: "UTC" },
] as const;
