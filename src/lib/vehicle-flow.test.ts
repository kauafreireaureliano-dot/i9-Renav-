import { describe, it, expect } from "vitest";
import { getPurchaseFlowSteps, getSaleFlowSteps, getActiveFlow } from "./vehicle-flow";

describe("getPurchaseFlowSteps", () => {
  it("todas as etapas disponíveis apenas a primeira, quando nada foi feito", () => {
    const steps = getPurchaseFlowSteps({
      events: [],
      invoices: [],
      vehicleStatus: "AGUARDANDO_ENTRADA",
    });

    expect(steps[0].status).toBe("available"); // aptidão
    expect(steps[1].status).toBe("blocked"); // entrada
    expect(steps[2].status).toBe("blocked"); // atpv
    expect(steps[3].status).toBe("blocked"); // nf entrada
    expect(steps[4].status).toBe("blocked"); // confirmar
  });

  it("bloqueia entrada em estoque quando veículo não está apto", () => {
    const steps = getPurchaseFlowSteps({
      events: [
        { operation: "consultarAptidao", status: "SUCESSO", responseSanitized: { apto: false } },
      ],
      invoices: [],
      vehicleStatus: "AGUARDANDO_ENTRADA",
    });

    expect(steps[0].status).toBe("warning");
    expect(steps[1].status).toBe("blocked");
  });

  it("libera a próxima etapa conforme as anteriores são concluídas", () => {
    const steps = getPurchaseFlowSteps({
      events: [
        { operation: "consultarAptidao", status: "SUCESSO", responseSanitized: { apto: true } },
        { operation: "solicitarEntradaEstoque", status: "SUCESSO" },
      ],
      invoices: [],
      vehicleStatus: "AGUARDANDO_ENTRADA",
    });

    expect(steps[0].status).toBe("done");
    expect(steps[1].status).toBe("done");
    expect(steps[2].status).toBe("available"); // atpv liberado
    expect(steps[3].status).toBe("blocked"); // nf entrada ainda bloqueada
  });

  it("marca confirmar como concluído quando o veículo já saiu do estágio de entrada", () => {
    const steps = getPurchaseFlowSteps({
      events: [],
      invoices: [],
      vehicleStatus: "EM_ESTOQUE",
    });

    expect(steps[4].status).toBe("done");
  });
});

describe("getSaleFlowSteps", () => {
  it("solicitar saída sempre disponível como primeira etapa", () => {
    const steps = getSaleFlowSteps({ events: [], invoices: [], vehicleStatus: "RESERVADO" });
    expect(steps[0].status).toBe("available");
    expect(steps[1].status).toBe("blocked");
  });

  it("libera emissão de NF de saída só depois do ATPV", () => {
    const steps = getSaleFlowSteps({
      events: [
        { operation: "solicitarSaidaEstoque", status: "SUCESSO" },
        { operation: "consultarAtpv", status: "SUCESSO" },
      ],
      invoices: [],
      vehicleStatus: "RESERVADO",
    });
    expect(steps[2].status).toBe("available");
  });

  it("finalizar venda concluído quando o veículo já está VENDIDO", () => {
    const steps = getSaleFlowSteps({ events: [], invoices: [], vehicleStatus: "VENDIDO" });
    expect(steps[3].status).toBe("done");
  });
});

describe("getActiveFlow", () => {
  it("identifica fluxo de compra em andamento", () => {
    expect(
      getActiveFlow({ status: "AGUARDANDO_ENTRADA", hasPurchase: true, hasSale: false })
    ).toBe("compra");
  });

  it("identifica fluxo de venda em andamento", () => {
    expect(getActiveFlow({ status: "RESERVADO", hasPurchase: true, hasSale: true })).toBe("venda");
  });

  it("retorna none quando não há fluxo pendente", () => {
    expect(getActiveFlow({ status: "EM_ESTOQUE", hasPurchase: true, hasSale: false })).toBe(
      "none"
    );
    expect(getActiveFlow({ status: "FINALIZADO", hasPurchase: true, hasSale: true })).toBe("none");
  });
});
