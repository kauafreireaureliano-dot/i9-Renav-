import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, AuthError } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const settingsSchema = z.object({
  legalName: z.string().min(1),
  tradeName: z.string().min(1),
  cnpj: z.string().min(14),
  stateRegistration: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  renaveEmail: z.string().email().optional().or(z.literal("")),
});

export async function GET() {
  try {
    await requireRole("ADMIN", "GERENTE", "VENDEDOR", "FINANCEIRO", "DOCUMENTACAO");
    const settings = await prisma.companySettings.findFirst();
    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireRole("ADMIN");
    if (!hasPermission(user.role, "settings.edit")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const existing = await prisma.companySettings.findFirst();
    const settings = existing
      ? await prisma.companySettings.update({ where: { id: existing.id }, data: parsed.data })
      : await prisma.companySettings.create({ data: parsed.data });

    await logAudit({
      userId: user.id,
      action: "SETTINGS_UPDATE",
      entityType: "CompanySettings",
      entityId: settings.id,
    });

    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
