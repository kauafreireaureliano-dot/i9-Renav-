import { listAllDocuments } from "@/repositories/document.repository";
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
import { formatDate } from "@/lib/format";
import { DocumentUploadDialog } from "./document-upload-dialog";

export default async function DocumentosPage() {
  const [documents, vehicles] = await Promise.all([listAllDocuments(), listVehicles()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            Central de documentos — CRLV, ATPV, notas fiscais, contratos e comprovantes
          </p>
        </div>
        <DocumentUploadDialog vehicles={vehicles} />
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Enviado por</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Arquivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.type}</TableCell>
                <TableCell>
                  {d.vehicle ? `${d.vehicle.brand} ${d.vehicle.model}` : "—"}
                </TableCell>
                <TableCell>{d.uploadedBy.name}</TableCell>
                <TableCell>{formatDate(d.createdAt)}</TableCell>
                <TableCell>
                  <Badge variant={d.status === "APROVADO" ? "secondary" : "outline"}>
                    {d.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <a
                    href={`/api/documents/${d.id}/file`}
                    target="_blank"
                    className="text-primary hover:underline text-sm"
                  >
                    Abrir
                  </a>
                </TableCell>
              </TableRow>
            ))}
            {documents.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum documento enviado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
