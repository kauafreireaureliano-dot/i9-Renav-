// Contratos do domínio RENAVE — moldados exatamente pela especificação real
// da API (grupo "Estabelecimento (Concessionária ou Revenda)", obtida em
// 2026-09-18 via renave.estaleiro.serpro.gov.br/renave-ws/swagger-ui.html).
// Nada aqui foi inventado: cada campo existe no Swagger oficial.

export type CrvType = "AZUL" | "VERDE" | "BRANCO" | "DIGITAL";
export type DocumentoTipo = "CPF" | "CNPJ";

export interface RenaveCallResult<T> {
  success: boolean;
  data?: T;
  errorCode?: string;
  errorMessage?: string; // mensagemParaUsuarioFinal, quando disponível
  raw: {
    request: unknown;
    response: unknown;
  };
}

// ---------- Aptidão ----------

export interface ConsultarAptidaoInput {
  placa: string;
  renavam: string;
  numeroCrv?: string;
  tipoCrv: CrvType;
}

export interface AptidaoResult {
  apto: boolean;
  motivosParaNaoAptidao: string[];
  comunicacaoComDetranFalhou: boolean;
  existemDebitos: boolean;
  valorTotalDebitos?: number;
}

// ---------- Entrada em estoque ----------

export interface SolicitarEntradaEstoqueInput {
  cpfOperadorResponsavel: string;
  dataCompra: string; // YYYY-MM-DD
  emailEstabelecimento?: string;
  emailVendedor?: string;
  valorCompra: number;
  veiculo: {
    codigoSegurancaCrv: string; // 11 dígitos
    numeroCrv?: string;
    placa: string;
    renavam: string;
    tipoCrv: CrvType;
    quilometragemHodometro: number;
    dataHoraMedicaoHodometro: string; // ISO date-time
    documentoProprietarioAtual: string; // CPF/CNPJ do vendedor, apenas dígitos
    tipoDocumentoProprietarioAtual: DocumentoTipo;
  };
}

export interface EstoqueResult {
  idEstoque: number;
  estado: "SOLICITADO" | "TRANSFERIDO" | "CONFIRMADO" | "FINALIZADO";
  placa?: string;
  renavam?: string;
  chassi?: string;
}

// ---------- Saída de estoque ----------

export interface SolicitarSaidaEstoqueInput {
  cpfOperadorResponsavel: string;
  dataVenda: string; // YYYY-MM-DD
  emailEstabelecimento?: string;
  valorVenda: number;
  veiculo: {
    codigoSegurancaCrv: string;
    numeroCrv?: string;
    placa: string;
    renavam: string;
  };
  comprador: {
    nome: string;
    numeroDocumento: string; // apenas dígitos
    tipoDocumento: DocumentoTipo;
    email?: string;
    endereco: {
      logradouro: string;
      numero: string;
      bairro: string;
      cep: string; // 7-8 dígitos
      complemento?: string;
      codigoMunicipio: number; // código IBGE
    };
  };
}

// ---------- Notas fiscais ----------

export type NotaFiscalEvento = "COMPRA" | "VENDA";

export interface EnviarNotaFiscalInput {
  idEstoque: number;
  chaveNotaFiscal: string; // 44 dígitos
  evento: NotaFiscalEvento;
}

// ---------- Cancelamentos ----------

export interface CancelarEntradaInput {
  cpfOperadorResponsavel: string;
  dataCancelamentoEstoque: string;
  veiculo: {
    placa: string;
    renavam: string;
    numeroCrv?: string;
    codigoSegurancaCrv: string;
  };
}

export interface CancelarSaidaInput {
  cpfOperadorResponsavel: string;
  dataCancelamentoSaidaEstoque: string;
  idEstoque: number;
}

// ---------- ATPV ----------

export interface AtpvAssinaturaResult {
  numeroAtpve?: string;
  estadoIntencaoVenda?: "REGISTRADA" | "VENDA_COMUNICADA" | "CANCELADA" | "CONSUMIDA";
}

// Nota: a API real também tem POST /api/atpv-assinatura-vendedor para
// registrar a assinatura do ATPV (própria mão ou qualificada P7S). Não está
// no contrato abaixo porque exige captura de assinatura/certificado do
// vendedor — infraestrutura que o sistema ainda não tem. Fica para uma
// próxima etapa, sem afetar entrada/saída/aptidão/nota fiscal, que já
// funcionam de ponta a ponta sem isso.
export interface RenaveProvider {
  consultarAptidao(input: ConsultarAptidaoInput): Promise<RenaveCallResult<AptidaoResult>>;
  solicitarEntradaEstoque(
    input: SolicitarEntradaEstoqueInput
  ): Promise<RenaveCallResult<EstoqueResult>>;
  solicitarSaidaEstoque(
    input: SolicitarSaidaEstoqueInput
  ): Promise<RenaveCallResult<EstoqueResult>>;
  consultarEstoque(idEstoque: number): Promise<RenaveCallResult<EstoqueResult>>;
  enviarNotaFiscal(input: EnviarNotaFiscalInput): Promise<RenaveCallResult<{ enviado: boolean }>>;
  cancelarEntrada(input: CancelarEntradaInput): Promise<RenaveCallResult<EstoqueResult>>;
  cancelarSaida(input: CancelarSaidaInput): Promise<RenaveCallResult<EstoqueResult>>;
  consultarAtpv(placa: string, renavam: string): Promise<RenaveCallResult<AtpvAssinaturaResult>>;
}
