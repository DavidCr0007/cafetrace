import pytest

from app.core.permissions import Permission, ROLE_PERMISSIONS, has_permission, require_permission
from app.models.user import User, UserRole
from app.schemas.user import PasswordResetApproval, UserCreate


def user_with_role(role: UserRole) -> User:
    return User(id=1, email=f"{role.value}@example.com", role=role, is_active=True, hashed_password="unused")


def test_every_supported_role_has_an_explicit_permission_set():
    assert set(ROLE_PERMISSIONS) == set(UserRole)
    assert all(isinstance(permission, Permission) for permissions in ROLE_PERMISSIONS.values() for permission in permissions)


def test_admin_has_all_permissions_and_read_only_roles_cannot_write():
    admin = user_with_role(UserRole.ADMIN)
    assert ROLE_PERMISSIONS[UserRole.ADMIN] == set(Permission)

    for role in (UserRole.BUYER, UserRole.CUSTOMER, UserRole.AUDITOR):
        user = user_with_role(role)
        assert not has_permission(user, Permission.USERS_MANAGE)
        assert not has_permission(user, Permission.ACCOUNTING_WRITE)
        assert not has_permission(user, Permission.LOGISTICS_WRITE)
        assert not has_permission(user, Permission.BLOCKCHAIN_NOTARIZE)

    assert has_permission(admin, Permission.USERS_MANAGE)
    assert has_permission(admin, Permission.BLOCKCHAIN_NOTARIZE)


@pytest.mark.parametrize("role", list(UserRole))
def test_dashboard_access_is_explicit_for_every_profile(role: UserRole):
    user = user_with_role(role)
    assert has_permission(user, Permission.DASHBOARD_READ)


def test_global_dashboard_summary_is_not_a_buyer_permission():
    assert not has_permission(user_with_role(UserRole.BUYER), Permission.DASHBOARD_SUMMARY_READ)
    assert not has_permission(user_with_role(UserRole.CUSTOMER), Permission.DASHBOARD_SUMMARY_READ)
    assert has_permission(user_with_role(UserRole.ACCOUNTANT), Permission.DASHBOARD_SUMMARY_READ)


def test_require_permission_returns_user_or_rejects():
    dependency = require_permission(Permission.ACCOUNTING_WRITE)
    accountant = user_with_role(UserRole.ACCOUNTANT)
    assert dependency(accountant) is accountant

    with pytest.raises(Exception) as error:
        dependency(user_with_role(UserRole.BUYER))
    assert error.value.status_code == 403


def test_password_policy_is_consistent_on_create_and_reset():
    with pytest.raises(ValueError):
        UserCreate(email="short@example.com", password="short")
    with pytest.raises(ValueError):
        PasswordResetApproval(new_password="short")
    assert len(UserCreate(email="valid@example.com", password="long-enough-password").password) >= 12
