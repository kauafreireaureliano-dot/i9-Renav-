import type { VehicleStatus } from "@prisma/client";

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  AGUARDANDO_ENTRADA: "Aguardando entrada",
  EM_ESTOQUE: "Em estoque",
  RESERVADO: "Reservado",
  VENDIDO: "Vendido",
  AGUARDANDO_DOCUMENTACAO: "Aguardando documentação",
  DOCUMENTACAO_PENDENTE: "Documentação pendente",
  SAIDA_SOLICITADA: "Saída solicitada",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export const VEHICLE_STATUS_TONE: Record<
  VehicleStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  AGUARDANDO_ENTRADA: "outline",
  EM_ESTOQUE: "default",
  RESERVADO: "secondary",
  VENDIDO: "secondary",
  AGUARDANDO_DOCUMENTACAO: "outline",
  DOCUMENTACAO_PENDENTE: "destructive",
  SAIDA_SOLICITADA: "outline",
  FINALIZADO: "secondary",
  CANCELADO: "destructive",
};
