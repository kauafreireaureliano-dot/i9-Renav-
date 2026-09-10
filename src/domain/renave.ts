// Contratos do domínio RENAVE. Nenhum endpoint, credencial ou schema oficial é
// inventado aqui — apenas a forma que o restante do sistema espera. Quando a
// integração real for definida, um novo provider implementa esta interface e
// é ligado via RENAVE_PROVIDER/variáveis de ambiente, sem tocar no restante do app.

export interface RenaveOperationContext {
  vehicleId: string;
  renavam: string;
  chassis: string;
  plate: string;
  userId: string;
}

export interface RenaveCallResult<T> {
  success: boolean;
  requestId: string;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
  raw: {
    request: unknown;
    response: unknown;
  };
}

export interface AptidaoResult {
  apto: boolean;
  motivo?: string;
  restricoes?: string[];
}

export interface EntradaEstoqueResult {
  protocolo: string;
  status: "PENDENTE" | "CONCLUIDA";
}

export interface AtpvResult {
  atpvId: string;
  status: "AGUARDANDO_ASSINATURA" | "ASSINADO" | "REJEITADO";
  urlAssinatura?: string;
}

export interface SaidaEstoqueResult {
  protocolo: string;
  status: "PENDENTE" | "CONCLUIDA";
}

export interface RenaveProvider {
  consultarAptidao(ctx: RenaveOperationContext): Promise<RenaveCallResult<AptidaoResult>>;
  solicitarEntradaEstoque(
    ctx: RenaveOperationContext
  ): Promise<RenaveCallResult<EntradaEstoqueResult>>;
  enviarAtpvAssinatura(ctx: RenaveOperationContext): Promise<RenaveCallResult<AtpvResult>>;
  consultarAtpv(ctx: RenaveOperationContext): Promise<RenaveCallResult<AtpvResult>>;
  enviarNotaFiscalEntrada(
    ctx: RenaveOperationContext,
    invoiceAccessKey: string
  ): Promise<RenaveCallResult<{ aceito: boolean }>>;
  consultarEstoque(ctx: RenaveOperationContext): Promise<RenaveCallResult<{ noEstoque: boolean }>>;
  solicitarSaidaEstoque(
    ctx: RenaveOperationContext
  ): Promise<RenaveCallResult<SaidaEstoqueResult>>;
  consultarSaidaEstoque(
    ctx: RenaveOperationContext
  ): Promise<RenaveCallResult<SaidaEstoqueResult>>;
  enviarNotaFiscalSaida(
    ctx: RenaveOperationContext,
    invoiceAccessKey: string
  ): Promise<RenaveCallResult<{ aceito: boolean }>>;
  cancelarEntrada(ctx: RenaveOperationContext): Promise<RenaveCallResult<{ cancelado: boolean }>>;
  cancelarSaida(ctx: RenaveOperationContext): Promise<RenaveCallResult<{ cancelado: boolean }>>;
}
