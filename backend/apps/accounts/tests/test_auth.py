import pytest
from rest_framework.test import APIClient

LOGIN_URL = "/api/v1/auth/login/"
REFRESH_URL = "/api/v1/auth/refresh/"
LOGOUT_URL = "/api/v1/auth/logout/"
ME_URL = "/api/v1/auth/me/"
PASSWORD = "S3cure-pass-for-tests!"


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def staff_user(django_user_model):
    return django_user_model.objects.create_user(
        email="Owner@Example.com", password=PASSWORD, is_staff=True
    )


@pytest.fixture
def plain_user(django_user_model):
    return django_user_model.objects.create_user(
        email="customer@example.com", password=PASSWORD
    )


@pytest.mark.django_db
def test_staff_can_login_and_read_profile(api, staff_user):
    response = api.post(LOGIN_URL, {"email": "owner@example.com", "password": PASSWORD})
    assert response.status_code == 200
    assert {"access", "refresh"} <= set(response.data)

    api.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    me = api.get(ME_URL)
    assert me.status_code == 200
    assert me.data["email"] == "owner@example.com"


@pytest.mark.django_db
def test_wrong_password_is_rejected(api, staff_user):
    response = api.post(LOGIN_URL, {"email": "owner@example.com", "password": "nope"})
    assert response.status_code == 401


@pytest.mark.django_db
def test_non_staff_cannot_login(api, plain_user):
    response = api.post(
        LOGIN_URL, {"email": "customer@example.com", "password": PASSWORD}
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_me_requires_authentication(api):
    assert api.get(ME_URL).status_code == 401


@pytest.mark.django_db
def test_logout_blacklists_refresh_token(api, staff_user):
    tokens = api.post(
        LOGIN_URL, {"email": "owner@example.com", "password": PASSWORD}
    ).data
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    logout = api.post(LOGOUT_URL, {"refresh": tokens["refresh"]})
    assert logout.status_code == 204

    api.credentials()
    reuse = api.post(REFRESH_URL, {"refresh": tokens["refresh"]})
    assert reuse.status_code == 401
