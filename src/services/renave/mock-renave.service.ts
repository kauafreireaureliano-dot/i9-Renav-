import { randomUUID } from "crypto";
import type {
  RenaveProvider,
  RenaveOperationContext,
  RenaveCallResult,
  AptidaoResult,
  EntradaEstoqueResult,
  AtpvResult,
  SaidaEstoqueResult,
} from "@/domain/renave";

// Implementação MOCK/SANDBOX do RenaveProvider. Usada em desenvolvimento e
// enquanto a integração oficial com o RENAVE não é configurada (APP_MODE=mock).
// Nunca deve ser usada em produção — RenaveService (renave.service.ts) garante isso.

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ok<T>(data: T, request: unknown): RenaveCallResult<T> {
  return { success: true, requestId: randomUUID(), data, raw: { request, response: data } };
}

function fail<T>(code: string, message: string, request: unknown): RenaveCallResult<T> {
  return {
    success: false,
    requestId: randomUUID(),
    errorCode: code,
    errorMessage: message,
    raw: { request, response: { errorCode: code, errorMessage: message } },
  };
}

// RENAVAM terminado em "0" simula um veículo com restrição, para permitir
// testar o fluxo de "não apto" sem depender de sorteio aleatório.
function isSimulatedRestricted(renavam: string) {
  return renavam.endsWith("0");
}

export const mockRenaveService: RenaveProvider = {
  async consultarAptidao(ctx: RenaveOperationContext): Promise<RenaveCallResult<AptidaoResult>> {
    await delay(400);
    if (isSimulatedRestricted(ctx.renavam)) {
      return ok<AptidaoResult>(
        {
          apto: false,
          motivo: "Veículo com restrição de débitos simulada no ambiente de teste.",
          restricoes: ["IPVA em aberto (simulado)"],
        },
        ctx
      );
    }
    return ok<AptidaoResult>({ apto: true }, ctx);
  },

  async solicitarEntradaEstoque(
    ctx: RenaveOperationContext
  ): Promise<RenaveCallResult<EntradaEstoqueResult>> {
    await delay(500);
    return ok<EntradaEstoqueResult>(
      { protocolo: `MOCK-ENT-${Date.now()}`, status: "CONCLUIDA" },
      ctx
    );
  },

  async enviarAtpvAssinatura(ctx: RenaveOperationContext): Promise<RenaveCallResult<AtpvResult>> {
    await delay(500);
    return ok<AtpvResult>(
      {
        atpvId: `MOCK-ATPV-${Date.now()}`,
        status: "AGUARDANDO_ASSINATURA",
        urlAssinatura: "https://sandbox.mock/atpv/assinar",
      },
      ctx
    );
  },

  async consultarAtpv(ctx: RenaveOperationContext): Promise<RenaveCallResult<AtpvResult>> {
    await delay(300);
    return ok<AtpvResult>({ atpvId: `MOCK-ATPV-${ctx.vehicleId}`, status: "ASSINADO" }, ctx);
  },

  async enviarNotaFiscalEntrada(ctx, invoiceAccessKey) {
    await delay(300);
    if (!invoiceAccessKey) {
      return fail("RENAVE_NF_INVALIDA", "Chave de acesso da NF de entrada não informada.", ctx);
    }
    return ok({ aceito: true }, { ctx, invoiceAccessKey });
  },

  async consultarEstoque(ctx: RenaveOperationContext) {
    await delay(300);
    return ok({ noEstoque: true }, ctx);
  },

  async solicitarSaidaEstoque(
    ctx: RenaveOperationContext
  ): Promise<RenaveCallResult<SaidaEstoqueResult>> {
    await delay(500);
    return ok<SaidaEstoqueResult>(
      { protocolo: `MOCK-SAI-${Date.now()}`, status: "CONCLUIDA" },
      ctx
    );
  },

  async consultarSaidaEstoque(
    ctx: RenaveOperationContext
  ): Promise<RenaveCallResult<SaidaEstoqueResult>> {
    await delay(300);
    return ok<SaidaEstoqueResult>(
      { protocolo: `MOCK-SAI-${ctx.vehicleId}`, status: "CONCLUIDA" },
      ctx
    );
  },

  async enviarNotaFiscalSaida(ctx, invoiceAccessKey) {
    await delay(300);
    if (!invoiceAccessKey) {
      return fail("RENAVE_NF_INVALIDA", "Chave de acesso da NF de saída não informada.", ctx);
    }
    return ok({ aceito: true }, { ctx, invoiceAccessKey });
  },

  async cancelarEntrada(ctx: RenaveOperationContext) {
    await delay(300);
    return ok({ cancelado: true }, ctx);
  },

  async cancelarSaida(ctx: RenaveOperationContext) {
    await delay(300);
    return ok({ cancelado: true }, ctx);
  },
};
