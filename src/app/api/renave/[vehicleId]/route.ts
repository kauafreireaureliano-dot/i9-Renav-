import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions";
import { RenaveService } from "@/services/renave/renave.service";

const actionSchema = z.object({
  action: z.enum([
    "consultarAptidao",
    "solicitarEntradaEstoque",
    "consultarAtpv",
    "solicitarSaidaEstoque",
    "consultarEstoque",
    "cancelarEntrada",
    "cancelarSaida",
    "consultarTermoEntrada",
    "consultarTermoSaida",
    "enviarAssinaturaAtpv",
  ]),
  fotoAssinadaBase64: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const user = await requireRole("ADMIN", "GERENTE", "VENDEDOR", "DOCUMENTACAO");
    const { vehicleId } = await params;

    const body = await req.json().catch(() => null);
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }

    const { action, fotoAssinadaBase64 } = parsed.data;

    const cancelActions = ["cancelarEntrada", "cancelarSaida"];
    const requiredPermission = cancelActions.includes(action) ? "renave.cancel" : "renave.request";

    if (!hasPermission(user.role, requiredPermission)) {
      return NextResponse.json({ error: "Sem permissão para esta operação" }, { status: 403 });
    }

    if (action === "enviarAssinaturaAtpv") {
      if (!fotoAssinadaBase64) {
        return NextResponse.json({ error: "Envie a foto do ATPV-e assinado" }, { status: 400 });
      }
      const result = await RenaveService.enviarAssinaturaAtpv(vehicleId, user.id, fotoAssinadaBase64);
      return NextResponse.json({ result });
    }

    const result = await RenaveService[action](vehicleId, user.id);

    return NextResponse.json({ result });
  } catch (err) {
    return handleApiError(err);
  }
}
