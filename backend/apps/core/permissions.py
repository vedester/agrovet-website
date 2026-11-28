from rest_framework.permissions import SAFE_METHODS, BasePermission


def _is_active_staff(user) -> bool:
    return bool(
        user and user.is_authenticated and user.is_active and user.is_staff
    )


class IsStaffUser(BasePermission):
    """Only authenticated, active staff members."""

    def has_permission(self, request, view):
        return _is_active_staff(request.user)


class IsStaffOrReadOnly(BasePermission):
    """Anyone may read; only active staff may write."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return _is_active_staff(request.user)

# customer user permission class 
class IsCustomerUser(BasePermission):
    """Only authenticated, active non-staff customer accounts."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and not user.is_staff
            and not user.is_superuser
        )