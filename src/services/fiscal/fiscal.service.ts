import { prisma } from "@/lib/prisma";
import { sanitizeForLog } from "@/lib/sanitize";
import { mockFiscalService } from "./mock-fiscal.service";
import { realFiscalProvider } from "./real-fiscal.provider";
import type { FiscalProvider, FiscalCallResult, FiscalInvoicePayload } from "@/domain/fiscal";
import type { InvoiceType } from "@prisma/client";

// Valores-padrão de CFOP/NCM para venda/compra de veículo usado. São um
// PALPITE RAZOÁVEL, não uma definição fiscal — a contadora precisa confirmar
// (revenda de usados costuma ter tratamento de ICMS diferenciado por estado,
// ex: Convênio ICMS 51/2000). Ajustáveis via .env sem precisar redeploy de código.
const DEFAULT_NCM_VEICULO = "87032310";
const DEFAULT_CFOP_ENTRADA = "1102";
const DEFAULT_CFOP_SAIDA = "5102";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

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

async function buildInvoicePayload(
  type: InvoiceType,
  vehicleId: string,
  basic: { issuer: string; recipient: string; value: number }
): Promise<{ payload: FiscalInvoicePayload; validationError?: string }> {
  const vehicle = await prisma.vehicle.findUniqueOrThrow({
    where: { id: vehicleId },
    include: {
      purchase: { include: { seller: true } },
      sale: { include: { buyer: true } },
    },
  });

  const counterpart = type === "ENTRADA" ? vehicle.purchase?.seller : vehicle.sale?.buyer;
  const itemDescription = `${vehicle.brand} ${vehicle.model} ${vehicle.version ?? ""} - placa ${vehicle.plate} - chassi ${vehicle.chassis}`.trim();

  const payload: FiscalInvoicePayload = {
    ...basic,
    naturezaOperacao: type === "ENTRADA" ? "Compra de veículo usado" : "Venda de veículo usado",
    recipientDocument: counterpart ? onlyDigits(counterpart.document) : "",
    recipientDocumentType: counterpart?.documentType === "CNPJ" ? "CNPJ" : "CPF",
    recipientAddress: counterpart
      ? {
          logradouro: counterpart.address ?? undefined,
          cidade: counterpart.city ?? undefined,
          uf: counterpart.state ?? undefined,
        }
      : undefined,
    itemDescription,
    ncm: process.env.FISCAL_NCM_VEICULO ?? DEFAULT_NCM_VEICULO,
    cfop:
      type === "ENTRADA"
        ? (process.env.FISCAL_CFOP_ENTRADA ?? DEFAULT_CFOP_ENTRADA)
        : (process.env.FISCAL_CFOP_SAIDA ?? DEFAULT_CFOP_SAIDA),
  };

  if (getEnvironment() === "PRODUCAO" && !payload.recipientDocument) {
    return {
      payload,
      validationError:
        "Não foi possível montar a NF-e: o comprador/vendedor deste veículo não tem CPF/CNPJ cadastrado.",
    };
  }

  return { payload };
}

async function emitir(
  type: InvoiceType,
  vehicleId: string,
  userId: string,
  basic: { issuer: string; recipient: string; value: number }
) {
  const invoice = await prisma.invoice.create({
    data: {
      vehicleId,
      type,
      value: basic.value,
      issuer: basic.issuer,
      recipient: basic.recipient,
      environment: getEnvironment(),
      status: "PENDENTE",
    },
  });

  const { payload, validationError } = await buildInvoicePayload(type, vehicleId, basic);

  if (validationError) {
    const result: FiscalCallResult<never> = {
      success: false,
      errorCode: "DADOS_INCOMPLETOS",
      errorMessage: validationError,
      raw: { request: payload, response: null },
    };
    await recordEvent(invoice.id, userId, type === "ENTRADA" ? "emitirNotaEntrada" : "emitirNotaSaida", result);
    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "REJEITADA", returnMessage: validationError },
    });
    return { invoice: updated, result };
  }

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
