import { describe, it, expect } from "vitest";
import { mockRenaveService } from "./mock-renave.service";
import type { RenaveOperationContext } from "@/domain/renave";

function ctx(overrides: Partial<RenaveOperationContext> = {}): RenaveOperationContext {
  return {
    vehicleId: "vehicle-1",
    renavam: "12345678901",
    chassis: "9BWZZZ377VT004251",
    plate: "ABC1D23",
    userId: "user-1",
    ...overrides,
  };
}

describe("mockRenaveService", () => {
  it("retorna apto para RENAVAM sem restrição simulada", async () => {
    const result = await mockRenaveService.consultarAptidao(ctx());
    expect(result.success).toBe(true);
    expect(result.data?.apto).toBe(true);
  });

  it("retorna não apto para RENAVAM terminado em 0 (restrição simulada)", async () => {
    const result = await mockRenaveService.consultarAptidao(ctx({ renavam: "12345678900" }));
    expect(result.success).toBe(true);
    expect(result.data?.apto).toBe(false);
    expect(result.data?.motivo).toBeDefined();
  });

  it("solicitarEntradaEstoque retorna protocolo e status concluído", async () => {
    const result = await mockRenaveService.solicitarEntradaEstoque(ctx());
    expect(result.success).toBe(true);
    expect(result.data?.protocolo).toMatch(/^MOCK-ENT-/);
  });

  it("enviarNotaFiscalEntrada falha sem chave de acesso", async () => {
    const result = await mockRenaveService.enviarNotaFiscalEntrada(ctx(), "");
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("RENAVE_NF_INVALIDA");
  });

  it("nunca lança exceção e sempre retorna o payload sanitizável em raw", async () => {
    const result = await mockRenaveService.consultarAptidao(ctx());
    expect(result.raw.request).toBeDefined();
    expect(result.raw.response).toBeDefined();
  });
});
