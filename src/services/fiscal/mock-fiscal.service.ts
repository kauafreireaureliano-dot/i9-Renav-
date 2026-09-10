import { randomUUID, randomBytes } from "crypto";
import type {
  FiscalProvider,
  FiscalOperationContext,
  FiscalCallResult,
  EmissaoResult,
  ConsultaNotaResult,
} from "@/domain/fiscal";

// Implementação MOCK/SANDBOX do FiscalProvider. Simula emissão/autorização de
// NF-e sem se conectar à SEFAZ. Nunca usada quando FISCAL_ENVIRONMENT=PRODUCAO.

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fakeAccessKey() {
  return randomBytes(22).toString("hex").slice(0, 44);
}

function ok<T>(data: T, request: unknown): FiscalCallResult<T> {
  return { success: true, data, raw: { request, response: data } };
}

export const mockFiscalService: FiscalProvider = {
  async emitirNotaEntrada(
    ctx: FiscalOperationContext,
    payload: Record<string, unknown>
  ): Promise<FiscalCallResult<EmissaoResult>> {
    await delay(600);
    return ok<EmissaoResult>(
      {
        number: String(Math.floor(100000 + Math.random() * 900000)),
        series: "1",
        accessKey: fakeAccessKey(),
        protocol: `MOCK-PROT-${randomUUID()}`,
        status: "AUTORIZADA",
        xmlUrl: undefined,
      },
      { ctx, payload }
    );
  },

  async emitirNotaSaida(
    ctx: FiscalOperationContext,
    payload: Record<string, unknown>
  ): Promise<FiscalCallResult<EmissaoResult>> {
    await delay(600);
    return ok<EmissaoResult>(
      {
        number: String(Math.floor(100000 + Math.random() * 900000)),
        series: "1",
        accessKey: fakeAccessKey(),
        protocol: `MOCK-PROT-${randomUUID()}`,
        status: "AUTORIZADA",
        xmlUrl: undefined,
      },
      { ctx, payload }
    );
  },

  async consultarNota(ctx: FiscalOperationContext): Promise<FiscalCallResult<ConsultaNotaResult>> {
    await delay(300);
    return ok<ConsultaNotaResult>({ status: "AUTORIZADA" }, ctx);
  },

  async cancelarNota(ctx: FiscalOperationContext, reason: string) {
    await delay(400);
    return ok({ cancelada: true }, { ctx, reason });
  },

  async baixarXML(ctx: FiscalOperationContext) {
    await delay(200);
    return ok({ xmlUrl: `https://sandbox.mock/xml/${ctx.invoiceId}.xml` }, ctx);
  },

  async consultarStatus() {
    await delay(150);
    return ok({ online: true }, {});
  },
};
