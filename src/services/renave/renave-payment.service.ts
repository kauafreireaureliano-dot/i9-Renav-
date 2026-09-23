import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  listPendingCharges,
  tagChargesWithPayment,
  confirmChargesByPayment,
} from "@/repositories/renave-charge.repository";

// Cobra do Arison, via Pix (Mercado Pago), o total acumulado da taxa RENAVE
// (Serpro) que a I9 já deve. O Kauã é quem de fato paga o Serpro depois,
// manualmente, na Área do Cliente — isso aqui só resolve "quanto e como
// cobrar", combinado explicitamente com o cliente (não é cobrança escondida).
//
// Usa a API REST do Mercado Pago direto (sem SDK) para manter consistência
// com o resto do projeto (Notaas e RENAVE também são fetch puro).

const MP_BASE_URL = "https://api.mercadopago.com";

function accessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  }
  return token;
}

interface PixChargeResult {
  paymentId: string;
  qrCode: string; // copia-e-cola
  qrCodeBase64: string; // imagem do QR code
  amount: number;
}

export async function createPixChargeForPendingFees(): Promise<PixChargeResult> {
  const pending = await listPendingCharges();
  const amount = pending.reduce((acc, c) => acc + Number(c.amount), 0);
  if (amount <= 0) {
    throw new Error("Não há taxas RENAVE pendentes para cobrar.");
  }

  const settings = await prisma.companySettings.findFirst();

  const res = await fetch(`${MP_BASE_URL}/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken()}`,
      "X-Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({
      transaction_amount: amount,
      description: "Taxas RENAVE (Serpro) acumuladas — I9 Auto",
      payment_method_id: "pix",
      payer: { email: settings?.email || "financeiro@i9car.com.br" },
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.message ?? "Falha ao gerar cobrança Pix no Mercado Pago.");
  }

  const qrCode = body?.point_of_interaction?.transaction_data?.qr_code;
  const qrCodeBase64 = body?.point_of_interaction?.transaction_data?.qr_code_base64;
  if (!qrCode || !qrCodeBase64) {
    throw new Error("Mercado Pago não retornou o QR code do Pix.");
  }

  const paymentId = String(body.id);
  await tagChargesWithPayment(pending.map((c) => c.id), paymentId);

  return { paymentId, qrCode, qrCodeBase64, amount };
}

// Consulta o status do pagamento no Mercado Pago e, se aprovado, marca as
// taxas pendentes como pagas. Chamada tanto pelo webhook quanto por um botão
// manual "Verificar pagamento", para não depender só do webhook chegar.
export async function confirmPixPayment(paymentId: string): Promise<{ paid: boolean }> {
  const res = await fetch(`${MP_BASE_URL}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.message ?? "Falha ao consultar pagamento no Mercado Pago.");
  }

  if (body.status !== "approved") {
    return { paid: false };
  }

  await confirmChargesByPayment(paymentId);
  return { paid: true };
}
