import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { createPixChargeForPendingFees } from "@/services/renave/renave-payment.service";

export async function POST() {
  try {
    await requireRole("ADMIN", "GERENTE", "FINANCEIRO");
    const pix = await createPixChargeForPendingFees();
    return NextResponse.json({ pix });
  } catch (err) {
    return handleApiError(err);
  }
}
