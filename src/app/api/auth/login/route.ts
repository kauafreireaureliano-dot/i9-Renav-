import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation/auth";
import { isRateLimited } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  if (isRateLimited(`login:${ip}`)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Mensagem genérica em qualquer falha, para não revelar se o e-mail existe.
  const genericError = () =>
    NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 401 });

  if (!user || !user.active) {
    await logAudit({ action: "LOGIN_FAILED", entityType: "User", ipAddress: ip });
    return genericError();
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    await logAudit({
      action: "LOGIN_FAILED",
      entityType: "User",
      entityId: user.id,
      ipAddress: ip,
    });
    return genericError();
  }

  await createSession(user.id, {
    userAgent: req.headers.get("user-agent") ?? undefined,
    ipAddress: ip,
  });

  await logAudit({
    userId: user.id,
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
    ipAddress: ip,
  });

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
