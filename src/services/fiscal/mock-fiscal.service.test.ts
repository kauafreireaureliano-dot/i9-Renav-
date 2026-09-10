import { describe, it, expect } from "vitest";
import { mockFiscalService } from "./mock-fiscal.service";

const ctx = { invoiceId: "inv-1", vehicleId: "vehicle-1", userId: "user-1" };

describe("mockFiscalService", () => {
  it("emite nota de entrada autorizada com chave de acesso de 44 caracteres", async () => {
    const result = await mockFiscalService.emitirNotaEntrada(ctx, {
      issuer: "Vendedor",
      recipient: "I9 Car",
      value: 78000,
    });

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("AUTORIZADA");
    expect(result.data?.accessKey).toHaveLength(44);
  });

  it("emite nota de saída autorizada", async () => {
    const result = await mockFiscalService.emitirNotaSaida(ctx, {
      issuer: "I9 Car",
      recipient: "Comprador",
      value: 99900,
    });
    expect(result.success).toBe(true);
    expect(result.data?.number).toBeDefined();
  });

  it("consultarStatus reporta ambiente online", async () => {
    const result = await mockFiscalService.consultarStatus();
    expect(result.data?.online).toBe(true);
  });

  it("cancelarNota retorna sucesso", async () => {
    const result = await mockFiscalService.cancelarNota(ctx, "Erro no pedido");
    expect(result.success).toBe(true);
    expect(result.data?.cancelada).toBe(true);
  });
});
