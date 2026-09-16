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
// VALIDADO AO VIVO em 2026-09-16 contra o ambiente de homologação da Notaas,
// com o CNPJ real da I9 Car, passando pelo próprio FiscalService da
// aplicação (não só chamadas manuais): uma nota de ENTRADA (compra de
// veículo usado) e uma de SAÍDA (venda, com redução de 20% na base de
// cálculo do ICMS / CST 20) foram emitidas e autorizadas — ambas com
// cStat=100 "Autorizado o uso da NF-e" da SEFAZ-PE. Endereço completo
// (bairro + código IBGE do município) é obrigatório; sem isso a SEFAZ
// rejeita antes de validar o resto.
//
// Antes de trocar para produção de verdade:
//   1. Trocar NOTAAS_API_KEY pela chave de PRODUÇÃO (painel Notaas)
//   2. FISCAL_ENVIRONMENT=PRODUCAO
//   3. Confirmar CFOP/NCM/CST com a contadora (ver comentário em fiscal.service.ts)
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

// Campos confirmados ao vivo contra o sandbox da Notaas (homologação, CNPJ
// real da I9 Car) em 2026-09-16 — payload abaixo chegou a receber
// cStat=100 "Autorizado o uso da NF-e" da SEFAZ-PE. `tipoOperacao` (0/1),
// `endereco.codigoMunicipio` (IBGE, 7 dígitos) e `endereco.bairro` são
// obrigatórios; sem eles a SEFAZ rejeita antes mesmo de validar o resto.
function buildEmissaoPayload(payload: FiscalInvoicePayload) {
  return {
    modelo: 55,
    tipoOperacao: payload.tipoOperacao,
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
            numero: payload.recipientAddress.numero,
            bairro: payload.recipientAddress.bairro,
            cidade: payload.recipientAddress.cidade,
            codigoMunicipio: payload.recipientAddress.codigoMunicipio,
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
        ...(payload.icms && { cst: payload.icms.cst }),
        // Confirmado ao vivo em 2026-09-16: a Notaas rejeita CST 20 sem esse
        // campo, com a mensagem apontando exatamente esse nome (SEFAZ N14-10).
        ...(payload.icms?.baseCalculoReduzidaPercentual !== undefined && {
          percentualReducaoBc: payload.icms.baseCalculoReduzidaPercentual,
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
    const errBody = res.body as { error?: string; detail?: string; campos?: string[] };
    return {
      success: false,
      errorCode: `HTTP_${res.status}`,
      errorMessage:
        [errBody?.error, errBody?.detail].filter(Boolean).join(" — ") ||
        "Falha ao emitir NF-e junto à Notaas",
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
      nNf?: number;
      serie?: number;
      nProt?: string;
      cStat?: number;
      xMotivo?: string;
      pdfUrl?: string;
      xmlUrl?: string;
      errorMessage?: string;
    };

    if (data.status === "issued") {
      return {
        success: true,
        data: {
          number: data.nNf != null ? String(data.nNf) : "",
          series: data.serie != null ? String(data.serie) : "1",
          accessKey: data.chaveAcesso ?? "",
          protocol: invoiceId, // usado depois para consultarNota/cancelarNota
          status: "AUTORIZADA",
          xmlUrl: data.xmlUrl ?? data.pdfUrl,
        },
        raw: { request: body, response: data },
      };
    }

    if (data.status === "error" || data.status === "cancelled") {
      return {
        success: false,
        errorCode: data.cStat != null ? `SEFAZ_${data.cStat}` : data.status.toUpperCase(),
        errorMessage:
          data.xMotivo ?? data.errorMessage ?? "NF-e rejeitada pela Notaas/SEFAZ",
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
    const data = res.body as { status?: string; xMotivo?: string };

    const statusMap: Record<string, ConsultaNotaResult["status"]> = {
      issued: "AUTORIZADA",
      error: "REJEITADA",
      cancelled: "CANCELADA",
      queued: "PENDENTE",
      processing: "PENDENTE",
    };

    return {
      success: res.ok,
      data: { status: statusMap[data.status ?? ""] ?? "PENDENTE", returnMessage: data.xMotivo },
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
      errorMessage: res.ok ? undefined : (res.body as { error?: string })?.error,
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
