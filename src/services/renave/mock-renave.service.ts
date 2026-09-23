import type {
  RenaveProvider,
  RenaveCallResult,
  ConsultarAptidaoInput,
  AptidaoResult,
  SolicitarEntradaEstoqueInput,
  SolicitarSaidaEstoqueInput,
  EstoqueResult,
  EnviarNotaFiscalInput,
  CancelarEntradaInput,
  CancelarSaidaInput,
  AtpvAssinaturaResult,
  TermoResult,
  EnviarAssinaturaAtpvInput,
} from "@/domain/renave";

// PDF mínimo válido (uma página em branco), para o fluxo de termos funcionar
// ponta a ponta em desenvolvimento sem chamar o RENAVE.
const MOCK_PDF_BASE64 =
  "JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8" +
  "PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdl" +
  "L1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgNTk1IDg0Ml0+PmVuZG9iagp0cmFpbGVyPDwvUm9vdCAx" +
  "IDAgUj4+";

// Implementação MOCK/SANDBOX do RenaveProvider — simula as respostas reais
// da API (ver domain/renave.ts) sem se conectar ao RENAVE de verdade.
// Usada em desenvolvimento e enquanto FISCAL_ENVIRONMENT/RENAVE_ENVIRONMENT
// não estiver em PRODUCAO.

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ok<T>(data: T, request: unknown): RenaveCallResult<T> {
  return { success: true, data, raw: { request, response: data } };
}

function fail<T>(code: string, message: string, request: unknown): RenaveCallResult<T> {
  return {
    success: false,
    errorCode: code,
    errorMessage: message,
    raw: { request, response: { errorCode: code, errorMessage: message } },
  };
}

// RENAVAM terminado em "0" simula restrição, para testar o fluxo de "não
// apto" sem depender de sorteio aleatório.
function isSimulatedRestricted(renavam: string) {
  return renavam.endsWith("0");
}

let mockEstoqueSequence = 1000;
const mockEstoques = new Map<number, EstoqueResult>();

export const mockRenaveService: RenaveProvider = {
  async consultarAptidao(
    input: ConsultarAptidaoInput
  ): Promise<RenaveCallResult<AptidaoResult>> {
    await delay(400);
    if (isSimulatedRestricted(input.renavam)) {
      return ok<AptidaoResult>(
        {
          apto: false,
          motivosParaNaoAptidao: ["Veículo com restrição de débitos (simulado)"],
          comunicacaoComDetranFalhou: false,
          existemDebitos: true,
          valorTotalDebitos: 850.32,
        },
        input
      );
    }
    return ok<AptidaoResult>(
      {
        apto: true,
        motivosParaNaoAptidao: [],
        comunicacaoComDetranFalhou: false,
        existemDebitos: false,
      },
      input
    );
  },

  async solicitarEntradaEstoque(
    input: SolicitarEntradaEstoqueInput
  ): Promise<RenaveCallResult<EstoqueResult>> {
    await delay(500);
    const idEstoque = ++mockEstoqueSequence;
    const result: EstoqueResult = {
      idEstoque,
      estado: "CONFIRMADO",
      placa: input.veiculo.placa,
      renavam: input.veiculo.renavam,
    };
    mockEstoques.set(idEstoque, result);
    return ok(result, input);
  },

  async solicitarSaidaEstoque(
    input: SolicitarSaidaEstoqueInput
  ): Promise<RenaveCallResult<EstoqueResult>> {
    await delay(500);
    const idEstoque = ++mockEstoqueSequence;
    const result: EstoqueResult = {
      idEstoque,
      estado: "FINALIZADO",
      placa: input.veiculo.placa,
      renavam: input.veiculo.renavam,
    };
    mockEstoques.set(idEstoque, result);
    return ok(result, input);
  },

  async consultarEstoque(idEstoque: number): Promise<RenaveCallResult<EstoqueResult>> {
    await delay(200);
    const found = mockEstoques.get(idEstoque);
    if (!found) {
      return fail("ESTOQUE_NAO_ENCONTRADO", "Registro de estoque não encontrado", { idEstoque });
    }
    return ok(found, { idEstoque });
  },

  async enviarNotaFiscal(
    input: EnviarNotaFiscalInput
  ): Promise<RenaveCallResult<{ enviado: boolean }>> {
    await delay(300);
    if (input.chaveNotaFiscal.length !== 44) {
      return fail("CHAVE_NF_INVALIDA", "Chave de acesso da NF deve ter 44 dígitos", input);
    }
    return ok({ enviado: true }, input);
  },

  async cancelarEntrada(
    input: CancelarEntradaInput
  ): Promise<RenaveCallResult<EstoqueResult>> {
    await delay(300);
    return ok(
      { idEstoque: 0, estado: "SOLICITADO", placa: input.veiculo.placa, renavam: input.veiculo.renavam },
      input
    );
  },

  async cancelarSaida(input: CancelarSaidaInput): Promise<RenaveCallResult<EstoqueResult>> {
    await delay(300);
    return ok({ idEstoque: input.idEstoque, estado: "CONFIRMADO" }, input);
  },

  async consultarAtpv(
    placa: string,
    renavam: string
  ): Promise<RenaveCallResult<AtpvAssinaturaResult>> {
    await delay(300);
    return ok<AtpvAssinaturaResult>(
      {
        numeroAtpve: `MOCK-ATPVE-${placa}`,
        estadoIntencaoVenda: "REGISTRADA",
        dataHoraRegistroAssinaturaVendedor: new Date().toISOString(),
        tipoAssinaturaVendedor: "PROPRIO_PUNHO_ATPV_PAPEL_MOEDA",
      },
      { placa, renavam }
    );
  },

  async enviarAssinaturaAtpv(
    input: EnviarAssinaturaAtpvInput
  ): Promise<RenaveCallResult<{ enviado: boolean }>> {
    await delay(300);
    return ok({ enviado: true }, { idEstoque: input.idEstoque, fotoAssinadaBase64: "[omitido]" });
  },

  async consultarTermoEntrada(idEstoque: number): Promise<RenaveCallResult<TermoResult>> {
    await delay(300);
    return ok<TermoResult>({ numeroTermo: idEstoque, pdfBase64: MOCK_PDF_BASE64 }, { idEstoque });
  },

  async consultarTermoSaida(idEstoque: number): Promise<RenaveCallResult<TermoResult>> {
    await delay(300);
    return ok<TermoResult>({ numeroTermo: idEstoque, pdfBase64: MOCK_PDF_BASE64 }, { idEstoque });
  },
};
