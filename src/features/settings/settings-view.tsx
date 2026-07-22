"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserTimezone } from "@/actions/settings.actions";
import { TIMEZONE_OPTIONS } from "@/lib/constants";

type SettingsViewProps = {
  timezone: string;
};

export function SettingsView({ timezone }: SettingsViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const selectedLabel =
    TIMEZONE_OPTIONS.find((t) => t.value === timezone)?.label ?? timezone;

  const handleTimezoneChange = (value: string | null) => {
    if (!value) return;
    startTransition(async () => {
      await updateUserTimezone(value);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Personaliza tu experiencia en SharkMoney"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Preferencias</CardTitle>
            <CardDescription>Ajustes generales de la aplicación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">Notificaciones push</Label>
              <Switch id="notifications" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="email-alerts">Alertas por email</Label>
              <Switch id="email-alerts" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="budget-alerts">Alertas de presupuesto</Label>
              <Switch id="budget-alerts" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Moneda y región</CardTitle>
            <CardDescription>
              Zona horaria para reportes, cortes y transacciones recurrentes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Moneda</p>
                <p className="text-xs text-muted-foreground">Peso colombiano (COP)</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Idioma</p>
                <p className="text-xs text-muted-foreground">Español (Colombia)</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Zona horaria</Label>
              <Select
                value={timezone}
                onValueChange={handleTimezoneChange}
                disabled={pending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar zona horaria">
                    {selectedLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Los reportes y el cron de cortes usan esta zona. Las fechas en BD
                se guardan en UTC.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
