import { describe, it, expect } from "vitest";
import { hasPermission } from "./permissions";

describe("hasPermission", () => {
  it("ADMIN tem acesso total", () => {
    expect(hasPermission("ADMIN", "renave.cancel")).toBe(true);
    expect(hasPermission("ADMIN", "settings.fiscal.edit")).toBe(true);
  });

  it("VENDEDOR não pode cancelar RENAVE nem alterar configurações fiscais", () => {
    expect(hasPermission("VENDEDOR", "renave.cancel")).toBe(false);
    expect(hasPermission("VENDEDOR", "settings.fiscal.edit")).toBe(false);
  });

  it("VENDEDOR pode visualizar estoque, cadastrar cliente e criar venda", () => {
    expect(hasPermission("VENDEDOR", "vehicle.view")).toBe(true);
    expect(hasPermission("VENDEDOR", "customer.create")).toBe(true);
    expect(hasPermission("VENDEDOR", "sale.create")).toBe(true);
  });

  it("FINANCEIRO não pode criar veículo", () => {
    expect(hasPermission("FINANCEIRO", "vehicle.create")).toBe(false);
  });
});
