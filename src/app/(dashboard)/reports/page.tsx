import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ReportsPanel } from "@/features/reports/reports-panel";
import { getReportsDataFromSearchParams } from "@/services/data.service";

type ReportsPageProps = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

async function ReportsContent({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const data = await getReportsDataFromSearchParams(params);

  return <ReportsPanel {...data} />;
}

export default function ReportsPage({ searchParams }: ReportsPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Historial mensual inmutable y tendencias anuales"
      />
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">Cargando reportes...</div>
        }
      >
        <ReportsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
