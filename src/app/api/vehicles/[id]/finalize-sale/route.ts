import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// Última etapa do fluxo de venda: confirma saída RENAVE + NF já emitidas e
// tira o veículo do estoque de vez.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("ADMIN", "GERENTE", "VENDEDOR");
    const { id } = await params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { sale: true, renaveOperation: { include: { events: true } }, invoices: true },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });
    }

    if (!vehicle.sale) {
      return NextResponse.json({ error: "Nenhuma venda registrada para este veículo." }, { status: 422 });
    }

    const saidaOk = vehicle.renaveOperation?.events.some(
      (e) => e.operation === "solicitarSaidaEstoque" && e.status === "SUCESSO"
    );
    const nfSaidaOk = vehicle.invoices.some((i) => i.type === "SAIDA" && i.status === "AUTORIZADA");

    if (!saidaOk || !nfSaidaOk) {
      return NextResponse.json(
        { error: "Saída RENAVE e NF de saída precisam estar concluídas antes de finalizar a venda." },
        { status: 422 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const v = await tx.vehicle.update({ where: { id }, data: { status: "VENDIDO" } });
      await tx.sale.update({ where: { id: vehicle.sale!.id }, data: { status: "CONCLUIDA" } });
      await tx.vehicleEvent.create({
        data: {
          vehicleId: id,
          type: "STATUS_CHANGE",
          message: "Venda finalizada. Veículo saiu do estoque.",
        },
      });
      return v;
    });

    await logAudit({
      userId: user.id,
      action: "SALE_FINALIZE",
      entityType: "Vehicle",
      entityId: id,
      after: { status: updated.status },
    });

    return NextResponse.json({ vehicle: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
