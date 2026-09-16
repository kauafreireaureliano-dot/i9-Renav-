import type {
  FiscalProvider,
  FiscalOperationContext,
  FiscalCallResult,
  EmissaoResult,
  ConsultaNotaResult,
  FiscalInvoicePayload,
} from "@/domain/fiscal";

// Implementação real usando a Notaas (https://www.notaas.com.br) como
// provedor de NF-e — escolhida por ter um plano gratuito de verdade (50
// notas/mês, sem cartão) em vez de exigir contrato pago desde o início.
//
// IMPORTANTE — montado a partir da documentação pública deles
// (docs.notaas.com.br) sem uma conta real pra validar campo a campo.
// Antes de emitir a primeira nota de verdade:
//   1. Criar conta gratuita em notaas.com.br
//   2. Subir o certificado digital e-CNPJ da empresa no painel deles
//   3. Pegar a chave de API do ambiente de SANDBOX e testar por aqui primeiro
//      (FISCAL_ENVIRONMENT continua em MOCK até isso ser validado)
//   4. Só então trocar NOTAAS_API_KEY pela chave de PRODUÇÃO e
//      FISCAL_ENVIRONMENT=PRODUCAO
//
// Se algum campo abaixo vier rejeitado pela Notaas, o erro retornado por eles
// aparece direto em errorMessage — é questão de ajustar o payload aqui,
// sem precisar mexer no resto do sistema.

const BASE_URL = "https://platform.notaas.com.br/api/v1";

function apiKey(): string {
  const key = process.env.NOTAAS_API_KEY;
  if (!key) {
    throw new Error(
      "NOTAAS_API_KEY não configurada. Defina-a no ambiente antes de usar FISCAL_ENVIRONMENT=PRODUCAO."
    );
  }
  return key;
}

async function notaasFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey(),
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function buildEmissaoPayload(payload: FiscalInvoicePayload) {
  return {
    modelo: 55,
    naturezaOperacao: payload.naturezaOperacao,
    dest: {
      // Notaas espera CPF ou CNPJ conforme o tamanho do documento.
      ...(payload.recipientDocumentType === "CNPJ"
        ? { cnpj: payload.recipientDocument }
        : { cpf: payload.recipientDocument }),
      nome: payload.recipient,
      endereco: payload.recipientAddress
        ? {
            logradouro: payload.recipientAddress.logradouro,
            cidade: payload.recipientAddress.cidade,
            uf: payload.recipientAddress.uf,
            cep: payload.recipientAddress.cep,
          }
        : undefined,
    },
    items: [
      {
        descricao: payload.itemDescription,
        ncm: payload.ncm,
        cfop: payload.cfop,
        quantidade: 1,
        valorUnitario: payload.value,
        valorTotal: payload.value,
        // ATENÇÃO: nomes de campo abaixo não confirmados na doc pública da
        // Notaas (não veio detalhamento de ICMS no que consultei). Testar no
        // sandbox deles e ajustar os nomes conforme o retorno de erro antes
        // de confiar nisso em produção — é só aqui que precisa mudar.
        ...(payload.icms && {
          icmsCst: payload.icms.cst,
          icmsReducaoBaseCalculoPercentual: payload.icms.baseCalculoReduzidaPercentual,
        }),
      },
    ],
    pagamentos: [{ tipoPagamento: "01", valor: payload.value }],
  };
}

async function emitir(
  payload: FiscalInvoicePayload
): Promise<FiscalCallResult<EmissaoResult>> {
  const body = buildEmissaoPayload(payload);
  const res = await notaasFetch("/nfe/emitir", { method: "POST", body: JSON.stringify(body) });

  if (!res.ok) {
    return {
      success: false,
      errorCode: `HTTP_${res.status}`,
      errorMessage:
        (res.body as { message?: string })?.message ?? "Falha ao emitir NF-e junto à Notaas",
      raw: { request: body, response: res.body },
    };
  }

  const invoiceId = (res.body as { invoiceId?: string }).invoiceId;
  if (!invoiceId) {
    return {
      success: false,
      errorCode: "SEM_INVOICE_ID",
      errorMessage: "Notaas não retornou um invoiceId para acompanhar a nota.",
      raw: { request: body, response: res.body },
    };
  }

  // Emissão é assíncrona — faz um curto polling antes de desistir e deixar
  // para uma consulta manual posterior (consultarNota) resolver.
  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const status = await notaasFetch(`/nfe/invoices/${invoiceId}/status`);
    const data = status.body as {
      status?: string;
      chaveAcesso?: string;
      numero?: string;
      serie?: string;
      protocolo?: string;
      pdfUrl?: string;
      mensagem?: string;
    };

    if (data.status === "issued") {
      return {
        success: true,
        data: {
          number: data.numero ?? "",
          series: data.serie ?? "1",
          accessKey: data.chaveAcesso ?? "",
          protocol: invoiceId, // usado depois para consultarNota/cancelarNota
          status: "AUTORIZADA",
          xmlUrl: data.pdfUrl,
        },
        raw: { request: body, response: data },
      };
    }

    if (data.status === "error" || data.status === "cancelled") {
      return {
        success: false,
        errorCode: data.status.toUpperCase(),
        errorMessage: data.mensagem ?? "NF-e rejeitada pela Notaas/SEFAZ",
        raw: { request: body, response: data },
      };
    }
    // "queued" | "processing" -> continua o polling
  }

  return {
    success: false,
    errorCode: "AINDA_PROCESSANDO",
    errorMessage:
      "A nota ainda está sendo processada pela SEFAZ. Consulte novamente em instantes (Consultar nota).",
    raw: { request: body, response: { invoiceId } },
  };
}

