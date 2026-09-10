import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { createPurchaseSchema } from "@/lib/validation/purchase";
import { createPurchase, listPurchases } from "@/repositories/purchase.repository";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireRole("ADMIN", "GERENTE", "VENDEDOR", "FINANCEIRO", "DOCUMENTACAO");
    const purchases = await listPurchases();
    return NextResponse.json({ purchases });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("ADMIN", "GERENTE", "DOCUMENTACAO");

    const body = await req.json().catch(() => null);
    const parsed = createPurchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const purchase = await createPurchase(parsed.data, user.id);

    await logAudit({
      userId: user.id,
      action: "PURCHASE_CREATE",
      entityType: "Purchase",
      entityId: purchase.id,
      after: { vehicleId: purchase.vehicleId, value: purchase.value.toString() },
    });

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
