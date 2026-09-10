import { listPurchases, listAvailableVehiclesForPurchase } from "@/repositories/purchase.repository";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { PurchaseFormDialog } from "./purchase-form-dialog";

export default async function ComprasPage() {
  const [purchases, vehicles] = await Promise.all([
    listPurchases(),
    listAvailableVehiclesForPurchase(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-sm text-muted-foreground">Entradas de veículos registradas</p>
        </div>
        <PurchaseFormDialog vehicles={vehicles} />
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Veículo</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.vehicle.brand} {p.vehicle.model}
                </TableCell>
                <TableCell>{p.seller.name}</TableCell>
                <TableCell>{formatCurrency(p.value.toString())}</TableCell>
                <TableCell>{formatDate(p.purchaseDate)}</TableCell>
                <TableCell>{p.status}</TableCell>
              </TableRow>
            ))}
            {purchases.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma compra registrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
