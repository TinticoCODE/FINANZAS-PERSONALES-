import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <WifiOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Sin conexión</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          No hay internet en este momento. Los recursos guardados siguen disponibles;
          reconecta para sincronizar tus movimientos.
        </p>
      </div>
      <Button render={<Link href="/" />}>Reintentar</Button>
    </div>
  );
}
