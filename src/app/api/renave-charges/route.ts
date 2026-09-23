import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { listPendingCharges, getPendingTotal } from "@/repositories/renave-charge.repository";

export async function GET() {
  try {
    await requireRole("ADMIN", "GERENTE", "FINANCEIRO");
    const [charges, total] = await Promise.all([listPendingCharges(), getPendingTotal()]);
    return NextResponse.json({ charges, total });
  } catch (err) {
    return handleApiError(err);
  }
}
