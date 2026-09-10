import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createCustomerSchema } from "@/lib/validation/customer";
import { createCustomer, listCustomers } from "@/repositories/customer.repository";
import { logAudit } from "@/lib/audit";
import type { CustomerRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("ADMIN", "GERENTE", "VENDEDOR", "FINANCEIRO", "DOCUMENTACAO");
    if (!hasPermission(user.role, "customer.view")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    const role = req.nextUrl.searchParams.get("papel") as CustomerRole | null;
    const customers = await listCustomers({ search, role: role ?? undefined });
    return NextResponse.json({ customers });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("ADMIN", "GERENTE", "VENDEDOR", "DOCUMENTACAO");
    if (!hasPermission(user.role, "customer.create")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = createCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, ...rest } = parsed.data;
    const customer = await createCustomer({ ...rest, email: email || undefined });

    await logAudit({
      userId: user.id,
      action: "CUSTOMER_CREATE",
      entityType: "Customer",
      entityId: customer.id,
      after: { name: customer.name, document: customer.document },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
