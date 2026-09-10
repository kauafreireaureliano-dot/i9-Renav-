import type { UserRole } from "@prisma/client";

export const PERMISSIONS = [
  "vehicle.view",
  "vehicle.create",
  "vehicle.edit",
  "vehicle.delete",
  "customer.view",
  "customer.create",
  "purchase.create",
  "sale.create",
  "sale.cancel",
  "renave.request",
  "renave.cancel",
  "fiscal.emit",
  "fiscal.cancel",
  "documents.upload",
  "documents.view",
  "reports.view",
  "settings.view",
  "settings.edit",
  "settings.fiscal.edit",
  "users.manage",
  "audit.view",
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
    "sale.cancel",
    "renave.request",
    "renave.cancel",
    "fiscal.emit",
    "documents.upload",
    "documents.view",
    "reports.view",
    "settings.view",
    "audit.view",
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
    "reports.view",
    "documents.view",
    "settings.view",
  ],
  DOCUMENTACAO: [
    "vehicle.view",
    "customer.view",
    "documents.view",
    "documents.upload",
    "renave.request",
    "fiscal.emit",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
