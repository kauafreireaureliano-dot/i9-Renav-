import { prisma } from "@/lib/prisma";
import { sanitizeForLog } from "@/lib/sanitize";
import { mockFiscalService } from "./mock-fiscal.service";
import { realFiscalProvider } from "./real-fiscal.provider";
import type { FiscalProvider, FiscalCallResult } from "@/domain/fiscal";
import type { InvoiceType } from "@prisma/client";

function getEnvironment(): "MOCK" | "PRODUCAO" {
  return process.env.FISCAL_ENVIRONMENT === "PRODUCAO" ? "PRODUCAO" : "MOCK";
}

function getProvider(): FiscalProvider {
  return getEnvironment() === "PRODUCAO" ? realFiscalProvider : mockFiscalService;
}

async function recordEvent<T>(
  invoiceId: string | undefined,
  userId: string,
  operation: string,
  result: FiscalCallResult<T>
) {
  await prisma.fiscalOperation.create({
    data: {
      invoiceId,
      operation,
      status: result.success ? "SUCESSO" : "ERRO",
      requestSanitized: sanitizeForLog(result.raw.request) as never,
      responseSanitized: sanitizeForLog(result.raw.response) as never,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      environment: getEnvironment(),
      userId,
    },
  });
}

async function emitir(
  type: InvoiceType,
  vehicleId: string,
  userId: string,
  payload: { issuer: string; recipient: string; value: number }
) {
  const invoice = await prisma.invoice.create({
    data: {
      vehicleId,
      type,
      value: payload.value,
      issuer: payload.issuer,
      recipient: payload.recipient,
      environment: getEnvironment(),
      status: "PENDENTE",
    },
  });

  const provider = getProvider();
  const ctx = { invoiceId: invoice.id, vehicleId, userId };
  const result =
    type === "ENTRADA"
      ? await provider.emitirNotaEntrada(ctx, payload)
      : await provider.emitirNotaSaida(ctx, payload);

  await recordEvent(invoice.id, userId, type === "ENTRADA" ? "emitirNotaEntrada" : "emitirNotaSaida", result);

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: result.success
      ? {
          number: result.data!.number,
          series: result.data!.series,
          accessKey: result.data!.accessKey,
          protocol: result.data!.protocol,
          status: result.data!.status,
          xmlUrl: result.data!.xmlUrl,
          issueDate: new Date(),
        }
      : { status: "REJEITADA", returnMessage: result.errorMessage },
  });

  return { invoice: updated, result };
}

export const FiscalService = {
  environment: getEnvironment,

  emitirNotaEntrada: (vehicleId: string, userId: string, payload: { issuer: string; recipient: string; value: number }) =>
    emitir("ENTRADA", vehicleId, userId, payload),

  emitirNotaSaida: (vehicleId: string, userId: string, payload: { issuer: string; recipient: string; value: number }) =>
    emitir("SAIDA", vehicleId, userId, payload),

  async consultarNota(invoiceId: string, userId: string) {
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const result = await getProvider().consultarNota({
      invoiceId,
      vehicleId: invoice.vehicleId,
      userId,
    });
    await recordEvent(invoiceId, userId, "consultarNota", result);
    return result;
  },

  async cancelarNota(invoiceId: string, userId: string, reason: string) {
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const result = await getProvider().cancelarNota(
      { invoiceId, vehicleId: invoice.vehicleId, userId },
      reason
    );
    await recordEvent(invoiceId, userId, "cancelarNota", result);
    if (result.success) {
      await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "CANCELADA" } });
    }
    return result;
  },

  async baixarXML(invoiceId: string, userId: string) {
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const result = await getProvider().baixarXML({ invoiceId, vehicleId: invoice.vehicleId, userId });
    await recordEvent(invoiceId, userId, "baixarXML", result);
    return result;
  },
};
