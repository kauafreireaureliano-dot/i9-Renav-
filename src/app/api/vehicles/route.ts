import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createVehicleSchema } from "@/lib/validation/vehicle";
import { createVehicle, listVehicles } from "@/repositories/vehicle.repository";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("ADMIN", "GERENTE", "VENDEDOR", "FINANCEIRO", "DOCUMENTACAO");
    if (!hasPermission(user.role, "vehicle.view")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    const vehicles = await listVehicles({ search });
    return NextResponse.json({ vehicles });
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
    if (!hasPermission(user.role, "vehicle.create")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = createVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const vehicle = await createVehicle({
      ...parsed.data,
      purchaseValue: parsed.data.purchaseValue ?? 0,
      minimumSalePrice: parsed.data.minimumSalePrice ?? 0,
    });

    await logAudit({
      userId: user.id,
      action: "VEHICLE_CREATE",
      entityType: "Vehicle",
      entityId: vehicle.id,
      after: { plate: vehicle.plate, brand: vehicle.brand, model: vehicle.model },
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
