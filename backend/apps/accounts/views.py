
from typing import cast
from .authentication import enforce_csrf
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

from .models import User
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
)


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str | None = None,
) -> None:

    response.set_cookie(
        key=settings.JWT_AUTH_COOKIE,
        value=access_token,
        httponly=True,
        secure=settings.JWT_AUTH_COOKIE_SECURE,
        samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
        path=settings.JWT_AUTH_COOKIE_PATH,
        max_age=900,
    )

    if refresh_token:
        response.set_cookie(
            key=settings.JWT_REFRESH_COOKIE,
            value=refresh_token,
            httponly=True,
            secure=settings.JWT_AUTH_COOKIE_SECURE,
            samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
            path=settings.JWT_REFRESH_COOKIE_PATH,
            max_age=604800,
        )


def clear_auth_cookies(response: Response) -> None:

    response.delete_cookie(
        settings.JWT_AUTH_COOKIE,
        path=settings.JWT_AUTH_COOKIE_PATH,
        samesite=settings.JWT_AUTH_COOKIE_SAMESITE,#type:ignore
    )

    response.delete_cookie(
        settings.JWT_REFRESH_COOKIE,
        path=settings.JWT_REFRESH_COOKIE_PATH,
        samesite=settings.JWT_AUTH_COOKIE_SAMESITE,#type:ignore
    )


class CSRFTokenView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request: Request) -> Response:
        from django.middleware.csrf import get_token

        return Response({
            "csrfToken": get_token(request)#type:ignore
        })


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request: Request) -> Response:
        enforce_csrf(request)
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = cast(User, serializer.save())

        refresh = RefreshToken.for_user(user)

        response = Response(
            {
                "message": "Registration successful.",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )

        set_auth_cookies(
            response,
            str(refresh.access_token),
            str(refresh),
        )
    

        return response
    
    

class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request: Request) -> Response:
        enforce_csrf(request)

        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )

        

        serializer.is_valid(raise_exception=True)

        user = cast(User, serializer.validated_data["user"]) #type:ignore

        refresh = RefreshToken.for_user(user)

        response = Response({
            "message": "Login successful.",
            "user": UserSerializer(user).data,
        })

        set_auth_cookies(
            response,
            str(refresh.access_token),
            str(refresh),
        )

        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:

        refresh_token = request.COOKIES.get(
            settings.JWT_REFRESH_COOKIE
        )

        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass

        response = Response({
            "message": "Logout successful."
        })

        clear_auth_cookies(response)

        return response


class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request: Request) -> Response:
        enforce_csrf(request)
        refresh_token = request.COOKIES.get(
            settings.JWT_REFRESH_COOKIE
        )

        if not refresh_token:
            return Response(
                {"error": "Refresh token is missing."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = TokenRefreshSerializer(
            data={"refresh": refresh_token}
        )

        try:
            serializer.is_valid(raise_exception=True)

            access_token = serializer.validated_data["access"] #type:ignore
            new_refresh = serializer.validated_data.get("refresh") #type:ignore

            response = Response({
                "message": "Token refreshed successfully."
            })

            set_auth_cookies(
                response,
                access_token, #type:ignore
                new_refresh,
            )

            return response

        except TokenError:
            response = Response(
                {"error": "Invalid or expired refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

            clear_auth_cookies(response)

            return response


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:

        user = cast(User, request.user)

        serializer = UserSerializer(user)

        return Response(serializer.data)
