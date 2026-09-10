import { prisma } from "@/lib/prisma";
import { sanitizeForLog } from "@/lib/sanitize";
import { mockRenaveService } from "./mock-renave.service";
import { realRenaveProvider } from "./real-renave.provider";
import type { RenaveProvider, RenaveOperationContext, RenaveCallResult } from "@/domain/renave";
import type { RenaveOperationStatus } from "@prisma/client";

function getEnvironment(): "MOCK" | "PRODUCAO" {
  return process.env.RENAVE_ENVIRONMENT === "PRODUCAO" ? "PRODUCAO" : "MOCK";
}

function getProvider(): RenaveProvider {
  return getEnvironment() === "PRODUCAO" ? realRenaveProvider : mockRenaveService;
}

async function buildContext(vehicleId: string, userId: string): Promise<RenaveOperationContext> {
  const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
  return {
    vehicleId,
    renavam: vehicle.renavam,
    chassis: vehicle.chassis,
    plate: vehicle.plate,
    userId,
  };
}

async function recordEvent<T>(
  vehicleId: string,
  userId: string,
  operation: string,
  result: RenaveCallResult<T>
) {
  const renaveOperation = await prisma.renaveOperation.upsert({
    where: { vehicleId },
    create: { vehicleId, environment: getEnvironment() },
    update: { environment: getEnvironment(), lastCommunicationAt: new Date() },
  });

  await prisma.renaveEvent.create({
    data: {
      renaveOperationId: renaveOperation.id,
      operation,
      requestId: "requestId" in result ? result.requestId : undefined,
      status: result.success ? "SUCESSO" : "ERRO",
      requestSanitized: sanitizeForLog(result.raw.request) as never,
      responseSanitized: sanitizeForLog(result.raw.response) as never,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      environment: getEnvironment(),
      userId,
    },
  });

  return renaveOperation;
}

async function setStatus(vehicleId: string, status: RenaveOperationStatus, aptitudeResult?: string) {
  await prisma.renaveOperation.update({
    where: { vehicleId },
    data: { status, aptitudeResult },
  });
}

export const RenaveService = {
  environment: getEnvironment,

  async consultarAptidao(vehicleId: string, userId: string) {
    const ctx = await buildContext(vehicleId, userId);
    const result = await getProvider().consultarAptidao(ctx);
    await recordEvent(vehicleId, userId, "consultarAptidao", result);

    if (result.success && result.data) {
      await setStatus(
        vehicleId,
        result.data.apto ? "APTO" : "NAO_APTO",
        result.data.apto ? undefined : result.data.motivo
      );
    } else {
      await setStatus(vehicleId, "ERRO", result.errorMessage);
    }

    return result;
  },

  async solicitarEntradaEstoque(vehicleId: string, userId: string) {
    const ctx = await buildContext(vehicleId, userId);
    const result = await getProvider().solicitarEntradaEstoque(ctx);
    await recordEvent(vehicleId, userId, "solicitarEntradaEstoque", result);
    await setStatus(
      vehicleId,
      result.success ? "ENTRADA_CONCLUIDA" : "ERRO",
      result.success ? undefined : result.errorMessage
    );
    return result;
  },

  async enviarAtpvAssinatura(vehicleId: string, userId: string) {
    const ctx = await buildContext(vehicleId, userId);
    const result = await getProvider().enviarAtpvAssinatura(ctx);
    await recordEvent(vehicleId, userId, "enviarAtpvAssinatura", result);
    await setStatus(vehicleId, result.success ? "ATPV_ENVIADO" : "ERRO", result.errorMessage);
    return result;
  },

  async consultarAtpv(vehicleId: string, userId: string) {
    const ctx = await buildContext(vehicleId, userId);
    const result = await getProvider().consultarAtpv(ctx);
    await recordEvent(vehicleId, userId, "consultarAtpv", result);
    if (result.success && result.data?.status === "ASSINADO") {
      await setStatus(vehicleId, "ATPV_ASSINADO");
    }
    return result;
  },

  async solicitarSaidaEstoque(vehicleId: string, userId: string) {
    const ctx = await buildContext(vehicleId, userId);
    const result = await getProvider().solicitarSaidaEstoque(ctx);
    await recordEvent(vehicleId, userId, "solicitarSaidaEstoque", result);
    await setStatus(
      vehicleId,
      result.success ? "SAIDA_CONCLUIDA" : "ERRO",
      result.success ? undefined : result.errorMessage
    );
    return result;
  },

  async consultarSaidaEstoque(vehicleId: string, userId: string) {
    const ctx = await buildContext(vehicleId, userId);
    const result = await getProvider().consultarSaidaEstoque(ctx);
    await recordEvent(vehicleId, userId, "consultarSaidaEstoque", result);
    return result;
  },

  async enviarNotaFiscalEntrada(vehicleId: string, userId: string, accessKey: string) {
    const ctx = await buildContext(vehicleId, userId);
    const result = await getProvider().enviarNotaFiscalEntrada(ctx, accessKey);
    await recordEvent(vehicleId, userId, "enviarNotaFiscalEntrada", result);
    return result;
  },

  async enviarNotaFiscalSaida(vehicleId: string, userId: string, accessKey: string) {
    const ctx = await buildContext(vehicleId, userId);
    const result = await getProvider().enviarNotaFiscalSaida(ctx, accessKey);
    await recordEvent(vehicleId, userId, "enviarNotaFiscalSaida", result);
    return result;
  },

  async cancelarEntrada(vehicleId: string, userId: string) {
    const ctx = await buildContext(vehicleId, userId);
    const result = await getProvider().cancelarEntrada(ctx);
    await recordEvent(vehicleId, userId, "cancelarEntrada", result);
    await setStatus(vehicleId, "CANCELADO");
    return result;
  },

  async cancelarSaida(vehicleId: string, userId: string) {
    const ctx = await buildContext(vehicleId, userId);
    const result = await getProvider().cancelarSaida(ctx);
    await recordEvent(vehicleId, userId, "cancelarSaida", result);
    await setStatus(vehicleId, "CANCELADO");
    return result;
  },
};
