// Contratos do domínio Fiscal (NF-e de entrada/saída via SEFAZ). Assim como em
// renave.ts, nenhuma URL, schema XML ou credencial real é assumida — apenas a
// forma esperada pelo restante do sistema.

export interface FiscalOperationContext {
  invoiceId: string;
  vehicleId: string;
  userId: string;
}

export interface FiscalCallResult<T> {
  success: boolean;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
  raw: {
    request: unknown;
    response: unknown;
  };
}

export interface EmissaoResult {
  number: string;
  series: string;
  accessKey: string;
  protocol: string;
  status: "AUTORIZADA" | "REJEITADA";
  xmlUrl?: string;
}

export interface ConsultaNotaResult {
  status: "PENDENTE" | "AUTORIZADA" | "REJEITADA" | "CANCELADA";
  returnMessage?: string;
}

export interface FiscalProvider {
  emitirNotaEntrada(
    ctx: FiscalOperationContext,
    payload: Record<string, unknown>
  ): Promise<FiscalCallResult<EmissaoResult>>;
  emitirNotaSaida(
    ctx: FiscalOperationContext,
    payload: Record<string, unknown>
  ): Promise<FiscalCallResult<EmissaoResult>>;
  consultarNota(ctx: FiscalOperationContext): Promise<FiscalCallResult<ConsultaNotaResult>>;
  cancelarNota(
    ctx: FiscalOperationContext,
    reason: string
  ): Promise<FiscalCallResult<{ cancelada: boolean }>>;
  baixarXML(ctx: FiscalOperationContext): Promise<FiscalCallResult<{ xmlUrl: string }>>;
  consultarStatus(): Promise<FiscalCallResult<{ online: boolean }>>;
}
