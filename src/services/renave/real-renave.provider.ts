import https from "https";
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

// Implementação real, baseada na especificação oficial obtida em
// 2026-09-18 em renave.estaleiro.serpro.gov.br/renave-ws/swagger-ui.html
// (grupo "Estabelecimento (Concessionária ou Revenda)"). Nenhum endpoint
// abaixo foi inventado — todos vêm literalmente do Swagger.
//
// AUTENTICAÇÃO: a API não usa header de token — a especificação não lista
// nenhum. A autenticação é feita pelo certificado de máquina cadastrado no
// Credencia (mTLS: o certificado + chave privada autenticam a própria
// conexão HTTPS, não uma requisição individual). Por isso usamos o módulo
// `https` nativo do Node em vez de fetch — é o jeito direto de anexar um
// certificado cliente à conexão TLS.
//
// Variáveis de ambiente necessárias (nunca commitadas, apenas na Vercel):
//   RENAVE_BASE_URL              (só tem efeito quando RENAVE_ENVIRONMENT=HOMOLOGACAO;
//                                 valor esperado: hom.renave.estaleiro.serpro.gov.br
//                                 — confirmado pelo suporte do RENAVE em 2026-09-18,
//                                 mesmos endpoints, exige certificado de CNPJ com
//                                 CNAE automotivo. Em PRODUCAO este valor é ignorado
//                                 de propósito — ver IS_HOMOLOGACAO abaixo — pra evitar
//                                 que produção aponte pro host errado por esquecimento)
//   RENAVE_TLS_SERVERNAME        (idem, só em homologação: "estaleiro.serpro.gov.br" —
//                                 o certificado TLS do servidor de homologação
//                                 tem CN diferente do host "hom.", conforme o
//                                 guia oficial em /renave-ws/manual/dicas-ssl;
//                                 sem isso o handshake falha por hostname mismatch)
//   RENAVE_CERTIFICADO_PFX_BASE64 (o .pfx do certificado de máquina, em base64)
//   RENAVE_CERTIFICADO_SENHA      (senha do .pfx)
//
// AINDA NÃO VALIDADO AO VIVO EM PRODUÇÃO: a consulta de aptidão já foi
// testada com sucesso contra o RENAVE real (confirmado em 2026-09-18). As
// operações de escrita (entrada/saída/cancelamento/nota fiscal) ainda não
// foram exercitadas — teste primeiro em HOMOLOGACAO antes de confiar em
// produção; ajuste o que a própria API reclamar via errorMessage/detalhe.

// Trava de segurança: RENAVE_BASE_URL/RENAVE_TLS_SERVERNAME só têm efeito
// quando RENAVE_ENVIRONMENT=HOMOLOGACAO. Em PRODUCAO (ou qualquer outro
// valor), o host de produção é fixo — mesmo que alguém esqueça de remover a
// variável de homologação depois de testar, produção nunca vai apontar pro
// host errado sem querer.
const IS_HOMOLOGACAO = process.env.RENAVE_ENVIRONMENT === "HOMOLOGACAO";
const HOST = IS_HOMOLOGACAO
  ? (process.env.RENAVE_BASE_URL ?? "renave.estaleiro.serpro.gov.br")
  : "renave.estaleiro.serpro.gov.br";
const TLS_SERVERNAME = IS_HOMOLOGACAO ? process.env.RENAVE_TLS_SERVERNAME || undefined : undefined;
const BASE_PATH = "/renave-ws";

// O runtime de função da Vercel (não é o Node.js "de verdade" — o stack trace
// aponta pra um shim próprio deles) não sabe interpretar PKCS12 (.pfx),
// mesmo com --openssl-legacy-provider (confirmado em teste ao vivo em
// 2026-09-18: erro ERR_CRYPTO_UNSUPPORTED_OPERATION / "Unsupported PKCS12
// PFX data"). Por isso preferimos cert+key em PEM separados (formato mais
// simples), com fallback pro .pfx original caso um dia isso passe a
// funcionar.
function getAgent(): https.Agent {
  const certBase64 = process.env.RENAVE_CERTIFICADO_CERT_BASE64;
  const keyBase64 = process.env.RENAVE_CERTIFICADO_KEY_BASE64;
  if (certBase64 && keyBase64) {
    return new https.Agent({
      cert: Buffer.from(certBase64, "base64").toString("utf8"),
      key: Buffer.from(keyBase64, "base64").toString("utf8"),
    });
  }

  const pfxBase64 = process.env.RENAVE_CERTIFICADO_PFX_BASE64;
  const passphrase = process.env.RENAVE_CERTIFICADO_SENHA;
  if (pfxBase64 && passphrase) {
    return new https.Agent({
      pfx: Buffer.from(pfxBase64, "base64"),
      passphrase,
    });
  }

  throw new Error(
    "Certificado do RENAVE não configurado — defina RENAVE_CERTIFICADO_CERT_BASE64 + RENAVE_CERTIFICADO_KEY_BASE64 (preferido) ou RENAVE_CERTIFICADO_PFX_BASE64 + RENAVE_CERTIFICADO_SENHA."
  );
}

