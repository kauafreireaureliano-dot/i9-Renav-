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
  pdfUrl?: string; // DANFE — o que um humano (contador, cliente) deve visualizar
}

export interface ConsultaNotaResult {
  status: "PENDENTE" | "AUTORIZADA" | "REJEITADA" | "CANCELADA";
  returnMessage?: string;
}

// Dados completos necessários para montar uma NF-e de verdade. issuer/recipient/value
// são os campos "de vitrine" (mostrados na tela); os demais só são exigidos pelo
// provider real (o MockFiscalService ignora tudo que não seja issuer/recipient/value).
export interface FiscalInvoicePayload {
  issuer: string;
  recipient: string;
  value: number;
  // 0 = nota de entrada, 1 = nota de saída — validado ao vivo contra o
  // sandbox da Notaas em 2026-09-16 (campo "tipoOperacao", numérico).
  tipoOperacao: 0 | 1;
  naturezaOperacao: string;
  recipientDocument: string; // CPF ou CNPJ, apenas dígitos
  recipientDocumentType: "CPF" | "CNPJ";
  recipientAddress?: {
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
    codigoMunicipio?: string; // código IBGE de 7 dígitos, obrigatório pela SEFAZ
  };
  itemDescription: string;
  ncm: string;
  cfop: string;
  // Redução de base de cálculo do ICMS (ex: revenda de veículo usado adquirido
  // de pessoa física — em PE, 20% da base, CST 20, conforme Decreto 44.650/2017,
  // art. 13, Anexo 3, art. 17). undefined = sem redução (base cheia).
  icms?: {
    cst: string;
    baseCalculoReduzidaPercentual?: number;
  };
}

export interface FiscalProvider {
  emitirNotaEntrada(
    ctx: FiscalOperationContext,
    payload: FiscalInvoicePayload
  ): Promise<FiscalCallResult<EmissaoResult>>;
  emitirNotaSaida(
    ctx: FiscalOperationContext,
    payload: FiscalInvoicePayload
  ): Promise<FiscalCallResult<EmissaoResult>>;
  consultarNota(ctx: FiscalOperationContext): Promise<FiscalCallResult<ConsultaNotaResult>>;
  cancelarNota(
    ctx: FiscalOperationContext,
    reason: string
  ): Promise<FiscalCallResult<{ cancelada: boolean }>>;
  baixarXML(ctx: FiscalOperationContext): Promise<FiscalCallResult<{ xmlUrl: string }>>;
  consultarStatus(): Promise<FiscalCallResult<{ online: boolean }>>;
}
