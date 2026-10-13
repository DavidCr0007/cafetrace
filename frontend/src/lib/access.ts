import { UserRole } from "@/lib/api";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  accountant: "Contador",
  seller: "Vendedor",
  producer: "Productor",
  marketing: "Marketing",
  buyer: "Comprador",
  auditor: "Auditor",
};

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as Array<[UserRole, string]>;
export const CREATABLE_ROLE_OPTIONS = ROLE_OPTIONS;

export const PERMISSION_LABELS: Record<string, string> = {
  "dashboard.read": "Dashboard",
  "dashboard.summary.read": "Resumen ejecutivo",
  "users.read": "Consulta de usuarios",
  "users.manage": "Gestión de usuarios",
  "password_reset.approve": "Recuperación de cuentas",
  "accounting.read": "Consulta contable",
  "accounting.write": "Liquidaciones y nómina",
  "logistics.read": "Consulta logística",
  "logistics.write": "Gestión logística",
  "traceability.read": "Consulta de trazabilidad",
  "traceability.write": "Registro de trazabilidad e IoT",
  "blockchain.notarize": "Notarización blockchain",
  "reports.read": "Reportes",
  "catalog.read": "Productos y catálogo",
  "catalog.write": "Gestión de productos",
  "orders.read": "Consulta de pedidos",
  "orders.write": "Gestión de pedidos",
  "audit.read": "Auditoría",
  "marketing.write": "Marketing",
  "profile.write": "Perfil propio",
};

export function permissionLabel(permission: string): string {
  return PERMISSION_LABELS[permission] || permission;
}