interface HttpResult {
  status: number;
  body: unknown;
}

function request(method: string, path: string, body?: unknown): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        host: HOST,
        servername: TLS_SERVERNAME,
        path: `${BASE_PATH}${path}`,
        method,
        agent: getAgent(),
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          Accept: "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let parsed: unknown = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode ?? 0, body: parsed });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

interface ErrorBody {
  titulo?: string;
  detalhe?: string;
  mensagemParaUsuarioFinal?: string;
}

function toFailure<T>(res: HttpResult, request: unknown): RenaveCallResult<T> {
  const body = res.body as ErrorBody | null;
  return {
    success: false,
    errorCode: `HTTP_${res.status}`,
    errorMessage: body?.mensagemParaUsuarioFinal ?? body?.detalhe ?? body?.titulo ?? "Erro na chamada ao RENAVE",
    raw: { request, response: res.body },
  };
}

export const realRenaveProvider: RenaveProvider = {
  async consultarAptidao(
    input: ConsultarAptidaoInput
  ): Promise<RenaveCallResult<AptidaoResult>> {
    const params = new URLSearchParams({
      placa: input.placa,
      renavam: input.renavam,
      tipoCrv: input.tipoCrv,
      ...(input.numeroCrv ? { numeroCrv: input.numeroCrv } : {}),
    });
    const res = await request("GET", `/api/aptidao-veiculo-estoque?${params.toString()}`);
    if (res.status !== 200) return toFailure(res, input);

    const body = res.body as {
      diagnostico?: { veiculoApto?: boolean; motivosParaNaoAptidao?: string[] };
      comunicacaoComDetranFalhou?: boolean;
      informacoesDebitos?: { existemDebitos?: boolean; valorTaxasEDebitosDiversos?: number };
    };

    return {
      success: true,
      data: {
        apto: body.diagnostico?.veiculoApto ?? false,
        motivosParaNaoAptidao: body.diagnostico?.motivosParaNaoAptidao ?? [],
        comunicacaoComDetranFalhou: body.comunicacaoComDetranFalhou ?? false,
        existemDebitos: body.informacoesDebitos?.existemDebitos ?? false,
        valorTotalDebitos: body.informacoesDebitos?.valorTaxasEDebitosDiversos,
      },
      raw: { request: input, response: res.body },
    };
  },

  async solicitarEntradaEstoque(
    input: SolicitarEntradaEstoqueInput
  ): Promise<RenaveCallResult<EstoqueResult>> {
    const body = {
      cpfOperadorResponsavel: input.cpfOperadorResponsavel,
      dataCompra: input.dataCompra,
      emailEstabelecimento: input.emailEstabelecimento,
      emailVendedor: input.emailVendedor,
      valorCompra: input.valorCompra,
      veiculo: {
        codigoSegurancaCrv: input.veiculo.codigoSegurancaCrv,
        numeroCrv: input.veiculo.numeroCrv,
        placa: input.veiculo.placa,
        renavam: input.veiculo.renavam,
        tipoCrv: input.veiculo.tipoCrv,
        quilometragemHodometro: input.veiculo.quilometragemHodometro,
        dataHoraMedicaoHodometro: input.veiculo.dataHoraMedicaoHodometro,
        documentoProprietarioAtual: input.veiculo.documentoProprietarioAtual,
        tipoDocumentoProprietarioAtual: input.veiculo.tipoDocumentoProprietarioAtual,
      },
    };
    const res = await request("POST", "/api/solicitacoes-entrada-estoque", body);
    if (res.status !== 201) return toFailure(res, body);

    const data = res.body as { id: number; estado: EstoqueResult["estado"]; placa: string; renavam: string };
    return {
      success: true,
      data: { idEstoque: data.id, estado: data.estado, placa: data.placa, renavam: data.renavam },
      raw: { request: body, response: res.body },
    };
  },

  async solicitarSaidaEstoque(
    input: SolicitarSaidaEstoqueInput
  ): Promise<RenaveCallResult<EstoqueResult>> {
    const body = {
      cpfOperadorResponsavel: input.cpfOperadorResponsavel,
      dataVenda: input.dataVenda,
      emailEstabelecimento: input.emailEstabelecimento,
      valorVenda: input.valorVenda,
      veiculo: {
        codigoSegurancaCrv: input.veiculo.codigoSegurancaCrv,
        numeroCrv: input.veiculo.numeroCrv,
        placa: input.veiculo.placa,
        renavam: input.veiculo.renavam,
      },
      comprador: {
        nome: input.comprador.nome,
        numeroDocumento: input.comprador.numeroDocumento,
        tipoDocumento: input.comprador.tipoDocumento,
        email: input.comprador.email,
        endereco: {
          logradouro: input.comprador.endereco.logradouro,
          numero: input.comprador.endereco.numero,
          bairro: input.comprador.endereco.bairro,
          cep: input.comprador.endereco.cep,
          complemento: input.comprador.endereco.complemento,
          codigoMunicipio: input.comprador.endereco.codigoMunicipio,
        },
      },
    };
    const res = await request("POST", "/api/solicitacoes-saida-estoque", body);
    if (res.status !== 201) return toFailure(res, body);

    const data = res.body as { id: number; estado: EstoqueResult["estado"]; placa: string; renavam: string };
    return {
      success: true,
      data: { idEstoque: data.id, estado: data.estado, placa: data.placa, renavam: data.renavam },
      raw: { request: body, response: res.body },
    };
  },

  async consultarEstoque(idEstoque: number): Promise<RenaveCallResult<EstoqueResult>> {
    const res = await request("GET", `/api/estoques/${idEstoque}`);
    if (res.status !== 200) return toFailure(res, { idEstoque });

    const data = res.body as { id: number; estado: EstoqueResult["estado"]; placa: string; renavam: string };
    return {
      success: true,
      data: { idEstoque: data.id, estado: data.estado, placa: data.placa, renavam: data.renavam },
      raw: { request: { idEstoque }, response: res.body },
    };
  },

  async enviarNotaFiscal(
    input: EnviarNotaFiscalInput
  ): Promise<RenaveCallResult<{ enviado: boolean }>> {
    const body = {
      idEstoque: input.idEstoque,
      chaveNotaFiscal: input.chaveNotaFiscal,
      evento: input.evento,
    };
    const res = await request("POST", "/api/notas-fiscais", body);
    if (res.status !== 200) return toFailure(res, body);
    return { success: true, data: { enviado: true }, raw: { request: body, response: res.body } };
  },

  async cancelarEntrada(
    input: CancelarEntradaInput
  ): Promise<RenaveCallResult<EstoqueResult>> {
    const body = {
      cpfOperadorResponsavel: input.cpfOperadorResponsavel,
      dataCancelamentoEstoque: input.dataCancelamentoEstoque,
      veiculo: {
        placa: input.veiculo.placa,
        renavam: input.veiculo.renavam,
        numeroCrv: input.veiculo.numeroCrv,
        codigoSegurancaCrv: input.veiculo.codigoSegurancaCrv,
      },
    };
    const res = await request("POST", "/api/solicitacoes-cancelamento-estoque", body);
    if (res.status !== 201) return toFailure(res, body);

    const data = res.body as { id: number; estado: EstoqueResult["estado"] };
    return {
      success: true,
      data: { idEstoque: data.id, estado: data.estado },
      raw: { request: body, response: res.body },
    };
  },

  async cancelarSaida(input: CancelarSaidaInput): Promise<RenaveCallResult<EstoqueResult>> {
    const body = {
      cpfOperadorResponsavel: input.cpfOperadorResponsavel,
      dataCancelamentoSaidaEstoque: input.dataCancelamentoSaidaEstoque,
      idEstoque: input.idEstoque,
    };
    const res = await request("POST", "/api/solicitacoes-cancelamento-saida-estoque", body);
    if (res.status !== 201) return toFailure(res, body);

    const data = res.body as { id: number; estado: EstoqueResult["estado"] };
    return {
      success: true,
      data: { idEstoque: data.id, estado: data.estado },
      raw: { request: body, response: res.body },
    };
  },

  async consultarAtpv(
    placa: string,
    renavam: string
  ): Promise<RenaveCallResult<AtpvAssinaturaResult>> {
    const res = await request("GET", `/api/atpv-assinaturas/${placa}/${renavam}/ultimo`);
    if (res.status !== 200) return toFailure(res, { placa, renavam });

    const data = res.body as { numeroAtpve?: string; estadoIntencaoVenda?: AtpvAssinaturaResult["estadoIntencaoVenda"] };
    return {
      success: true,
      data: { numeroAtpve: data.numeroAtpve, estadoIntencaoVenda: data.estadoIntencaoVenda },
      raw: { request: { placa, renavam }, response: res.body },
    };
  },
};
