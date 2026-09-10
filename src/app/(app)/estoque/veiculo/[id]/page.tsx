import { notFound } from "next/navigation";
import { getVehicleById } from "@/repositories/vehicle.repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { VEHICLE_STATUS_LABELS, VEHICLE_STATUS_TONE } from "@/lib/vehicle-status";
import { RenaveActions } from "./renave-actions";

export default async function VeiculoPage({ params }: PageProps<"/estoque/veiculo/[id]">) {
  const { id } = await params;
  const vehicle = await getVehicleById(id);

  if (!vehicle) notFound();

  const costsTotal = vehicle.costs.reduce((acc, c) => acc + Number(c.amount), 0);
  const totalCost = Number(vehicle.purchaseValue) + costsTotal;
  const margin = Number(vehicle.announcedPrice) - totalCost;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {vehicle.brand} {vehicle.model} {vehicle.version}
          </h1>
          <p className="text-sm text-muted-foreground">
            {vehicle.plate} · {vehicle.yearManufacture}/{vehicle.yearModel} ·{" "}
            {vehicle.mileage.toLocaleString("pt-BR")} km
          </p>
        </div>
        <Badge variant={VEHICLE_STATUS_TONE[vehicle.status]}>
          {VEHICLE_STATUS_LABELS[vehicle.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase">Compra</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {formatCurrency(vehicle.purchaseValue.toString())}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase">Custos</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatCurrency(costsTotal)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase">Preço venda</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {formatCurrency(vehicle.announcedPrice.toString())}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase">Margem</CardTitle>
          </CardHeader>
          <CardContent
            className={`text-lg font-semibold ${margin >= 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            {formatCurrency(margin)}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="renave">RENAVE</TabsTrigger>
          <TabsTrigger value="notas">Notas Fiscais</TabsTrigger>
          <TabsTrigger value="custos">Custos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 text-sm">
              <Field label="RENAVAM" value={vehicle.renavam} />
              <Field label="Chassi" value={vehicle.chassis} />
              <Field label="Cor" value={vehicle.color} />
              <Field label="Combustível" value={vehicle.fuel} />
              <Field label="Câmbio" value={vehicle.transmission} />
              <Field label="Categoria" value={vehicle.category ?? "—"} />
              <Field label="Carroceria" value={vehicle.bodyType ?? "—"} />
              <Field label="Origem" value={vehicle.origin ?? "—"} />
              <Field
                label="Preço mínimo"
                value={formatCurrency(vehicle.minimumSalePrice.toString())}
              />
              {vehicle.purchase && (
                <Field label="Vendedor" value={vehicle.purchase.seller.name} />
              )}
              {vehicle.sale && <Field label="Comprador" value={vehicle.sale.buyer.name} />}
              {vehicle.notes && (
                <div className="col-span-full">
                  <p className="text-xs text-muted-foreground uppercase">Observações</p>
                  <p>{vehicle.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renave">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Status RENAVE
                {vehicle.renaveOperation && (
                  <Badge variant="outline">{vehicle.renaveOperation.environment}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RenaveActions
                vehicleId={vehicle.id}
                status={vehicle.renaveOperation?.status ?? "NAO_INICIADO"}
                aptitudeResult={vehicle.renaveOperation?.aptitudeResult}
              />

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-2">Últimas comunicações</h3>
                <div className="space-y-2">
                  {vehicle.renaveOperation?.events.length ? (
                    vehicle.renaveOperation.events.map((ev) => (
                      <div key={ev.id} className="text-xs flex items-center justify-between border-b pb-2">
                        <div>
                          <span className="font-medium">{ev.operation}</span>{" "}
                          <span className="text-muted-foreground">
                            {formatDateTime(ev.createdAt)}
                          </span>
                          {ev.errorMessage && (
                            <p className="text-red-600">{ev.errorMessage}</p>
                          )}
                        </div>
                        <Badge variant={ev.status === "SUCESSO" ? "secondary" : "destructive"}>
                          {ev.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma comunicação registrada.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notas">
          <Card>
            <CardContent className="pt-6 space-y-3">
              {vehicle.invoices.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma nota fiscal registrada.</p>
              )}
              {vehicle.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between border-b pb-2 text-sm">
                  <div>
                    <span className="font-medium">{inv.type === "ENTRADA" ? "NF Entrada" : "NF Saída"}</span>{" "}
                    {inv.number && <span className="text-muted-foreground">#{inv.number}</span>}
                  </div>
                  <Badge variant={inv.status === "AUTORIZADA" ? "secondary" : "outline"}>
                    {inv.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custos">
          <Card>
            <CardContent className="pt-6 space-y-2">
              {vehicle.costs.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum custo adicional lançado.</p>
              )}
              {vehicle.costs.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b pb-2 text-sm">
                  <span>{c.category}{c.description ? ` — ${c.description}` : ""}</span>
                  <span className="font-medium">{formatCurrency(c.amount.toString())}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardContent className="pt-6 space-y-3">
              {vehicle.events.map((ev) => (
                <div key={ev.id} className="text-sm border-b pb-2">
                  <p>{ev.message}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(ev.createdAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
