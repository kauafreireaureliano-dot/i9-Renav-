import { NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getDocumentById, deleteDocument } from "@/repositories/document.repository";
import { deleteStoredFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("ADMIN", "GERENTE", "DOCUMENTACAO");
    if (!hasPermission(user.role, "documents.delete")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id } = await params;
    const document = await getDocumentById(id);
    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    await deleteDocument(id);
    await deleteStoredFile(document.fileUrl);

    await logAudit({
      userId: user.id,
      action: "DOCUMENT_DELETE",
      entityType: "Document",
      entityId: id,
      before: { type: document.type, fileName: document.fileName },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
