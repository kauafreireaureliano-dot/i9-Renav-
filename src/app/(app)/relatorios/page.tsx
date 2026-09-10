import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export default async function RelatoriosPage() {
  const [totalVehicles, byStatus, salesTotal, purchasesTotal] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.groupBy({ by: ["status"], _count: true }),
    prisma.sale.aggregate({ _sum: { value: true }, _count: true, where: { status: { not: "CANCELADA" } } }),
    prisma.purchase.aggregate({ _sum: { value: true }, _count: true, where: { status: { not: "CANCELADA" } } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Visão consolidada da operação</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total de veículos cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{totalVehicles}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total vendido (histórico)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(Number(salesTotal._sum.value ?? 0))}
            <p className="text-xs text-muted-foreground font-normal mt-1">
              {salesTotal._count} vendas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total comprado (histórico)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(Number(purchasesTotal._sum.value ?? 0))}
            <p className="text-xs text-muted-foreground font-normal mt-1">
              {purchasesTotal._count} compras
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Veículos por status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {byStatus.map((s) => (
            <div key={s.status} className="flex items-center justify-between border-b last:border-0 pb-2">
              <span className="text-sm">{s.status}</span>
              <span className="font-medium">{s._count}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
