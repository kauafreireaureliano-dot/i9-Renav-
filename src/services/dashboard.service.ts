import { prisma } from "@/lib/prisma";

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

export async function getDashboardData() {
  const { start, end } = monthRange();

  const [
    vehiclesInStock,
    purchasesThisMonth,
    salesThisMonth,
    stockVehicles,
    pendingDocs,
    renavePending,
    invoicesPending,
    recentSales,
    recentPurchases,
    notifications,
  ] = await Promise.all([
    prisma.vehicle.count({ where: { status: "EM_ESTOQUE" } }),
    prisma.purchase.aggregate({
      _sum: { value: true },
      _count: true,
      where: { purchaseDate: { gte: start, lt: end }, status: { not: "CANCELADA" } },
    }),
    prisma.sale.aggregate({
      _sum: { value: true },
      _count: true,
      where: { saleDate: { gte: start, lt: end }, status: { not: "CANCELADA" } },
    }),
    prisma.vehicle.findMany({
      where: { status: "EM_ESTOQUE" },
      include: { costs: true },
    }),
    prisma.vehicle.count({
      where: { status: { in: ["AGUARDANDO_DOCUMENTACAO", "DOCUMENTACAO_PENDENTE"] } },
    }),
    prisma.renaveOperation.count({
      where: { status: { in: ["NAO_APTO", "ERRO"] } },
    }),
    prisma.invoice.count({ where: { status: "PENDENTE" } }),
    prisma.sale.findMany({
      where: { saleDate: { gte: start, lt: end } },
      include: { vehicle: true, buyer: true },
      orderBy: { saleDate: "desc" },
      take: 5,
    }),
    prisma.purchase.findMany({
      where: { purchaseDate: { gte: start, lt: end } },
      include: { vehicle: true, seller: true },
      orderBy: { purchaseDate: "desc" },
      take: 5,
    }),
    prisma.notification.findMany({
      where: { read: false },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const stockCost = stockVehicles.reduce((acc, v) => {
    const costs = v.costs.reduce((c, item) => c + Number(item.amount), 0);
    return acc + Number(v.purchaseValue) + costs;
  }, 0);

  // margem estimada do mês: veículos vendidos no mês - custo total (compra + custos adicionais)
  const salesWithVehicle = await prisma.sale.findMany({
    where: { saleDate: { gte: start, lt: end }, status: { not: "CANCELADA" } },
    include: { vehicle: { include: { costs: true } } },
  });

  const estimatedMargin = salesWithVehicle.reduce((acc, sale) => {
    const vehicleCost =
      Number(sale.vehicle.purchaseValue) +
      sale.vehicle.costs.reduce((c, item) => c + Number(item.amount), 0);
    return acc + (Number(sale.value) - vehicleCost);
  }, 0);

  return {
    vehiclesInStock,
    purchasesThisMonth: {
      total: Number(purchasesThisMonth._sum.value ?? 0),
      count: purchasesThisMonth._count,
    },
    salesThisMonth: {
      total: Number(salesThisMonth._sum.value ?? 0),
      count: salesThisMonth._count,
    },
    estimatedMargin,
    stockCost,
    pendingDocs,
    renavePending,
    invoicesPending,
    recentSales,
    recentPurchases,
    notifications,
  };
}
