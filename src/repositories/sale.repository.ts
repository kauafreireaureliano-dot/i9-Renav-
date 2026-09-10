import { prisma } from "@/lib/prisma";
import type { CreateSaleInput } from "@/lib/validation/sale";

export function listSales() {
  return prisma.sale.findMany({
    include: { vehicle: true, buyer: true, createdBy: true },
    orderBy: { createdAt: "desc" },
  });
}

export function listAvailableVehiclesForSale() {
  return prisma.vehicle.findMany({
    where: { sale: null, status: "EM_ESTOQUE" },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSale(input: CreateSaleInput, createdById: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({ data: { ...input, createdById } });
    await tx.vehicle.update({
      where: { id: input.vehicleId },
      data: { status: "RESERVADO" },
    });
    await tx.vehicleEvent.create({
      data: {
        vehicleId: input.vehicleId,
        type: "SALE_CREATED",
        message: "Venda registrada. Veículo reservado até a conclusão da saída.",
      },
    });
    return sale;
  });
}
