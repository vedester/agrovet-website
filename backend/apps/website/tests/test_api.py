import pytest

from apps.website.models import SiteSettings
from apps.website.validators import default_opening_hours

pytestmark = pytest.mark.django_db

PUBLIC = "/api/v1/site/"
STAFF = "/api/v1/admin/site/"

# Pinned on purpose: adding a field to the public response must be a deliberate choice.
PUBLIC_FIELDS = {
    "business_name",
    "tagline",
    "about_text",
    "phone",
    "whatsapp_number",
    "whatsapp_url",
    "whatsapp_greeting",
    "email",
    "address",
    "google_maps_url",
    "opening_hours",
    "hours_note",
    "facebook_url",
    "instagram_url",
    "tiktok_url",
    "order_note",
    "seo_title",
    "seo_description",
}


def test_public_settings_have_a_fixed_shape_and_never_write(anon_client):
    response = anon_client.get(PUBLIC)

    assert response.status_code == 200
    assert set(response.data) == PUBLIC_FIELDS
    assert response.data["whatsapp_url"] == ""
    assert len(response.data["opening_hours"]) == 7
    assert "public" in response["Cache-Control"]
    assert SiteSettings.objects.count() == 0


def test_public_settings_ignore_bad_tokens_and_are_read_only(anon_client):
    anon_client.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
    assert anon_client.get(PUBLIC).status_code == 200
    assert anon_client.post(PUBLIC, {"business_name": "x"}, format="json").status_code == 405


def test_public_settings_need_one_query(anon_client, django_assert_max_num_queries):
    SiteSettings.load()
    with django_assert_max_num_queries(1):
        assert anon_client.get(PUBLIC).status_code == 200


@pytest.mark.parametrize("method", ["get", "patch"])
def test_staff_endpoint_requires_staff(method, anon_client, plain_client):
    assert getattr(anon_client, method)(STAFF).status_code == 401
    assert getattr(plain_client, method)(STAFF).status_code == 403


def test_staff_update_normalises_whatsapp_and_the_storefront_sees_it(staff_client, anon_client):
    hours = default_opening_hours()
    hours[6] = {"day": "sun", "closed": False, "opens": "09:00", "closes": "13:00"}

    response = staff_client.patch(
        STAFF,
        {
            "business_name": "Mwangaza Agrovet",
            "whatsapp_number": "0712 345 678",
            "phone": "+254 712 345 678",
            "facebook_url": "https://facebook.com/mwangaza",
            "opening_hours": hours,
        },
        format="json",
    )

    assert response.status_code == 200, response.data
    assert response.data["whatsapp_number"] == "254712345678"
    assert response.data["whatsapp_url"] == "https://wa.me/254712345678"

    public = anon_client.get(PUBLIC).data
    assert public["business_name"] == "Mwangaza Agrovet"
    assert public["whatsapp_url"] == "https://wa.me/254712345678"
    assert public["opening_hours"][6]["opens"] == "09:00"


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({"whatsapp_number": "12345"}, "whatsapp_number"),
        ({"phone": "call me maybe"}, "phone"),
        ({"email": "not-an-email"}, "email"),
        ({"facebook_url": "http://facebook.com/x"}, "facebook_url"),
        ({"instagram_url": "javascript:alert(1)"}, "instagram_url"),
        ({"opening_hours": [{"day": "mon"}]}, "opening_hours"),
    ],
)
def test_staff_update_rejects_bad_values(staff_client, payload, field):
    response = staff_client.patch(STAFF, payload, format="json")
    assert response.status_code == 400
    assert field in response.data


def test_partial_update_keeps_other_fields_and_put_is_not_allowed(staff_client):
    staff_client.patch(
        STAFF,
        {"business_name": "Mwangaza", "tagline": "Farm inputs you can trust"},
        format="json",
    )
    staff_client.patch(STAFF, {"tagline": "New tagline"}, format="json")

    current = staff_client.get(STAFF).data
    assert current["business_name"] == "Mwangaza"
    assert current["tagline"] == "New tagline"
    assert "updated_at" in current
    assert staff_client.put(STAFF, {}, format="json").status_code == 405
