
from django.conf import settings
from django.middleware.csrf import CsrfViewMiddleware

from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication


class CSRFCheck(CsrfViewMiddleware):
    def _reject(self, request, reason):
        return reason


def enforce_csrf(request):
    """
    Enforce CSRF validation for cookie-authenticated requests.
    """

    check = CSRFCheck(lambda request: None) #type:ignore

    check.process_request(request)

    reason = check.process_view(
        request,
        None,
        (),
        {}
    )

    if reason:
        raise exceptions.PermissionDenied(
            f"CSRF validation failed: {reason}"
        )


class CookieJWTAuthentication(JWTAuthentication):

    def authenticate(self, request):

        # Prefer the standard Authorization header if provided.
        header = self.get_header(request)

        if header is not None:
            return super().authenticate(request)

        # Otherwise, retrieve the JWT from the HttpOnly cookie.
        cookie_name = getattr(
            settings,
            "JWT_AUTH_COOKIE",
            "access_token"
        )

        raw_token = request.COOKIES.get(cookie_name)

        if raw_token is None:
            return None

        # Cookie authentication requires CSRF protection.
        enforce_csrf(request)

        validated_token = self.get_validated_token(raw_token)

        return self.get_user(validated_token), validated_token
