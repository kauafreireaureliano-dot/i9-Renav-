import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// Última etapa do fluxo de compra: confirma que a documentação de entrada
// está completa e o veículo passa a ficar disponível para venda.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("ADMIN", "GERENTE", "DOCUMENTACAO");
    const { id } = await params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { purchase: true, renaveOperation: { include: { events: true } }, invoices: true },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });
    }

    const entradaOk = vehicle.renaveOperation?.events.some(
      (e) => e.operation === "solicitarEntradaEstoque" && e.status === "SUCESSO"
    );

    if (!entradaOk) {
      return NextResponse.json(
        { error: "Entrada em estoque ainda não foi concluída no RENAVE." },
        { status: 422 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const v = await tx.vehicle.update({ where: { id }, data: { status: "EM_ESTOQUE" } });
      if (vehicle.purchase) {
        await tx.purchase.update({ where: { id: vehicle.purchase.id }, data: { status: "CONCLUIDA" } });
      }
      await tx.vehicleEvent.create({
        data: {
          vehicleId: id,
          type: "STATUS_CHANGE",
          message: "Documentação de entrada confirmada. Veículo passou para estoque ativo.",
        },
      });
      return v;
    });

    await logAudit({
      userId: user.id,
      action: "VEHICLE_CONFIRM_STOCK",
      entityType: "Vehicle",
      entityId: id,
      after: { status: updated.status },
    });

    return NextResponse.json({ vehicle: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
