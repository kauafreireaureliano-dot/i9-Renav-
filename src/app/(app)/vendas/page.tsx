import { listSales, listAvailableVehiclesForSale } from "@/repositories/sale.repository";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { SaleFormDialog } from "./sale-form-dialog";

export default async function VendasPage() {
  const [sales, vehicles] = await Promise.all([listSales(), listAvailableVehiclesForSale()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendas</h1>
          <p className="text-sm text-muted-foreground">Saídas de veículos registradas</p>
        </div>
        <SaleFormDialog vehicles={vehicles} />
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Veículo</TableHead>
              <TableHead>Comprador</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  {s.vehicle.brand} {s.vehicle.model}
                </TableCell>
                <TableCell>{s.buyer.name}</TableCell>
                <TableCell>{formatCurrency(s.value.toString())}</TableCell>
                <TableCell>{formatDate(s.saleDate)}</TableCell>
                <TableCell>{s.paymentMethod}</TableCell>
                <TableCell>{s.status}</TableCell>
              </TableRow>
            ))}
            {sales.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma venda registrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
