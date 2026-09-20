import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

// Proxy autenticado para o PDF (DANFE) ou XML de uma nota emitida pela
// Notaas. Necessário porque esses links exigem a chave de API da Notaas —
// não dá pra simplesmente mandar o link pro contador clicar, ele não tem
// (nem deve ter) essa credencial. Aqui a gente busca o arquivo usando nossa
// própria chave e entrega pra qualquer usuário logado no sistema.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN", "GERENTE", "FINANCEIRO", "DOCUMENTACAO", "VENDEDOR");

    const { id } = await params;
    const format = req.nextUrl.searchParams.get("format") === "xml" ? "xml" : "pdf";

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return NextResponse.json({ error: "Nota não encontrada" }, { status: 404 });
    }

    const fileUrl = format === "xml" ? invoice.xmlUrl : invoice.pdfUrl;

    if (invoice.environment !== "PRODUCAO" || !fileUrl) {
      return NextResponse.json(
        {
          error:
            invoice.environment !== "PRODUCAO"
              ? "Esta nota foi emitida em ambiente de teste (MOCK) e não tem arquivo real para exibir."
              : "Arquivo ainda não disponível para esta nota.",
        },
        { status: 404 }
      );
    }

    const apiKey = process.env.NOTAAS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "NOTAAS_API_KEY não configurada" }, { status: 500 });
    }

    const upstream = await fetch(fileUrl, { headers: { "x-api-key": apiKey } });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Falha ao buscar o arquivo na Notaas (HTTP ${upstream.status})` },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": format === "xml" ? "application/xml" : "application/pdf",
        "Content-Disposition": `inline; filename="nf-${invoice.type.toLowerCase()}-${invoice.number ?? id}.${format}"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
