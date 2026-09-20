import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions";
import { FiscalService } from "@/services/fiscal/fiscal.service";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const emitSchema = z.object({
  vehicleId: z.string().uuid(),
  type: z.enum(["ENTRADA", "SAIDA"]),
  issuer: z.string().min(1),
  recipient: z.string().min(1),
  value: z.coerce.number().min(0),
});

export async function GET() {
  try {
    await requireRole("ADMIN", "GERENTE", "FINANCEIRO", "DOCUMENTACAO");
    const invoices = await prisma.invoice.findMany({
      include: { vehicle: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ invoices });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("ADMIN", "GERENTE", "FINANCEIRO", "DOCUMENTACAO");
    if (!hasPermission(user.role, "fiscal.emit")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = emitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { vehicleId, type, ...payload } = parsed.data;

    const { invoice, result } =
      type === "ENTRADA"
        ? await FiscalService.emitirNotaEntrada(vehicleId, user.id, payload)
        : await FiscalService.emitirNotaSaida(vehicleId, user.id, payload);

    await logAudit({
      userId: user.id,
      action: type === "ENTRADA" ? "INVOICE_ENTRADA_EMIT" : "INVOICE_SAIDA_EMIT",
      entityType: "Invoice",
      entityId: invoice.id,
      after: { status: invoice.status },
    });

    if (!result.success) {
      return NextResponse.json(
        { invoice, error: result.errorMessage ?? "Falha na emissão" },
        { status: 422 }
      );
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
