import pytest
from rest_framework.test import APIClient

from apps.inventory.models import InventoryMovement


pytestmark = pytest.mark.django_db


@pytest.fixture
def staff_client(django_user_model):
    user = django_user_model.objects.create_user(
        email="inventory-api-owner@example.com",
        password="test-password",
        is_staff=True,
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def customer_client(django_user_model):
    user = django_user_model.objects.create_user(
        email="inventory-customer@example.com",
        password="test-password",
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def test_inventory_list_returns_stock_breakdown(staff_client, product):
    product.stock_quantity = 12
    product.save(update_fields=["stock_quantity"])

    response = staff_client.get("/api/v1/admin/inventory/products/")

    assert response.status_code == 200

    items = response.data["results"]
    item = next(entry for entry in items if entry["id"] == product.id)

    assert item["stock_quantity"] == 12
    assert item["reserved_quantity"] == 0
    assert item["available_quantity"] == 12
    assert item["stock_tracked"] is True

def test_inventory_list_supports_search(staff_client, product):
    response = staff_client.get(
        "/api/v1/admin/inventory/products/",
        {"search": product.sku},
    )

    assert response.status_code == 200
    assert any(
        item["id"] == product.id
        for item in response.data["results"]
    )

def test_inventory_list_filters_manual_stock(staff_client, product):
    response = staff_client.get(
        "/api/v1/admin/inventory/products/",
        {"stock_status": "manual"},
    )

    assert response.status_code == 200
    assert any(
        item["id"] == product.id
        for item in response.data["results"]
    )

def test_customer_cannot_access_inventory(customer_client):
    response = customer_client.get(
        "/api/v1/admin/inventory/products/"
    )

    assert response.status_code == 403


def test_anonymous_user_cannot_access_inventory():
    response = APIClient().get(
        "/api/v1/admin/inventory/products/"
    )

    assert response.status_code == 401


def test_staff_can_restock_product(staff_client, product):
    product.stock_quantity = 5
    product.save(update_fields=["stock_quantity"])

    response = staff_client.post(
        f"/api/v1/admin/inventory/products/{product.id}/restock/",
        {
            "quantity": 10,
            "reason": "Supplier delivery",
        },
        format="json",
    )

    assert response.status_code == 200

    product.refresh_from_db()
    assert product.stock_quantity == 15
    assert InventoryMovement.objects.filter(
        product=product,
        movement_type=InventoryMovement.MovementType.RESTOCK,
    ).count() == 1


def test_staff_can_adjust_product_stock(staff_client, product):
    product.stock_quantity = 10
    product.save(update_fields=["stock_quantity"])

    response = staff_client.post(
        f"/api/v1/admin/inventory/products/{product.id}/adjust/",
        {
            "quantity_delta": -2,
            "reason": "Damaged units",
        },
        format="json",
    )

    assert response.status_code == 200

    product.refresh_from_db()
    assert product.stock_quantity == 8


def test_restock_requires_positive_quantity(staff_client, product):
    product.stock_quantity = 5
    product.save(update_fields=["stock_quantity"])

    response = staff_client.post(
        f"/api/v1/admin/inventory/products/{product.id}/restock/",
        {
            "quantity": 0,
            "reason": "Supplier delivery",
        },
        format="json",
    )

    assert response.status_code == 400

    product.refresh_from_db()
    assert product.stock_quantity == 5


def test_stock_adjustment_requires_reason(staff_client, product):
    product.stock_quantity = 5
    product.save(update_fields=["stock_quantity"])

    response = staff_client.post(
        f"/api/v1/admin/inventory/products/{product.id}/adjust/",
        {
            "quantity_delta": -1,
            "reason": "",
        },
        format="json",
    )

    assert response.status_code == 400


def test_staff_can_view_inventory_movements(staff_client, product):
    product.stock_quantity = 5
    product.save(update_fields=["stock_quantity"])

    from apps.inventory.services import restock_product

    restock_product(
        product_id=product.id,
        quantity=3,
        actor=staff_client.handler._force_user,
        reason="Supplier delivery",
    )

    response = staff_client.get(
        "/api/v1/admin/inventory/movements/",
        {"product": product.id},
    )

    assert response.status_code == 200

    items = response.data["results"]
    assert len(items) == 1
    assert items[0]["product"] == product.id
    assert items[0]["movement_type"] == "restock"


def test_staff_can_enable_stock_tracking(staff_client, product):
    # The fixture product uses manual availability.
    assert product.stock_quantity is None

    response = staff_client.patch(
        f"/api/v1/admin/inventory/products/{product.id}/tracking/",
        {"stock_tracked": True},
        format="json",
    )

    assert response.status_code == 200, response.data

    product.refresh_from_db()
    assert product.stock_quantity == 0
    assert product.is_in_stock is False
    assert response.data["product"]["stock_tracked"] is True


def test_staff_can_disable_tracking_when_stock_is_zero(staff_client, product):
    product.stock_quantity = 0
    product.is_in_stock = False
    product.save(update_fields=["stock_quantity", "is_in_stock"])

    response = staff_client.patch(
        f"/api/v1/admin/inventory/products/{product.id}/tracking/",
        {"stock_tracked": False},
        format="json",
    )

    assert response.status_code == 200, response.data

    product.refresh_from_db()
    assert product.stock_quantity is None
    assert response.data["product"]["stock_tracked"] is False


def test_disabling_tracking_is_rejected_when_physical_stock_remains(
    staff_client, product
):
    product.stock_quantity = 5
    product.save(update_fields=["stock_quantity"])

    response = staff_client.patch(
        f"/api/v1/admin/inventory/products/{product.id}/tracking/",
        {"stock_tracked": False},
        format="json",
    )

    assert response.status_code == 400

    product.refresh_from_db()
    assert product.stock_quantity == 5


def test_stock_tracking_endpoint_rejects_customer(customer_client, product):
    response = customer_client.patch(
        f"/api/v1/admin/inventory/products/{product.id}/tracking/",
        {"stock_tracked": True},
        format="json",
    )

    assert response.status_code == 403
    assert product.stock_quantity is None