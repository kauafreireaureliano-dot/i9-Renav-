import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { confirmPixPayment } from "@/services/renave/renave-payment.service";

// Consulta manual de status — usada por um botão "Verificar pagamento" na
// tela, para não depender só do webhook do Mercado Pago chegar.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    await requireRole("ADMIN", "GERENTE", "FINANCEIRO");
    const { paymentId } = await params;
    const result = await confirmPixPayment(paymentId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
