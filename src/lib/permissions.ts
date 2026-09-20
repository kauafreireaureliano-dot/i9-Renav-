import type { UserRole } from "@prisma/client";

// Só ficam aqui permissões que têm uma função real implementada por trás.
// Removidas em 2026-09-20 a pedido do Kauã: vehicle.delete, sale.cancel,
// fiscal.cancel, reports.view, users.manage e audit.view não tinham
// nenhuma tela/rota que as usasse — eram "botão fantasma". Se algum dia
// vocês precisarem de alguma dessas funções, é só pedir que eu implemento
// a função de verdade e devolvo a permissão aqui.
export const PERMISSIONS = [
  "vehicle.view",
  "vehicle.create",
  "vehicle.edit",
  "customer.view",
  "customer.create",
  "purchase.create",
  "sale.create",
  "renave.request",
  "renave.cancel",
  "fiscal.emit",
  "documents.upload",
  "documents.view",
  "documents.delete",
  "settings.view",
  "settings.edit",
  "settings.fiscal.edit",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// Matriz de permissões por perfil. Fonte da verdade em código; é replicada
// nas tabelas Permission/RolePermission via seed para permitir consulta/auditoria
// pelo banco sem exigir deploy para ajustes pontuais no futuro.
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [...PERMISSIONS],
  GERENTE: [
    "vehicle.view",
    "vehicle.create",
    "vehicle.edit",
    "customer.view",
    "customer.create",
    "purchase.create",
    "sale.create",
    "renave.request",
    "renave.cancel",
    "fiscal.emit",
    "documents.upload",
    "documents.view",
    "documents.delete",
    "settings.view",
  ],
  VENDEDOR: [
    "vehicle.view",
    "customer.view",
    "customer.create",
    "sale.create",
    "documents.view",
    "renave.request",
  ],
  FINANCEIRO: [
    "vehicle.view",
    "customer.view",
    "documents.view",
    "settings.view",
  ],
  DOCUMENTACAO: [
    "vehicle.view",
    "customer.view",
    "documents.view",
    "documents.upload",
    "documents.delete",
    "renave.request",
    "fiscal.emit",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
