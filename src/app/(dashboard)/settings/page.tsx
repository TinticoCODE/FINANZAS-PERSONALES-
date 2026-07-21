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

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Personaliza tu experiencia en FinFlow"
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
            <CardDescription>Formato de números y fechas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Moneda</p>
                <p className="text-xs text-muted-foreground">Peso colombiano (COP)</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Idioma</p>
                <p className="text-xs text-muted-foreground">Español (Colombia)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
