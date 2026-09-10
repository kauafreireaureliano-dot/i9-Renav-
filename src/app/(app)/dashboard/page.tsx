import { getDashboardData } from "@/services/dashboard.service";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral da revenda — {new Date().toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Estoque" value={`${data.vehiclesInStock} veículos`} />
        <StatCard
          label="Compras do mês"
          value={formatCurrency(data.purchasesThisMonth.total)}
          hint={`${data.purchasesThisMonth.count} entradas`}
        />
        <StatCard
          label="Vendas do mês"
          value={formatCurrency(data.salesThisMonth.total)}
          hint={`${data.salesThisMonth.count} vendas`}
        />
        <StatCard
          label="Margem estimada"
          value={formatCurrency(data.estimatedMargin)}
          tone="success"
        />
        <StatCard label="Custo total do estoque" value={formatCurrency(data.stockCost)} />
        <StatCard
          label="Aguardando documentação"
          value={String(data.pendingDocs)}
          tone={data.pendingDocs > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Pendências RENAVE"
          value={String(data.renavePending)}
          tone={data.renavePending > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Notas fiscais pendentes"
          value={String(data.invoicesPending)}
          tone={data.invoicesPending > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vendas recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentSales.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma venda este mês.</p>
            )}
            {data.recentSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">
                    {sale.vehicle.brand} {sale.vehicle.model} — {sale.buyer.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(sale.saleDate)}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(sale.value.toString())}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.notifications.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem alertas no momento.</p>
            )}
            {data.notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-2">
                <Badge
                  variant={n.severity === "URGENTE" ? "destructive" : "secondary"}
                  className="mt-0.5"
                >
                  {n.severity}
                </Badge>
                <div>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entradas recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.recentPurchases.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma entrada este mês.</p>
          )}
          {data.recentPurchases.map((purchase) => (
            <div
              key={purchase.id}
              className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium">
                  {purchase.vehicle.brand} {purchase.vehicle.model} — {purchase.seller.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(purchase.purchaseDate)}
                </p>
              </div>
              <span className="text-sm font-semibold">{formatCurrency(purchase.value.toString())}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
