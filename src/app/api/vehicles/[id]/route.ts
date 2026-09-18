import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { updateVehicleSchema } from "@/lib/validation/vehicle";
import { updateVehicle, getVehicleById } from "@/repositories/vehicle.repository";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("ADMIN", "GERENTE", "VENDEDOR", "DOCUMENTACAO");
    if (!hasPermission(user.role, "vehicle.edit")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getVehicleById(id);
    if (!existing) {
      return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = updateVehicleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const vehicle = await updateVehicle(id, parsed.data);

    await logAudit({
      userId: user.id,
      action: "VEHICLE_UPDATE",
      entityType: "Vehicle",
      entityId: vehicle.id,
      before: { plate: existing.plate, brand: existing.brand, model: existing.model },
      after: { plate: vehicle.plate, brand: vehicle.brand, model: vehicle.model },
    });

    return NextResponse.json({ vehicle });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
