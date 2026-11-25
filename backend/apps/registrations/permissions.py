
from rest_framework.permissions import BasePermission


class IsParticipant(BasePermission):
    """
    Allows access only to authenticated participants.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "PARTICIPANT"
        )


class IsAdminRole(BasePermission):
    """
    Allows access only to authenticated administrators.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "ADMIN"
        )
