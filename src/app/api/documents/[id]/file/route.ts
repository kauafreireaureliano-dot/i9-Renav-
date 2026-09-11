import { NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { getDocumentById } from "@/repositories/document.repository";
import { readStoredFile } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN", "GERENTE", "VENDEDOR", "FINANCEIRO", "DOCUMENTACAO");

    const { id } = await params;
    const document = await getDocumentById(id);
    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    const buffer = await readStoredFile(document.fileUrl);
    const fileName = document.fileName ?? document.fileUrl.split("/").pop() ?? "arquivo";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.mimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
