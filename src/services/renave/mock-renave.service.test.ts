import { describe, it, expect } from "vitest";
import { mockRenaveService } from "./mock-renave.service";
import type {
  ConsultarAptidaoInput,
  SolicitarEntradaEstoqueInput,
  SolicitarSaidaEstoqueInput,
} from "@/domain/renave";

function aptidaoInput(overrides: Partial<ConsultarAptidaoInput> = {}): ConsultarAptidaoInput {
  return {
    placa: "ABC1D23",
    renavam: "12345678901",
    tipoCrv: "AZUL",
    ...overrides,
  };
}

function entradaInput(
  overrides: Partial<SolicitarEntradaEstoqueInput> = {}
): SolicitarEntradaEstoqueInput {
  return {
    cpfOperadorResponsavel: "00000000000",
    dataCompra: "2026-09-18",
    valorCompra: 50000,
    veiculo: {
      codigoSegurancaCrv: "12345678901",
      placa: "ABC1D23",
      renavam: "12345678901",
      tipoCrv: "AZUL",
      quilometragemHodometro: 1000,
      dataHoraMedicaoHodometro: "2026-09-18T10:00:00Z",
      documentoProprietarioAtual: "11111111111",
      tipoDocumentoProprietarioAtual: "CPF",
    },
    ...overrides,
  };
}

function saidaInput(
  overrides: Partial<SolicitarSaidaEstoqueInput> = {}
): SolicitarSaidaEstoqueInput {
  return {
    cpfOperadorResponsavel: "00000000000",
    dataVenda: "2026-09-18",
    valorVenda: 60000,
    veiculo: {
      codigoSegurancaCrv: "12345678901",
      placa: "ABC1D23",
      renavam: "12345678901",
    },
    comprador: {
      nome: "Maria Compradora",
      numeroDocumento: "22222222222",
      tipoDocumento: "CPF",
      endereco: {
        logradouro: "Rua Teste",
        numero: "100",
        bairro: "Centro",
        cep: "50000000",
        codigoMunicipio: 2611606,
      },
    },
    ...overrides,
  };
}

describe("mockRenaveService", () => {
  it("retorna apto para RENAVAM sem restrição simulada", async () => {
    const result = await mockRenaveService.consultarAptidao(aptidaoInput());
    expect(result.success).toBe(true);
    expect(result.data?.apto).toBe(true);
  });

  it("retorna não apto para RENAVAM terminado em 0 (restrição simulada)", async () => {
    const result = await mockRenaveService.consultarAptidao(
      aptidaoInput({ renavam: "12345678900" })
    );
    expect(result.success).toBe(true);
    expect(result.data?.apto).toBe(false);
    expect(result.data?.motivosParaNaoAptidao).toBeDefined();
    expect(result.data?.motivosParaNaoAptidao.length).toBeGreaterThan(0);
  });

  it("solicitarEntradaEstoque retorna idEstoque e estado confirmado", async () => {
    const result = await mockRenaveService.solicitarEntradaEstoque(entradaInput());
    expect(result.success).toBe(true);
    expect(result.data?.idEstoque).toBeDefined();
    expect(result.data?.estado).toBe("CONFIRMADO");
  });

  it("solicitarSaidaEstoque retorna idEstoque e estado finalizado, e permite consultarEstoque em seguida", async () => {
    const result = await mockRenaveService.solicitarSaidaEstoque(saidaInput());
    expect(result.success).toBe(true);
    expect(result.data?.estado).toBe("FINALIZADO");

    const idEstoque = result.data!.idEstoque;
    const consulta = await mockRenaveService.consultarEstoque(idEstoque);
    expect(consulta.success).toBe(true);
    expect(consulta.data?.idEstoque).toBe(idEstoque);
  });

  it("enviarAssinaturaAtpv aceita a foto e confirma o envio", async () => {
    const result = await mockRenaveService.enviarAssinaturaAtpv({
      idEstoque: 1001,
      fotoAssinadaBase64: "data:image/jpeg;base64,ZmFrZQ==",
    });
    expect(result.success).toBe(true);
    expect(result.data?.enviado).toBe(true);
    // a foto em si nunca deve aparecer no log sanitizado
    expect(JSON.stringify(result.raw.request)).not.toContain("ZmFrZQ==");
  });

  it("enviarNotaFiscal falha com chave de acesso inválida", async () => {
    const result = await mockRenaveService.enviarNotaFiscal({
      idEstoque: 1,
      chaveNotaFiscal: "123",
      evento: "COMPRA",
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("CHAVE_NF_INVALIDA");
  });

  it("consultarAtpv devolve a data de registro da assinatura do vendedor", async () => {
    const result = await mockRenaveService.consultarAtpv("ABC1D23", "12345678901");
    expect(result.success).toBe(true);
    expect(result.data?.dataHoraRegistroAssinaturaVendedor).toBeDefined();
  });

  it("termos de entrada e saída devolvem PDF em base64", async () => {
    const entrada = await mockRenaveService.consultarTermoEntrada(1001);
    const saida = await mockRenaveService.consultarTermoSaida(1001);
    expect(entrada.data?.pdfBase64).toMatch(/^JVBERi0/); // "%PDF-" em base64
    expect(saida.data?.numeroTermo).toBe(1001);
  });

  it("nunca lança exceção e sempre retorna o payload sanitizável em raw", async () => {
    const result = await mockRenaveService.consultarAptidao(aptidaoInput());
    expect(result.raw.request).toBeDefined();
    expect(result.raw.response).toBeDefined();
  });
});
