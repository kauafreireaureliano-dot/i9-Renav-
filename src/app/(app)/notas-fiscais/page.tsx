import { prisma } from "@/lib/prisma";
import { listVehicles } from "@/repositories/vehicle.repository";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { InvoiceEmitDialog } from "./invoice-emit-dialog";

export default async function NotasFiscaisPage() {
  const [invoices, vehicles] = await Promise.all([
    prisma.invoice.findMany({ include: { vehicle: true }, orderBy: { createdAt: "desc" } }),
    listVehicles(),
  ]);

  const entrada = invoices.filter((i) => i.type === "ENTRADA");
  const saida = invoices.filter((i) => i.type === "SAIDA");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notas Fiscais</h1>
          <p className="text-sm text-muted-foreground">Emissão e acompanhamento de NF-e</p>
        </div>
        <InvoiceEmitDialog vehicles={vehicles} />
      </div>

      <InvoiceTable title="NF de entrada" invoices={entrada} />
      <InvoiceTable title="NF de saída" invoices={saida} />
    </div>
  );
}

function InvoiceTable({
  title,
  invoices,
}: {
  title: string;
  invoices: Awaited<ReturnType<typeof prisma.invoice.findMany<{ include: { vehicle: true } }>>>;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Ambiente</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>{inv.number ?? "—"}</TableCell>
                <TableCell>
                  {inv.vehicle.brand} {inv.vehicle.model}
                </TableCell>
                <TableCell>{formatCurrency(inv.value.toString())}</TableCell>
                <TableCell>{inv.issueDate ? formatDate(inv.issueDate) : "—"}</TableCell>
                <TableCell>
                  <Badge variant={inv.environment === "PRODUCAO" ? "default" : "outline"}>
                    {inv.environment === "PRODUCAO" ? "PRODUÇÃO" : "TESTE"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={inv.status === "AUTORIZADA" ? "secondary" : "destructive"}>
                    {inv.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma nota registrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
