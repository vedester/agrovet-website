# from rest_framework import serializers
# from rest_framework.exceptions import AuthenticationFailed
# from rest_framework_simplejwt.exceptions import TokenError
# from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
# from rest_framework_simplejwt.tokens import RefreshToken

# from .models import User


# class LoginSerializer(TokenObtainPairSerializer):
#     """Email + password login, restricted to staff accounts."""

#     def validate(self, attrs):
#         attrs[self.username_field] = attrs[self.username_field].strip().lower()
#         data = super().validate(attrs)
#         if not self.user.is_staff:
#             raise AuthenticationFailed(
#                 self.error_messages["no_active_account"], "no_active_account"
#             )
#         return data


# class LogoutSerializer(serializers.Serializer):
#     refresh = serializers.CharField()

#     def validate(self, attrs):
#         try:
#             self._token = RefreshToken(attrs["refresh"])
#         except TokenError as exc:
#             raise serializers.ValidationError(
#                 {"refresh": "Invalid or expired token."}
#             ) from exc
#         return attrs

#     def save(self, **kwargs):
#         self._token.blacklist()


# class UserSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = User
#         fields = ("id", "email", "first_name", "last_name", "is_staff")
#         read_only_fields = fields


from django.contrib.auth.password_validation import validate_password
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


class CustomerLoginSerializer(TokenObtainPairSerializer):
    """Email + password login, restricted to customer accounts."""

    def validate(self, attrs):
        attrs[self.username_field] = attrs[self.username_field].strip().lower()
        data = super().validate(attrs)

        if self.user.is_staff or self.user.is_superuser:
            raise AuthenticationFailed(
                self.error_messages["no_active_account"], "no_active_account"
            )

        return data


class CustomerRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        max_length=128,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "password")
        read_only_fields = ("id",)

    def validate_email(self, value):
        email = User.objects.normalize_email(value.strip()).lower()

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "An account with this email address already exists."
            )

        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")

        return User.objects.create_user(
            password=password,
            is_staff=False,
            is_superuser=False,
            **validated_data,
        )


class CustomerUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name")
        read_only_fields = fields


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, attrs):
        try:
            self._token = RefreshToken(attrs["refresh"])
        except TokenError as exc:
            raise serializers.ValidationError(
                {"refresh": "Invalid or expired token."}
            ) from exc

        return attrs

    def save(self, **kwargs):
        self._token.blacklist()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "is_staff")
        read_only_fields = fields