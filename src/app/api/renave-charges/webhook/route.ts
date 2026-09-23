import { NextRequest, NextResponse } from "next/server";
import { confirmPixPayment } from "@/services/renave/renave-payment.service";

// Webhook do Mercado Pago (configurável no painel deles) — confirma o
// pagamento automaticamente assim que aprovado, sem precisar clicar em
// "Verificar pagamento" na tela. Não exige login: o Mercado Pago não envia
// sessão de usuário, só o id do pagamento notificado.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const paymentId = body?.data?.id;
    if (paymentId) {
      await confirmPixPayment(String(paymentId));
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook do Mercado Pago:", err);
    return NextResponse.json({ ok: true }); // sempre 200 para o MP não re-tentar em loop
  }
}
