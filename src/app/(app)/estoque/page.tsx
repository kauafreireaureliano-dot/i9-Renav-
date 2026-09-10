import Link from "next/link";
import { listVehicles } from "@/repositories/vehicle.repository";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { VEHICLE_STATUS_LABELS, VEHICLE_STATUS_TONE } from "@/lib/vehicle-status";
import { EstoqueSearch } from "./estoque-search";

export default async function EstoquePage({
  searchParams,
}: PageProps<"/estoque">) {
  const { search } = await searchParams;
  const vehicles = await listVehicles({
    search: typeof search === "string" ? search : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-sm text-muted-foreground">
            {vehicles.length} veículo(s) cadastrado(s)
          </p>
        </div>
        <Button asChild>
          <Link href="/estoque/novo">Cadastrar veículo</Link>
        </Button>
      </div>

      <EstoqueSearch defaultValue={typeof search === "string" ? search : ""} />

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Veículo</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>KM</TableHead>
              <TableHead>Compra</TableHead>
              <TableHead>Preço venda</TableHead>
              <TableHead>Margem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>RENAVE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((v) => {
              const costs = v.costs.reduce((acc, c) => acc + Number(c.amount), 0);
              const margin = Number(v.announcedPrice) - Number(v.purchaseValue) - costs;
              return (
                <TableRow key={v.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/estoque/veiculo/${v.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {v.brand} {v.model} {v.version}
                    </Link>
                    <p className="text-xs text-muted-foreground">{v.plate}</p>
                  </TableCell>
                  <TableCell>{v.yearModel}</TableCell>
                  <TableCell>{v.mileage.toLocaleString("pt-BR")} km</TableCell>
                  <TableCell>{formatCurrency(v.purchaseValue.toString())}</TableCell>
                  <TableCell>{formatCurrency(v.announcedPrice.toString())}</TableCell>
                  <TableCell className={margin >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {formatCurrency(margin)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={VEHICLE_STATUS_TONE[v.status]}>
                      {VEHICLE_STATUS_LABELS[v.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {v.renaveOperation?.status ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
            {vehicles.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum veículo encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
