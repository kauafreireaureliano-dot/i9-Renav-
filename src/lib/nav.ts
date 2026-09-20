import type { Permission } from "@/lib/permissions";

export interface NavItem {
  label: string;
  href: string;
  permission?: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Estoque", href: "/estoque", permission: "vehicle.view" },
  { label: "Compras", href: "/compras", permission: "purchase.create" },
  { label: "Vendas", href: "/vendas", permission: "sale.create" },
  { label: "Clientes", href: "/clientes", permission: "customer.view" },
  { label: "Fornecedores", href: "/clientes?papel=FORNECEDOR", permission: "customer.view" },
  { label: "Documentos", href: "/documentos", permission: "documents.view" },
  { label: "RENAVE", href: "/renave", permission: "renave.request" },
  { label: "Notas Fiscais", href: "/notas-fiscais", permission: "fiscal.emit" },
  { label: "Configurações", href: "/configuracoes", permission: "settings.view" },
];
