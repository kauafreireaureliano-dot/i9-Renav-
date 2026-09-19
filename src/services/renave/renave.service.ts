import { prisma } from "@/lib/prisma";
import { sanitizeForLog } from "@/lib/sanitize";
import { getMunicipioCode } from "@/lib/ibge";
import { saveFile } from "@/lib/storage";
import { createDocument } from "@/repositories/document.repository";
import { mockRenaveService } from "./mock-renave.service";
import { realRenaveProvider } from "./real-renave.provider";
import type { RenaveProvider, RenaveCallResult } from "@/domain/renave";
import type { RenaveOperationStatus } from "@prisma/client";

function getEnvironment(): "MOCK" | "HOMOLOGACAO" | "PRODUCAO" {
  const raw = process.env.RENAVE_ENVIRONMENT;
  if (raw === "PRODUCAO" || raw === "HOMOLOGACAO") return raw;
  return "MOCK";
}

// HOMOLOGACAO usa o mesmo realRenaveProvider que PRODUCAO — a diferença é só
// o host (RENAVE_BASE_URL aponta para hom.renave.estaleiro.serpro.gov.br em
// vez do domínio de produção), confirmado pelo suporte do RENAVE em
// 2026-09-18: os mesmos endpoints existem em homologação, só muda a URL.
function getProvider(): RenaveProvider {
  return getEnvironment() === "MOCK" ? mockRenaveService : realRenaveProvider;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function recordEvent<T>(
  vehicleId: string,
  userId: string,
  operation: string,
  result: RenaveCallResult<T>
) {
  const renaveOperation = await prisma.renaveOperation.upsert({
    where: { vehicleId },
    create: { vehicleId, environment: getEnvironment() },
    update: { environment: getEnvironment(), lastCommunicationAt: new Date() },
  });

  await prisma.renaveEvent.create({
    data: {
      renaveOperationId: renaveOperation.id,
      operation,
      status: result.success ? "SUCESSO" : "ERRO",
      requestSanitized: sanitizeForLog(result.raw.request) as never,
      responseSanitized: sanitizeForLog(result.raw.response) as never,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      environment: getEnvironment(),
      userId,
    },
  });

  return renaveOperation;
}

async function setStatus(vehicleId: string, status: RenaveOperationStatus, aptitudeResult?: string) {
  await prisma.renaveOperation.update({ where: { vehicleId }, data: { status, aptitudeResult } });
}

// Valida o dígito verificador do CPF. O RENAVE registra o cpfOperadorResponsavel
// como o responsável legal pela operação perante o Detran — mandar um CPF
// inválido (ou um placeholder tipo 000.000.000-00) é declarar dado falso.
function isValidCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  for (const length of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(digits[i]) * (length + 1 - i);
    }
    const check = ((sum * 10) % 11) % 10;
    if (check !== Number(digits[length])) return false;
  }
  return true;
}

async function getOperatorCpf(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.cpf) {
    throw new Error(
      `Usuário ${user.name} não tem CPF cadastrado — obrigatório para operações no RENAVE.`
    );
  }
  const digits = onlyDigits(user.cpf);
  if (!isValidCpf(digits)) {
    throw new Error(
      `O CPF cadastrado para ${user.name} é inválido. Corrija antes de operar no RENAVE — ele identifica o responsável legal pela operação.`
    );
  }
  return digits;
}

// E-mail do estabelecimento cadastrado em Configurações — o RENAVE usa esse
// endereço pra notificar a loja sobre eventos da operação. Campo existia no
// formulário de Configurações mas nunca era lido nas chamadas reais.
async function getEstablishmentEmail(): Promise<string | undefined> {
  const settings = await prisma.companySettings.findFirst();
  return settings?.renaveEmail ?? undefined;
}

function requireCrvData(vehicle: {
  crvType: string | null;
  codigoSegurancaCrv: string | null;
  numeroCrv: string | null;
}) {
  if (!vehicle.crvType || !vehicle.codigoSegurancaCrv) {
    throw new Error(
      "Veículo sem tipo/código de segurança do CRV cadastrado — obrigatório para o RENAVE. Complete o cadastro do veículo."
    );
  }
  return {
    tipoCrv: vehicle.crvType as "AZUL" | "VERDE" | "BRANCO" | "DIGITAL",
    codigoSegurancaCrv: vehicle.codigoSegurancaCrv,
    numeroCrv: vehicle.numeroCrv ?? undefined,
  };
}

