from enum import Enum
from fastapi import Depends, HTTPException, status
from app.api.deps import get_current_user
from app.models.user import User, UserRole


class Permission(str, Enum):
    DASHBOARD_READ = "dashboard.read"
    DASHBOARD_SUMMARY_READ = "dashboard.summary.read"
    USERS_READ = "users.read"
    USERS_MANAGE = "users.manage"
    PASSWORD_RESET_APPROVE = "password_reset.approve"
    ACCOUNTING_READ = "accounting.read"
    ACCOUNTING_WRITE = "accounting.write"
    LOGISTICS_READ = "logistics.read"
    LOGISTICS_WRITE = "logistics.write"
    TRACEABILITY_READ = "traceability.read"
    TRACEABILITY_WRITE = "traceability.write"
    BLOCKCHAIN_NOTARIZE = "blockchain.notarize"
    REPORTS_READ = "reports.read"
    CATALOG_READ = "catalog.read"
    CATALOG_WRITE = "catalog.write"
    ORDERS_READ = "orders.read"
    ORDERS_WRITE = "orders.write"
    AUDIT_READ = "audit.read"
    MARKETING_WRITE = "marketing.write"
    PROFILE_WRITE = "profile.write"


ROLE_PERMISSIONS: dict[UserRole, set[Permission]] = {
    UserRole.ADMIN: set(Permission),
    UserRole.ACCOUNTANT: {Permission.DASHBOARD_READ, Permission.DASHBOARD_SUMMARY_READ, Permission.ACCOUNTING_READ, Permission.ACCOUNTING_WRITE, Permission.LOGISTICS_READ, Permission.ORDERS_READ, Permission.REPORTS_READ, Permission.PROFILE_WRITE},
    UserRole.SELLER: {Permission.DASHBOARD_READ, Permission.DASHBOARD_SUMMARY_READ, Permission.CATALOG_READ, Permission.CATALOG_WRITE, Permission.ORDERS_READ, Permission.ORDERS_WRITE, Permission.LOGISTICS_READ, Permission.LOGISTICS_WRITE, Permission.REPORTS_READ, Permission.PROFILE_WRITE},
    UserRole.PRODUCER: {Permission.DASHBOARD_READ, Permission.DASHBOARD_SUMMARY_READ, Permission.CATALOG_READ, Permission.CATALOG_WRITE, Permission.TRACEABILITY_READ, Permission.TRACEABILITY_WRITE, Permission.BLOCKCHAIN_NOTARIZE, Permission.LOGISTICS_READ, Permission.REPORTS_READ, Permission.PROFILE_WRITE},
    UserRole.MARKETING: {Permission.DASHBOARD_READ, Permission.DASHBOARD_SUMMARY_READ, Permission.CATALOG_READ, Permission.MARKETING_WRITE, Permission.REPORTS_READ, Permission.TRACEABILITY_READ, Permission.PROFILE_WRITE},
    UserRole.BUYER: {Permission.DASHBOARD_READ, Permission.CATALOG_READ, Permission.ORDERS_WRITE, Permission.TRACEABILITY_READ, Permission.PROFILE_WRITE},
    UserRole.CUSTOMER: {Permission.DASHBOARD_READ, Permission.CATALOG_READ, Permission.ORDERS_WRITE, Permission.TRACEABILITY_READ, Permission.PROFILE_WRITE},
    UserRole.AUDITOR: {Permission.DASHBOARD_READ, Permission.DASHBOARD_SUMMARY_READ, Permission.USERS_READ, Permission.ACCOUNTING_READ, Permission.LOGISTICS_READ, Permission.TRACEABILITY_READ, Permission.REPORTS_READ, Permission.AUDIT_READ, Permission.PROFILE_WRITE},
}


def has_permission(user: User, permission: Permission) -> bool:
    return permission in ROLE_PERMISSIONS.get(user.role, set())


def require_permission(permission: Permission):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if not has_permission(current_user, permission):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Permiso requerido: {permission.value}")
        return current_user
    return dependency
