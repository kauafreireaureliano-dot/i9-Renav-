import { prisma } from "@/lib/prisma";

export function listPendingCharges() {
  return prisma.renaveCharge.findMany({
    where: { status: "PENDENTE" },
    include: { vehicle: { select: { plate: true, brand: true, model: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function getPendingTotal(): Promise<number> {
  const result = await prisma.renaveCharge.aggregate({
    where: { status: "PENDENTE" },
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}

// Marca as cobranças específicas (já etiquetadas com este paymentId no
// momento em que o Pix foi gerado) como pagas. Não usa "tudo que está
// pendente agora" para evitar que uma cobrança criada DEPOIS do Pix ser
// gerado seja quitada por engano junto.
export function tagChargesWithPayment(ids: string[], paymentId: string) {
  return prisma.renaveCharge.updateMany({
    where: { id: { in: ids }, status: "PENDENTE" },
    data: { paymentId },
  });
}

export function confirmChargesByPayment(paymentId: string) {
  return prisma.renaveCharge.updateMany({
    where: { paymentId, status: "PENDENTE" },
    data: { status: "PAGO", paidAt: new Date() },
  });
}

export function listRecentPaid() {
  return prisma.renaveCharge.findMany({
    where: { status: "PAGO" },
    orderBy: { paidAt: "desc" },
    take: 10,
  });
}
