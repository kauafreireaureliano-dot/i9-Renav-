import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { createSaleSchema } from "@/lib/validation/sale";
import { createSale, listSales } from "@/repositories/sale.repository";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireRole("ADMIN", "GERENTE", "VENDEDOR", "FINANCEIRO", "DOCUMENTACAO");
    const sales = await listSales();
    return NextResponse.json({ sales });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("ADMIN", "GERENTE", "VENDEDOR");

    const body = await req.json().catch(() => null);
    const parsed = createSaleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const sale = await createSale(parsed.data, user.id);

    await logAudit({
      userId: user.id,
      action: "SALE_CREATE",
      entityType: "Sale",
      entityId: sale.id,
      after: { vehicleId: sale.vehicleId, value: sale.value.toString() },
    });

    return NextResponse.json({ sale }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
