import { listCustomers } from "@/repositories/customer.repository";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerFormDialog } from "./customer-form-dialog";
import type { CustomerRole } from "@prisma/client";

const ROLE_LABELS: Record<CustomerRole, string> = {
  COMPRADOR: "Comprador",
  VENDEDOR: "Vendedor",
  FORNECEDOR: "Fornecedor",
};

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const { papel } = await searchParams;
  const role = typeof papel === "string" ? (papel as CustomerRole) : undefined;
  const customers = await listCustomers({ role });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {role ? `Clientes — ${ROLE_LABELS[role]}` : "Clientes"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Compradores, vendedores e fornecedores em um só cadastro
          </p>
        </div>
        <CustomerFormDialog />
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Papéis</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.document}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.phone ?? c.whatsapp ?? c.email ?? "—"}
                </TableCell>
                <TableCell>
                  {c.city ? `${c.city}/${c.state}` : "—"}
                </TableCell>
                <TableCell className="space-x-1">
                  {c.roles.map((r) => (
                    <Badge key={r} variant="secondary">
                      {ROLE_LABELS[r]}
                    </Badge>
                  ))}
                </TableCell>
                <TableCell className="text-right">
                  <CustomerFormDialog
                    customer={{
                      id: c.id,
                      name: c.name,
                      document: c.document,
                      documentType: c.documentType,
                      phone: c.phone,
                      whatsapp: c.whatsapp,
                      email: c.email,
                      address: c.address,
                      addressNumber: c.addressNumber,
                      neighborhood: c.neighborhood,
                      zipCode: c.zipCode,
                      city: c.city,
                      state: c.state,
                      roles: c.roles,
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum cliente cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
