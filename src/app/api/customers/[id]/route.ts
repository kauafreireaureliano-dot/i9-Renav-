import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { updateCustomerSchema } from "@/lib/validation/customer";
import { updateCustomer, getCustomerById } from "@/repositories/customer.repository";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("ADMIN", "GERENTE", "VENDEDOR", "DOCUMENTACAO");
    if (!hasPermission(user.role, "customer.create")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getCustomerById(id);
    if (!existing) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = updateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, ...rest } = parsed.data;
    const customer = await updateCustomer(id, {
      ...rest,
      ...(email !== undefined ? { email: email || null } : {}),
    });

    await logAudit({
      userId: user.id,
      action: "CUSTOMER_UPDATE",
      entityType: "Customer",
      entityId: customer.id,
      before: { name: existing.name, document: existing.document },
      after: { name: customer.name, document: customer.document },
    });

    return NextResponse.json({ customer });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
