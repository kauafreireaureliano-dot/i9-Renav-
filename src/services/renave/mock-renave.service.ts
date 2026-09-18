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
} from "@/domain/renave";

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
      { numeroAtpve: `MOCK-ATPVE-${placa}`, estadoIntencaoVenda: "REGISTRADA" },
      { placa, renavam }
    );
  },
};
