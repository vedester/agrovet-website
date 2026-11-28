# from django.urls import path

# from .views import LoginView, LogoutView, MeView, RefreshView

# app_name = "accounts"

# urlpatterns = [
#     path("login/", LoginView.as_view(), name="login"),
#     path("refresh/", RefreshView.as_view(), name="refresh"),
#     path("logout/", LogoutView.as_view(), name="logout"),
#     path("me/", MeView.as_view(), name="me"),
# ]

from django.urls import path

from .views import (
    CustomerLoginView,
    CustomerMeView,
    LoginView,
    LogoutView,
    MeView,
    RefreshView,
    RegisterView,
)

app_name = "accounts"

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("register/", RegisterView.as_view(), name="register"),
    path("customer/login/", CustomerLoginView.as_view(), name="customer-login"),
    path("customer/me/", CustomerMeView.as_view(), name="customer-me"),
    path("refresh/", RefreshView.as_view(), name="refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
]