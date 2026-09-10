import { prisma } from "@/lib/prisma";
import type { CreatePurchaseInput } from "@/lib/validation/purchase";

export function listPurchases() {
  return prisma.purchase.findMany({
    include: { vehicle: true, seller: true, createdBy: true },
    orderBy: { createdAt: "desc" },
  });
}

export function listAvailableVehiclesForPurchase() {
  return prisma.vehicle.findMany({
    where: { purchase: null, status: { in: ["AGUARDANDO_ENTRADA", "EM_ESTOQUE"] } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPurchase(input: CreatePurchaseInput, createdById: string) {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: { ...input, createdById },
    });
    await tx.vehicleEvent.create({
      data: {
        vehicleId: input.vehicleId,
        type: "PURCHASE_CREATED",
        message: "Compra registrada e associada ao vendedor.",
      },
    });
    return purchase;
  });
}
