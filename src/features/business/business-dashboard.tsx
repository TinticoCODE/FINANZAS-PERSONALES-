"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BusinessKpiGrid } from "@/features/business/business-kpi-grid";
import { CapitalTransferDialog } from "@/features/business/capital-transfer-dialog";
import { CreateProductDialog, ProductList } from "@/features/business/create-product-dialog";
import { CreateSaleDialog } from "@/features/business/create-sale-dialog";
import { SalesList } from "@/features/business/sales-list";
import {
  CustomerRiskBadge,
  OverdueInstallmentsTable,
} from "@/features/business/overdue-installments-table";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatPercent } from "@/lib/format";
import { businessTypeLabels } from "@/lib/labels";
import type { BusinessDashboardData } from "@/types";

type BusinessDashboardProps = {
  data: BusinessDashboardData;
};

export function BusinessDashboard({ data }: BusinessDashboardProps) {
  const { business, kpis, cashFlow, profitability, products, customers } = data;
  const trackInventory = business.businessType !== "SERVICE";
  const cashPct =
    cashFlow.totalLiquidPosition > 0
      ? (cashFlow.cashOnHand / cashFlow.totalLiquidPosition) * 100
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/business" className="flex items-center hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Emprendimientos
        </Link>
      </div>

      <PageHeader
        title={business.name}
        description={
          business.description ??
          `${businessTypeLabels[business.businessType as keyof typeof businessTypeLabels]} · Ledger comercial aislado`
        }
        action={
          <div className="flex flex-wrap gap-2">
            <CapitalTransferDialog
              businessId={business.id}
              accounts={data.personalAccounts}
            />
            <CreateSaleDialog
              businessId={business.id}
              products={products}
              customers={customers}
            />
          </div>
        }
      />

      <BusinessKpiGrid kpis={kpis} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Flujo de caja</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>Dinero en mano (caja)</span>
                    <span className="font-medium">{formatCurrency(cashFlow.cashOnHand)}</span>
                  </div>
                  <Progress value={cashPct} className="h-2" />
                </div>
                <div className="flex justify-between text-sm">
                  <span>Dinero en la calle (CxC)</span>
                  <span className="font-medium">
                    {formatCurrency(cashFlow.accountsReceivable)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Vencido</span>
                  <span className="font-medium text-destructive">
                    {formatCurrency(cashFlow.overdueReceivable)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-3 text-sm">
                  <span>Tasa de cobro</span>
                  <span>{formatPercent(cashFlow.collectionRate * 100)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rentabilidad (mes)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Ventas devengadas" value={profitability.grossRevenue} />
                <Row label="COGS" value={-profitability.cogs} muted />
                <Row label="Margen bruto" value={profitability.grossProfit} />
                <Row label="Gastos operativos" value={-profitability.operatingExpenses} muted />
                <Row label="Beneficio neto" value={profitability.netProfit} strong />
                <div className="border-t pt-2 text-xs text-muted-foreground">
                  Margen neto {formatPercent(profitability.netMarginPct)} · ROI{" "}
                  {formatPercent(profitability.roiPct)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cuotas en mora</CardTitle>
            </CardHeader>
            <CardContent>
              <OverdueInstallmentsTable installments={data.overdueInstallments} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Productos e inventario</CardTitle>
              {trackInventory && (
                <CreateProductDialog businessId={business.id} trackInventory />
              )}
            </CardHeader>
            <CardContent>
              {trackInventory ? (
                <ProductList products={products} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Negocio de servicios — inventario no aplica
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ventas recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <SalesList sales={data.recentSales} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              {customers.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Los clientes se crean al registrar ventas
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {customers.map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        {c.phone ? (
                          <p className="inline-flex items-center gap-1 text-muted-foreground">
                            <span className="text-xs">Contacto:</span> {c.phone}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Sin teléfono</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <CustomerRiskBadge level={c.riskLevel} />
                        <span className="text-muted-foreground">
                          {formatCurrency(c.totalOutstanding)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: number;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-muted-foreground" : undefined}>{label}</span>
      <span className={strong ? "font-semibold" : "font-medium"}>
        {formatCurrency(Math.abs(value))}
        {value < 0 ? " (−)" : ""}
      </span>
    </div>
  );
}
