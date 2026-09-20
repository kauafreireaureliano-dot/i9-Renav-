import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions";
import { saveFile } from "@/lib/storage";
import { createDocument, listAllDocuments } from "@/repositories/document.repository";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const MAX_SIZE = 15 * 1024 * 1024; // 15MB

const metaSchema = z.object({
  vehicleId: z.string().uuid().optional(),
  ownerCustomerId: z.string().uuid().optional(),
  type: z.enum([
    "CRLV",
    "ATPV",
    "NF_ENTRADA",
    "NF_SAIDA",
    "DOCUMENTO_VENDEDOR",
    "DOCUMENTO_COMPRADOR",
    "CONTRATO",
    "COMPROVANTE",
    "OUTRO",
  ]),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const user = await requireRole("ADMIN", "GERENTE", "VENDEDOR", "FINANCEIRO", "DOCUMENTACAO");
    if (!hasPermission(user.role, "documents.view")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const documents = await listAllDocuments();
    return NextResponse.json({ documents });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("ADMIN", "GERENTE", "DOCUMENTACAO", "VENDEDOR");
    if (!hasPermission(user.role, "documents.upload")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Arquivo excede 15MB" }, { status: 400 });
    }

    const parsed = metaSchema.safeParse({
      vehicleId: formData.get("vehicleId") || undefined,
      ownerCustomerId: formData.get("ownerCustomerId") || undefined,
      type: formData.get("type"),
      notes: formData.get("notes") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUrl = await saveFile(buffer, file.name);

    const document = await createDocument({
      ...parsed.data,
      fileUrl,
      fileName: file.name,
      mimeType: file.type || undefined,
      uploadedById: user.id,
    });

    if (parsed.data.vehicleId) {
      const { prisma } = await import("@/lib/prisma");
      await prisma.vehicleEvent.create({
        data: {
          vehicleId: parsed.data.vehicleId,
          type: "DOCUMENT_ADDED",
          message: `Documento ${parsed.data.type} enviado.`,
        },
      });
    }

    await logAudit({
      userId: user.id,
      action: "DOCUMENT_UPLOAD",
      entityType: "Document",
      entityId: document.id,
      after: { type: document.type },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