export const RenaveService = {
  environment: getEnvironment,

  async consultarAptidao(vehicleId: string, userId: string) {
    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
    const crv = requireCrvData(vehicle);

    const input = {
      placa: vehicle.plate,
      renavam: vehicle.renavam,
      numeroCrv: crv.numeroCrv,
      tipoCrv: crv.tipoCrv,
    };

    const result = await getProvider().consultarAptidao(input);
    await recordEvent(vehicleId, userId, "consultarAptidao", result);

    if (result.success && result.data) {
      await setStatus(
        vehicleId,
        result.data.apto ? "APTO" : "NAO_APTO",
        result.data.apto ? undefined : result.data.motivosParaNaoAptidao.join("; ")
      );
    } else {
      await setStatus(vehicleId, "ERRO", result.errorMessage);
    }

    return result;
  },

  async solicitarEntradaEstoque(vehicleId: string, userId: string) {
    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: vehicleId },
      include: { purchase: { include: { seller: true } } },
    });
    const crv = requireCrvData(vehicle);
    const cpfOperador = await getOperatorCpf(userId);

    if (!vehicle.purchase) {
      throw new Error("Veículo não tem compra/vendedor registrado — cadastre a compra antes.");
    }

    // A quilometragem vai como leitura de hodômetro declarada ao Detran; 0 em
    // um usado é dado incorreto, e o cadastro aceita 0 como valor provisório.
    if (vehicle.mileage <= 0) {
      throw new Error(
        "Quilometragem do veículo está zerada — informe a km real antes de declarar a entrada ao RENAVE."
      );
    }

    const seller = vehicle.purchase.seller;
    const input = {
      cpfOperadorResponsavel: cpfOperador,
      dataCompra: vehicle.purchase.purchaseDate.toISOString().slice(0, 10),
      emailEstabelecimento: await getEstablishmentEmail(),
      emailVendedor: seller.email ?? undefined,
      valorCompra: Number(vehicle.purchase.value),
      veiculo: {
        codigoSegurancaCrv: crv.codigoSegurancaCrv,
        numeroCrv: crv.numeroCrv,
        placa: vehicle.plate,
        renavam: vehicle.renavam,
        tipoCrv: crv.tipoCrv,
        quilometragemHodometro: vehicle.mileage,
        dataHoraMedicaoHodometro: new Date().toISOString(),
        documentoProprietarioAtual: onlyDigits(seller.document),
        tipoDocumentoProprietarioAtual: seller.documentType === "CNPJ" ? "CNPJ" as const : "CPF" as const,
      },
    };

    const result = await getProvider().solicitarEntradaEstoque(input);
    await recordEvent(vehicleId, userId, "solicitarEntradaEstoque", result);

    if (result.success && result.data) {
      await prisma.renaveOperation.update({
        where: { vehicleId },
        data: { status: "ENTRADA_CONCLUIDA", idEstoqueRenave: result.data.idEstoque },
      });
    } else {
      await setStatus(vehicleId, "ERRO", result.errorMessage);
    }

    return result;
  },

  async solicitarSaidaEstoque(vehicleId: string, userId: string) {
    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: vehicleId },
      include: { sale: { include: { buyer: true } } },
    });
    const crv = requireCrvData(vehicle);
    const cpfOperador = await getOperatorCpf(userId);

    if (!vehicle.sale) {
      throw new Error("Veículo não tem venda/comprador registrado — cadastre a venda antes.");
    }

    const buyer = vehicle.sale.buyer;
    if (
      !buyer.address ||
      !buyer.addressNumber ||
      !buyer.neighborhood ||
      !buyer.zipCode ||
      !buyer.city ||
      !buyer.state
    ) {
      throw new Error(
        `Cadastro do comprador (${buyer.name}) está incompleto (endereço/bairro/CEP) — obrigatório para o RENAVE. Complete em Clientes.`
      );
    }

    const codigoMunicipio = await getMunicipioCode(buyer.city, buyer.state);
    if (!codigoMunicipio) {
      throw new Error(`Não foi possível identificar o código IBGE do município "${buyer.city}/${buyer.state}".`);
    }

    const input = {
      cpfOperadorResponsavel: cpfOperador,
      dataVenda: vehicle.sale.saleDate.toISOString().slice(0, 10),
      emailEstabelecimento: await getEstablishmentEmail(),
      valorVenda: Number(vehicle.sale.value),
      veiculo: {
        codigoSegurancaCrv: crv.codigoSegurancaCrv,
        numeroCrv: crv.numeroCrv,
        placa: vehicle.plate,
        renavam: vehicle.renavam,
      },
      comprador: {
        nome: buyer.name,
        numeroDocumento: onlyDigits(buyer.document),
        tipoDocumento: buyer.documentType === "CNPJ" ? "CNPJ" as const : "CPF" as const,
        email: buyer.email ?? undefined,
        endereco: {
          logradouro: buyer.address,
          numero: buyer.addressNumber,
          bairro: buyer.neighborhood,
          cep: onlyDigits(buyer.zipCode),
          codigoMunicipio: Number(codigoMunicipio),
        },
      },
    };

    const result = await getProvider().solicitarSaidaEstoque(input);
    await recordEvent(vehicleId, userId, "solicitarSaidaEstoque", result);

    if (result.success && result.data) {
      await prisma.renaveOperation.update({
        where: { vehicleId },
        data: { status: "SAIDA_CONCLUIDA", idEstoqueRenave: result.data.idEstoque },
      });
    } else {
      await setStatus(vehicleId, "ERRO", result.errorMessage);
    }

    return result;
  },

  async consultarEstoque(vehicleId: string, userId: string) {
    const operation = await prisma.renaveOperation.findUniqueOrThrow({ where: { vehicleId } });
    if (!operation.idEstoqueRenave) {
      throw new Error("Este veículo ainda não tem um registro de estoque no RENAVE.");
    }
    const result = await getProvider().consultarEstoque(operation.idEstoqueRenave);
    await recordEvent(vehicleId, userId, "consultarEstoque", result);
    return result;
  },

  async enviarNotaFiscal(
    vehicleId: string,
    userId: string,
    chaveNotaFiscal: string,
    evento: "COMPRA" | "VENDA"
  ) {
    const operation = await prisma.renaveOperation.findUniqueOrThrow({ where: { vehicleId } });
    if (!operation.idEstoqueRenave) {
      throw new Error("Este veículo ainda não tem um registro de estoque no RENAVE.");
    }
    const result = await getProvider().enviarNotaFiscal({
      idEstoque: operation.idEstoqueRenave,
      chaveNotaFiscal,
      evento,
    });
    await recordEvent(vehicleId, userId, "enviarNotaFiscal", result);
    return result;
  },

  async cancelarEntrada(vehicleId: string, userId: string) {
    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
    const crv = requireCrvData(vehicle);
    const cpfOperador = await getOperatorCpf(userId);

    const result = await getProvider().cancelarEntrada({
      cpfOperadorResponsavel: cpfOperador,
      dataCancelamentoEstoque: today(),
      veiculo: {
        placa: vehicle.plate,
        renavam: vehicle.renavam,
        numeroCrv: crv.numeroCrv,
        codigoSegurancaCrv: crv.codigoSegurancaCrv,
      },
    });
    await recordEvent(vehicleId, userId, "cancelarEntrada", result);
    if (result.success) await setStatus(vehicleId, "CANCELADO");
    return result;
  },

  async cancelarSaida(vehicleId: string, userId: string) {
    const operation = await prisma.renaveOperation.findUniqueOrThrow({ where: { vehicleId } });
    if (!operation.idEstoqueRenave) {
      throw new Error("Este veículo ainda não tem um registro de estoque no RENAVE.");
    }
    const cpfOperador = await getOperatorCpf(userId);

    const result = await getProvider().cancelarSaida({
      cpfOperadorResponsavel: cpfOperador,
      dataCancelamentoSaidaEstoque: today(),
      idEstoque: operation.idEstoqueRenave,
    });
    await recordEvent(vehicleId, userId, "cancelarSaida", result);
    if (result.success) await setStatus(vehicleId, "CANCELADO");
    return result;
  },

  async consultarAtpv(vehicleId: string, userId: string) {
    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
    const result = await getProvider().consultarAtpv(vehicle.plate, vehicle.renavam);
    await recordEvent(vehicleId, userId, "consultarAtpv", result);
    // A assinatura do vendedor é dada como registrada quando a API devolve a
    // data/tipo do registro — a especificação documenta esses campos, mas não
    // enumera os valores de estadoIntencaoVenda, então não dá pra comparar
    // contra uma constante sem chutar.
    if (result.success && result.data?.dataHoraRegistroAssinaturaVendedor) {
      await setStatus(vehicleId, "ATPV_ASSINADO");
    }
    return result;
  },

  async consultarTermoEntrada(vehicleId: string, userId: string) {
    return consultarTermo(vehicleId, userId, "ENTRADA");
  },

  async consultarTermoSaida(vehicleId: string, userId: string) {
    return consultarTermo(vehicleId, userId, "SAIDA");
  },
};

