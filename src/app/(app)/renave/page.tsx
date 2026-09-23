import { getRenaveDashboardData } from "@/services/renave/renave-dashboard.service";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { RenaveFeeCard } from "./renave-fee-card";
import Link from "next/link";

export default async function RenavePage() {
  const data = await getRenaveDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">RENAVE</h1>
          <p className="text-sm text-muted-foreground">
            Status da integração e operações registradas
          </p>
        </div>
        <Badge variant={data.environment === "PRODUCAO" ? "default" : "outline"}>
          {data.environment === "PRODUCAO" ? "PRODUÇÃO" : "AMBIENTE DE TESTE"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Entradas pendentes" value={String(data.entradasPendentes)} />
        <StatCard label="Entradas concluídas" value={String(data.entradasConcluidas)} />
        <StatCard label="Saídas pendentes" value={String(data.saidasPendentes)} />
        <StatCard label="Saídas concluídas" value={String(data.saidasConcluidas)} />
        <StatCard label="Erros" value={String(data.erros)} tone={data.erros > 0 ? "warning" : "default"} />
        <StatCard label="Cancelamentos" value={String(data.cancelamentos)} />
      </div>

      <RenaveFeeCard />

      <Card>
        <CardHeader>
          <CardTitle>Últimas comunicações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.ultimosEventos.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma operação registrada ainda.</p>
          )}
          {data.ultimosEventos.map((ev) => (
            <Link
              key={ev.id}
              href={`/estoque/veiculo/${ev.renaveOperation.vehicleId}`}
              className="flex items-center justify-between border-b last:border-0 pb-2 text-sm hover:bg-muted/50 -mx-2 px-2 rounded"
            >
              <div>
                <p className="font-medium">
                  {ev.operation} — {ev.renaveOperation.vehicle.brand} {ev.renaveOperation.vehicle.model}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(ev.createdAt)} · {ev.user.name}
                </p>
              </div>
              <Badge variant={ev.status === "SUCESSO" ? "secondary" : "destructive"}>
                {ev.status}
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
