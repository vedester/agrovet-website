# from rest_framework import status
# from rest_framework.generics import RetrieveAPIView
# from rest_framework.response import Response
# from rest_framework.throttling import ScopedRateThrottle
# from rest_framework.views import APIView
# from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# from apps.core.permissions import IsStaffUser

# from .serializers import LoginSerializer, LogoutSerializer, UserSerializer


# class LoginView(TokenObtainPairView):
#     serializer_class = LoginSerializer
#     throttle_classes = [ScopedRateThrottle]
#     throttle_scope = "login"


# class RefreshView(TokenRefreshView):
#     throttle_classes = [ScopedRateThrottle]
#     throttle_scope = "token_refresh"


# class LogoutView(APIView):
#     """Blacklists the supplied refresh token."""

#     def post(self, request):
#         serializer = LogoutSerializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         serializer.save()
#         return Response(status=status.HTTP_204_NO_CONTENT)


# class MeView(RetrieveAPIView):
#     serializer_class = UserSerializer
#     permission_classes = [IsStaffUser]

#     def get_object(self):
#         return self.request.user

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.core.permissions import IsCustomerUser, IsStaffUser

from .serializers import (
    CustomerLoginSerializer,
    CustomerRegistrationSerializer,
    CustomerUserSerializer,
    LoginSerializer,
    LogoutSerializer,
    UserSerializer,
)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class CustomerLoginView(TokenObtainPairView):
    serializer_class = CustomerLoginSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "customer_login"


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "customer_register"

    def post(self, request):
        serializer = CustomerRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()

        return Response(
            CustomerUserSerializer(customer).data,
            status=status.HTTP_201_CREATED,
        )


class RefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "token_refresh"


class LogoutView(APIView):
    """Blacklists the supplied refresh token."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsStaffUser]

    def get_object(self):
        return self.request.user


class CustomerMeView(RetrieveAPIView):
    serializer_class = CustomerUserSerializer
    permission_classes = [IsCustomerUser]

    def get_object(self):
        return self.request.user