// Busca o termo oficial (PDF) no RENAVE e arquiva em Documentos, para a loja
// ter o comprovante da operação sem depender de acessar o portal do RENAVE.
async function consultarTermo(vehicleId: string, userId: string, tipo: "ENTRADA" | "SAIDA") {
  const operation = await prisma.renaveOperation.findUniqueOrThrow({ where: { vehicleId } });
  if (!operation.idEstoqueRenave) {
    throw new Error("Este veículo ainda não tem um registro de estoque no RENAVE.");
  }

  const provider = getProvider();
  const result =
    tipo === "ENTRADA"
      ? await provider.consultarTermoEntrada(operation.idEstoqueRenave)
      : await provider.consultarTermoSaida(operation.idEstoqueRenave);

  const operationName = tipo === "ENTRADA" ? "consultarTermoEntrada" : "consultarTermoSaida";
  await recordEvent(vehicleId, userId, operationName, result);

  if (result.success && result.data?.pdfBase64) {
    const numero = result.data.numeroTermo ?? operation.idEstoqueRenave;
    const fileName = `termo-${tipo.toLowerCase()}-estoque-${numero}.pdf`;
    const fileUrl = await saveFile(Buffer.from(result.data.pdfBase64, "base64"), fileName);

    await createDocument({
      vehicleId,
      type: "OUTRO",
      fileUrl,
      fileName,
      mimeType: "application/pdf",
      notes: `Termo de ${tipo === "ENTRADA" ? "entrada em" : "saída de"} estoque nº ${numero} (RENAVE)`,
      uploadedById: userId,
    });
  }

  return result;
}
