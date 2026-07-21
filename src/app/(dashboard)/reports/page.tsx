import { PageHeader } from "@/components/shared/page-header";
import { ReportsPanel } from "@/features/reports/reports-panel";
import { getReportsData } from "@/services/data.service";

export default async function ReportsPage() {
  const data = await getReportsData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Análisis detallado de tus finanzas"
      />
      <ReportsPanel
        monthlyEvolution={data.monthlyEvolution}
        expenseByCategory={data.expenseByCategory}
      />
    </div>
  );
}
