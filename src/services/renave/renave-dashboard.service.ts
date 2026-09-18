import { prisma } from "@/lib/prisma";

export async function getRenaveDashboardData() {
  const [
    entradasPendentes,
    entradasConcluidas,
    saidasPendentes,
    saidasConcluidas,
    erros,
    cancelamentos,
    ultimosEventos,
  ] = await Promise.all([
    prisma.renaveOperation.count({
      where: { status: { in: ["APTO", "APTIDAO_CONSULTADA", "ENTRADA_SOLICITADA"] } },
    }),
    prisma.renaveOperation.count({ where: { status: "ENTRADA_CONCLUIDA" } }),
    prisma.renaveOperation.count({ where: { status: "SAIDA_SOLICITADA" } }),
    prisma.renaveOperation.count({ where: { status: "SAIDA_CONCLUIDA" } }),
    prisma.renaveOperation.count({ where: { status: "ERRO" } }),
    prisma.renaveOperation.count({ where: { status: "CANCELADO" } }),
    prisma.renaveEvent.findMany({
      include: { renaveOperation: { include: { vehicle: true } }, user: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  return {
    entradasPendentes,
    entradasConcluidas,
    saidasPendentes,
    saidasConcluidas,
    erros,
    cancelamentos,
    ultimosEventos,
    environment:
      process.env.RENAVE_ENVIRONMENT === "PRODUCAO" || process.env.RENAVE_ENVIRONMENT === "HOMOLOGACAO"
        ? process.env.RENAVE_ENVIRONMENT
        : "MOCK",
  };
}
