import type { VehicleStatus } from "@prisma/client";

// Lógica pura (sem I/O) que decide em que ponto do fluxo guiado de compra ou
// venda um veículo está, a partir do histórico real de eventos RENAVE e das
// notas fiscais já emitidas — em vez de depender só do campo de status atual
// (que guarda apenas o ÚLTIMO estado, não o histórico de etapas concluídas).

export type FlowStepStatus = "done" | "available" | "blocked" | "warning";

export interface FlowStep {
  key: string;
  label: string;
  action: string;
  status: FlowStepStatus;
  detail?: string;
}

export interface RenaveEventLite {
  operation: string;
  status: "SUCESSO" | "ERRO";
  responseSanitized?: unknown;
}

export interface InvoiceLite {
  type: "ENTRADA" | "SAIDA";
  status: string;
}

function findSuccess(events: RenaveEventLite[], operation: string): RenaveEventLite | undefined {
  return events.find((e) => e.operation === operation && e.status === "SUCESSO");
}

export function getPurchaseFlowSteps(params: {
  events: RenaveEventLite[];
  invoices: InvoiceLite[];
  vehicleStatus: VehicleStatus;
}): FlowStep[] {
  const { events, invoices, vehicleStatus } = params;

  const aptidaoEvent = findSuccess(events, "consultarAptidao");
  const apto = aptidaoEvent
    ? (aptidaoEvent.responseSanitized as { apto?: boolean } | undefined)?.apto !== false
    : undefined;
  const entradaDone = !!findSuccess(events, "solicitarEntradaEstoque");
  const atpvDone = !!findSuccess(events, "consultarAtpv");
  const nfEntradaDone = invoices.some((i) => i.type === "ENTRADA" && i.status === "AUTORIZADA");
  const stockConfirmed = !["AGUARDANDO_ENTRADA", "AGUARDANDO_DOCUMENTACAO", "DOCUMENTACAO_PENDENTE"].includes(
    vehicleStatus
  );

  const aptidaoStatus: FlowStepStatus = !aptidaoEvent ? "available" : apto ? "done" : "warning";

  return [
    {
      key: "aptidao",
      label: "Consultar aptidão",
      action: "consultarAptidao",
      status: aptidaoStatus,
      detail: aptidaoStatus === "warning" ? "Veículo não apto para entrada" : undefined,
    },
    {
      key: "entrada",
      label: "Solicitar entrada em estoque",
      action: "solicitarEntradaEstoque",
      status: entradaDone ? "done" : apto === true ? "available" : "blocked",
    },
    {
      key: "atpv",
      label: "Consultar assinatura do ATPV",
      action: "consultarAtpv",
      status: atpvDone ? "done" : entradaDone ? "available" : "blocked",
    },
    {
      key: "nf-entrada",
      label: "Registrar NF de entrada",
      action: "emitirNotaEntrada",
      status: nfEntradaDone ? "done" : atpvDone ? "available" : "blocked",
    },
    {
      key: "confirmar",
      label: "Confirmar documentação (estoque ativo)",
      action: "confirmarEstoque",
      status: stockConfirmed ? "done" : nfEntradaDone ? "available" : "blocked",
    },
  ];
}

export function getSaleFlowSteps(params: {
  events: RenaveEventLite[];
  invoices: InvoiceLite[];
  vehicleStatus: VehicleStatus;
}): FlowStep[] {
  const { events, invoices, vehicleStatus } = params;

  const saidaDone = !!findSuccess(events, "solicitarSaidaEstoque");
  const atpvDone = !!findSuccess(events, "consultarAtpv");
  const nfSaidaDone = invoices.some((i) => i.type === "SAIDA" && i.status === "AUTORIZADA");
  const finalized = vehicleStatus === "VENDIDO" || vehicleStatus === "FINALIZADO";

  return [
    {
      key: "saida",
      label: "Solicitar saída RENAVE",
      action: "solicitarSaidaEstoque",
      status: saidaDone ? "done" : "available",
    },
    {
      key: "atpv",
      label: "Consultar assinatura do ATPV",
      action: "consultarAtpv",
      status: atpvDone ? "done" : saidaDone ? "available" : "blocked",
    },
    {
      key: "nf-saida",
      label: "Emitir NF de saída",
      action: "emitirNotaSaida",
      status: nfSaidaDone ? "done" : atpvDone ? "available" : "blocked",
    },
    {
      key: "finalizar",
      label: "Finalizar venda",
      action: "finalizarVenda",
      status: finalized ? "done" : nfSaidaDone ? "available" : "blocked",
    },
  ];
}

export function getActiveFlow(vehicle: {
  status: VehicleStatus;
  hasPurchase: boolean;
  hasSale: boolean;
}): "compra" | "venda" | "none" {
  if (vehicle.hasSale && ["RESERVADO", "SAIDA_SOLICITADA"].includes(vehicle.status)) {
    return "venda";
  }
  if (
    vehicle.hasPurchase &&
    ["AGUARDANDO_ENTRADA", "AGUARDANDO_DOCUMENTACAO", "DOCUMENTACAO_PENDENTE"].includes(vehicle.status)
  ) {
    return "compra";
  }
  return "none";
}
