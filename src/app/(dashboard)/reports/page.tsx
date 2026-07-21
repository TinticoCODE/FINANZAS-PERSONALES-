import { PageHeader } from "@/components/shared/page-header";
import { ReportsPanel } from "@/features/reports/reports-panel";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Analiza y exporta tus finanzas"
      />
      <ReportsPanel />
    </div>
  );
}
