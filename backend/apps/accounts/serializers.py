from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


class LoginSerializer(TokenObtainPairSerializer):
    """Email + password login, restricted to staff accounts."""

    def validate(self, attrs):
        attrs[self.username_field] = attrs[self.username_field].strip().lower()
        data = super().validate(attrs)
        if not self.user.is_staff:
            raise AuthenticationFailed(
                self.error_messages["no_active_account"], "no_active_account"
            )
        return data


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, attrs):
        try:
            self._token = RefreshToken(attrs["refresh"])
        except TokenError:
            raise serializers.ValidationError(
                {"refresh": "Invalid or expired token."}
            )
        return attrs

    def save(self, **kwargs):
        self._token.blacklist()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "is_staff")
        read_only_fields = fields
