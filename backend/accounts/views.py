from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import LoginAttempt, PendingRegistration
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()

_MAX_ATTEMPTS = getattr(settings, "LOGIN_MAX_ATTEMPTS", 5)
_LOCKOUT_MINUTES = getattr(settings, "LOGIN_LOCKOUT_MINUTES", 15)

_REGISTER_GENERIC_MESSAGE = (
    "If an account with this email doesn't already exist, "
    "we've sent a confirmation link to your email."
)


class RegisterView(APIView):
    """POST /api/auth/register/ — validate input, store a pending registration,
    and email a confirmation link.

    Always returns the same generic 201 response regardless of whether the
    email is already registered, so callers can't use this endpoint to find
    out whether an address belongs to an existing account."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        # Never propagate validation errors — every failure path returns the same
        # generic 201 so callers can't probe which field (email, username, password
        # strength, etc.) caused the rejection.
        if not serializer.is_valid():
            return Response({"detail": _REGISTER_GENERIC_MESSAGE}, status=status.HTTP_201_CREATED)

        email = serializer.validated_data["email"]
        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        # Check both silently — no response difference between "email taken",
        # "username taken", or "everything is new".
        email_taken = User.objects.filter(email__iexact=email).exists()
        username_taken = User.objects.filter(username__iexact=username).exists()

        if not email_taken and not username_taken:
            token = PendingRegistration.make_token()
            PendingRegistration.objects.update_or_create(
                email=email,
                defaults={
                    "username": username,
                    "password_hash": make_password(password),
                    "token": token,
                    "expires_at": timezone.now() + timedelta(hours=24),
                },
            )
            confirm_url = (
                f"{settings.FRONTEND_URL}/auth/confirm-registration?token={token}"
            )
            send_mail(
                subject="Confirm your Workout Tracker account",
                message=(
                    f"Hi {username},\n\n"
                    "Tap the link below to complete your registration:\n"
                    f"{confirm_url}\n\n"
                    "This link expires in 24 hours.\n\n"
                    "If you didn't sign up for Workout Tracker, ignore this email."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
            )

        return Response({"detail": _REGISTER_GENERIC_MESSAGE}, status=status.HTTP_201_CREATED)


class ConfirmRegistrationView(APIView):
    """POST /api/auth/confirm-registration/ — body: { token }.

    Validates the token from the confirmation email, creates the user account,
    and returns a JWT pair so the app can log the user in immediately."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get("token", "").strip()
        if not token:
            return Response(
                {"detail": "Token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            pending = PendingRegistration.objects.get(token=token)
        except PendingRegistration.DoesNotExist:
            return Response(
                {"detail": "This confirmation link is invalid or has already been used."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if pending.is_expired:
            pending.delete()
            return Response(
                {"detail": "This confirmation link has expired. Please sign up again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email__iexact=pending.email).exists():
            pending.delete()
            return Response(
                {"detail": "This confirmation link is invalid or has already been used."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username__iexact=pending.username).exists():
            pending.delete()
            return Response(
                {
                    "detail": (
                        "The username you chose was taken while your link was pending. "
                        "Please sign up again with a different username."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        user = User(email=pending.email, username=pending.username)
        user.password = pending.password_hash  # already hashed — don't call set_password()
        user.save()
        pending.delete()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — body: { email, password }.

    Rate-limited: after LOGIN_MAX_ATTEMPTS failures within LOGIN_LOCKOUT_MINUTES
    the endpoint returns 429 until the window expires. Successful login clears
    the counter. Failures for non-existent emails are recorded too, so an
    attacker can't bypass the lock by varying a known-bad email."""

    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        email = request.data.get("email", "").strip().lower()

        if email:
            cutoff = timezone.now() - timedelta(minutes=_LOCKOUT_MINUTES)
            recent_failures = LoginAttempt.objects.filter(
                email=email, attempted_at__gte=cutoff
            ).count()
            if recent_failures >= _MAX_ATTEMPTS:
                return Response(
                    {"detail": "Too many failed attempts. Please try again later."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        try:
            response = super().post(request, *args, **kwargs)
        except Exception:
            if email:
                LoginAttempt.objects.create(email=email)
            raise

        # Successful login — wipe the failure history for this email.
        if email:
            LoginAttempt.objects.filter(email=email).delete()
        return response


class MeView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/auth/me/ — the authenticated user's own profile.

    DELETE permanently removes the account. Posts, comments and workouts all
    have `on_delete=CASCADE` to the user, so deleting the row here also wipes
    everything they created — no extra queries needed. The row being gone
    (rather than soft-deleted) is also what frees up the email/username for
    a new signup."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    """POST /api/auth/logout/ — body: { refresh }. Blacklists the refresh
    token so it can no longer be used to mint new access tokens."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            return Response(
                {"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST
            )
        return Response(status=status.HTTP_205_RESET_CONTENT)


class ChangePasswordView(APIView):
    """POST /api/auth/change-password/ — requires authentication.
    Body: { current_password, new_password, new_password2 }.

    After the password is changed every outstanding refresh token for this
    user is blacklisted, invalidating all other active sessions immediately.
    The client should also clear its own local session and redirect to login
    so the user proves they know the new password."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)

        return Response(
            {"detail": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(APIView):
    """POST /api/auth/password-reset/ — body: { email }.

    Always responds 200 with the same generic message whether or not the
    email belongs to an account, so this endpoint can't be used to enumerate
    registered users. Uses Django's built-in token generator (the same one
    behind django.contrib.auth.views.PasswordResetView) to mint a token that
    a future "confirm reset" endpoint can validate with
    default_token_generator.check_token(user, token)."""

    permission_classes = [permissions.AllowAny]
    GENERIC_MESSAGE = "If an account exists with this email, a reset link has been sent."

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()

        user = User.objects.filter(email__iexact=email).first()
        if user is not None:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_link = f"{settings.FRONTEND_URL}/auth/reset-password?uid={uid}&token={token}"

            send_mail(
                subject="Reset your Workout Tracker password",
                message=(
                    f"Hi {user.username},\n\n"
                    "Use the link below to reset your password:\n"
                    f"{reset_link}\n\n"
                    "If you didn't request this, you can safely ignore this email."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
            )

        return Response({"detail": self.GENERIC_MESSAGE}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """POST /api/auth/password-reset-confirm/ — body:
    { uid, token, new_password, new_password2 }.

    Validates the uid/token pair from the email link (same check Django's
    own password reset form does) before setting the new password. Also
    blacklists every outstanding refresh token for the user, so a device
    that already had a session (e.g. an attacker who triggered the reset
    after stealing a token) gets logged out everywhere once the real owner
    resets their password."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        for outstanding in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=outstanding)

        return Response(
            {"detail": "Your password has been reset. You can now log in."},
            status=status.HTTP_200_OK,
        )