export const realFiscalProvider: FiscalProvider = {
  emitirNotaEntrada: (_ctx: FiscalOperationContext, payload: FiscalInvoicePayload) => emitir(payload),
  emitirNotaSaida: (_ctx: FiscalOperationContext, payload: FiscalInvoicePayload) => emitir(payload),

  async consultarNota(ctx: FiscalOperationContext): Promise<FiscalCallResult<ConsultaNotaResult>> {
    // O "protocol" salvo no Invoice guarda o invoiceId da Notaas (ver emitir()).
    const { prisma } = await import("@/lib/prisma");
    const invoice = await prisma.invoice.findUnique({ where: { id: ctx.invoiceId } });
    if (!invoice?.protocol) {
      return {
        success: false,
        errorCode: "SEM_PROTOCOLO",
        errorMessage: "Nota ainda não foi emitida junto ao provedor.",
        raw: { request: ctx, response: null },
      };
    }

    const res = await notaasFetch(`/nfe/invoices/${invoice.protocol}/status`);
    const data = res.body as { status?: string; mensagem?: string };

    const statusMap: Record<string, ConsultaNotaResult["status"]> = {
      issued: "AUTORIZADA",
      error: "REJEITADA",
      cancelled: "CANCELADA",
      queued: "PENDENTE",
      processing: "PENDENTE",
    };

    return {
      success: res.ok,
      data: { status: statusMap[data.status ?? ""] ?? "PENDENTE", returnMessage: data.mensagem },
      raw: { request: { invoiceId: invoice.protocol }, response: data },
    };
  },

  async cancelarNota(ctx: FiscalOperationContext, reason: string) {
    const { prisma } = await import("@/lib/prisma");
    const invoice = await prisma.invoice.findUnique({ where: { id: ctx.invoiceId } });
    if (!invoice?.protocol) {
      return {
        success: false,
        errorCode: "SEM_PROTOCOLO",
        errorMessage: "Nota ainda não foi emitida junto ao provedor.",
        raw: { request: ctx, response: null },
      };
    }

    const body = { invoiceId: invoice.protocol, motivo: reason };
    const res = await notaasFetch("/nfe/cancelar", { method: "POST", body: JSON.stringify(body) });

    return {
      success: res.ok,
      data: { cancelada: res.ok },
      errorMessage: res.ok ? undefined : (res.body as { message?: string })?.message,
      raw: { request: body, response: res.body },
    };
  },

  async baixarXML(ctx: FiscalOperationContext) {
    const { prisma } = await import("@/lib/prisma");
    const invoice = await prisma.invoice.findUnique({ where: { id: ctx.invoiceId } });
    if (!invoice?.xmlUrl) {
      return {
        success: false,
        errorCode: "SEM_XML",
        errorMessage: "XML ainda não disponível para esta nota.",
        raw: { request: ctx, response: null },
      };
    }
    return {
      success: true,
      data: { xmlUrl: invoice.xmlUrl },
      raw: { request: ctx, response: { xmlUrl: invoice.xmlUrl } },
    };
  },

  async consultarStatus() {
    try {
      const res = await notaasFetch("/nfe/invoices/health-check-i9auto/status");
      // Uma chave de API inválida derruba com 401 antes mesmo de chegar aqui;
      // qualquer resposta (mesmo 404 de nota inexistente) indica que a API
      // está no ar e a autenticação está ok.
      return {
        success: true,
        data: { online: res.status !== 401 },
        raw: { request: {}, response: { status: res.status } },
      };
    } catch (err) {
      return {
        success: false,
        errorCode: "OFFLINE",
        errorMessage: err instanceof Error ? err.message : "Falha ao contatar a Notaas",
        raw: { request: {}, response: null },
      };
    }
  },
};
