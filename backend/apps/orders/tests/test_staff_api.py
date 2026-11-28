from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.catalog.tests.helpers import make_product
from apps.inventory.models import InventoryMovement, StockReservation
from apps.orders.models import Order, OrderItem, OrderStatusHistory


pytestmark = pytest.mark.django_db

ORDERS_URL = "/api/v1/admin/orders/"


@pytest.fixture
def staff_user(django_user_model):
    return django_user_model.objects.create_user(
        email="orders-staff@example.com",
        password="TestPassword123!",
        is_staff=True,
    )


@pytest.fixture
def staff_client(staff_user):
    client = APIClient()
    client.force_authenticate(user=staff_user)
    return client


@pytest.fixture
def customer(django_user_model):
    return django_user_model.objects.create_user(
        email="customer@example.com",
        password="TestPassword123!",
    )


@pytest.fixture
def category(db):
    from apps.catalog.models import Category

    return Category.objects.create(name="Order Test Category")


@pytest.fixture
def product(category):
    return make_product(
        category,
        "ORD-001",
        name="Order Test Product",
        pack_size="1 kg",
    )


def make_order(customer, product, *, quantity=2, stock_tracked=True):
    order = Order.objects.create(
        customer=customer,
        customer_name="Test Customer",
        customer_email="customer@example.com",
        customer_phone="0712345678",
        delivery_address="Juja, Kenya",
        delivery_instructions="Call on arrival",
        payment_method=Order.PaymentMethod.MPESA,
        subtotal=Decimal("200.00"),
        delivery_fee=Decimal("50.00"),
        total_amount=Decimal("250.00"),
    )

    item = OrderItem.objects.create(
        order=order,
        product=product,
        product_name=product.name,
        sku=product.sku,
        pack_size=product.pack_size,
        quantity=quantity,
        unit_price=Decimal("100.00"),
        stock_tracked=stock_tracked,
    )

    return order, item


def test_order_list_requires_staff_access():
    anonymous_response = APIClient().get(ORDERS_URL)

    regular_client = APIClient()
    from django.contrib.auth import get_user_model

    user = get_user_model().objects.create_user(
        email="regular@example.com",
        password="TestPassword123!",
    )
    regular_client.force_authenticate(user=user)

    regular_response = regular_client.get(ORDERS_URL)

    assert anonymous_response.status_code == 401
    assert regular_response.status_code == 403


def test_staff_can_list_orders(staff_client, customer, product):
    order, _ = make_order(customer, product)

    response = staff_client.get(ORDERS_URL)

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == order.id
    assert response.data["results"][0]["reference"] == order.reference
    assert response.data["results"][0]["item_count"] == 1


def test_order_list_searches_reference_and_customer_details(
    staff_client, customer, product
):
    matching, _ = make_order(customer, product)
    make_order(customer, product)

    response = staff_client.get(
        ORDERS_URL,
        {"search": matching.reference},
    )

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == matching.id

    response = staff_client.get(
        ORDERS_URL,
        {"search": "0712345678"},
    )

    assert response.data["count"] == 2


def test_order_list_filters_by_status_and_payment_status(
    staff_client, customer, product
):
    pending, _ = make_order(customer, product)
    cancelled, _ = make_order(customer, product)
    cancelled.status = Order.Status.CANCELLED
    cancelled.payment_status = Order.PaymentStatus.PAID
    cancelled.save(update_fields=["status", "payment_status"])

    response = staff_client.get(
        ORDERS_URL,
        {"status": Order.Status.PENDING_CONFIRMATION},
    )

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == pending.id

    response = staff_client.get(
        ORDERS_URL,
        {"payment_status": Order.PaymentStatus.PAID},
    )

    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == cancelled.id


def test_order_list_supports_page_size(staff_client, customer, product):
    for _ in range(3):
        make_order(customer, product)

    response = staff_client.get(
        ORDERS_URL,
        {"page_size": 2},
    )

    assert response.status_code == 200
    assert response.data["count"] == 3
    assert len(response.data["results"]) == 2
    assert response.data["next"] is not None


def test_staff_can_view_order_details(
    staff_client, customer, product
):
    order, item = make_order(customer, product)

    OrderStatusHistory.objects.create(
        order=order,
        from_status="",
        to_status=Order.Status.PENDING_CONFIRMATION,
        note="Order received",
    )

    response = staff_client.get(f"{ORDERS_URL}{order.id}/")

    assert response.status_code == 200
    assert response.data["reference"] == order.reference
    assert response.data["customer_name"] == "Test Customer"
    assert response.data["delivery_address"] == "Juja, Kenya"
    assert len(response.data["items"]) == 1
    assert response.data["items"][0]["id"] == item.id
    assert response.data["items"][0]["line_total"] == "200.00"
    assert len(response.data["status_history"]) == 1

    history_entry = response.data["status_history"][0]
    assert history_entry["from_status"] == ""
    assert history_entry["from_status_label"] == "Order placed"
    assert history_entry["to_status"] == Order.Status.PENDING_CONFIRMATION
    assert history_entry["to_status_label"] == "Pending confirmation"


def test_order_detail_returns_404_for_unknown_order(staff_client):
    response = staff_client.get(f"{ORDERS_URL}999999/")

    assert response.status_code == 404


def test_staff_can_confirm_order_and_reserve_stock(
    staff_client, staff_user, customer, product
):
    product.stock_quantity = 10
    product.save(update_fields=["stock_quantity"])
    order, item = make_order(customer, product, quantity=3)

    response = staff_client.post(
        f"{ORDERS_URL}{order.id}/transition/",
        {"to_status": Order.Status.CONFIRMED, "delivery_fee": "75.00"},
        format="json",
    )

    assert response.status_code == 200, response.data

    order.refresh_from_db()
    product.refresh_from_db()

    reservation = StockReservation.objects.get(order_item=item)

    assert order.status == Order.Status.CONFIRMED
    assert order.confirmed_by_id == staff_user.id
    assert order.confirmed_at is not None
    assert order.delivery_fee == Decimal("75.00")
    assert order.delivery_fee_confirmed is True
    assert order.total_amount == Decimal("275.00")
    assert product.stock_quantity == 10
    assert reservation.quantity == 3
    assert reservation.status == StockReservation.Status.ACTIVE
    assert OrderStatusHistory.objects.filter(
        order=order,
        to_status=Order.Status.CONFIRMED,
    ).exists()


def test_confirmation_requires_delivery_fee(
    staff_client, customer, product
):
    order, _ = make_order(customer, product)

    response = staff_client.post(
        f"{ORDERS_URL}{order.id}/transition/",
        {"to_status": Order.Status.CONFIRMED},
        format="json",
    )

    assert response.status_code == 400
    assert "delivery_fee" in response.data

    order.refresh_from_db()
    assert order.status == Order.Status.PENDING_CONFIRMATION
    assert order.delivery_fee_confirmed is False


@pytest.mark.parametrize("invalid_fee", ["-1.00", "-0.01"])
def test_confirmation_rejects_negative_delivery_fee(
    staff_client, customer, product, invalid_fee
):
    order, _ = make_order(customer, product)

    response = staff_client.post(
        f"{ORDERS_URL}{order.id}/transition/",
        {
            "to_status": Order.Status.CONFIRMED,
            "delivery_fee": invalid_fee,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "delivery_fee" in response.data

    order.refresh_from_db()
    assert order.status == Order.Status.PENDING_CONFIRMATION
    assert order.delivery_fee == Decimal("50.00")
    assert order.delivery_fee_confirmed is False


def test_delivery_fee_cannot_be_changed_after_confirmation(
    staff_client, customer, product
):
    order, _ = make_order(customer, product)
    product.stock_quantity = 10
    product.save(update_fields=["stock_quantity"])

    confirmed = staff_client.post(
        f"{ORDERS_URL}{order.id}/transition/",
        {
            "to_status": Order.Status.CONFIRMED,
            "delivery_fee": "75.00",
        },
        format="json",
    )
    assert confirmed.status_code == 200, confirmed.data

    response = staff_client.post(
        f"{ORDERS_URL}{order.id}/transition/",
        {
            "to_status": Order.Status.PROCESSING,
            "delivery_fee": "100.00",
        },
        format="json",
    )

    assert response.status_code == 400

    order.refresh_from_db()
    assert order.delivery_fee == Decimal("75.00")
    assert order.total_amount == Decimal("275.00")


def test_confirmation_rejects_insufficient_stock(
    staff_client, customer, product
):
    product.stock_quantity = 1
    product.save(update_fields=["stock_quantity"])
    order, _ = make_order(customer, product, quantity=3)

    response = staff_client.post(
        f"{ORDERS_URL}{order.id}/transition/",
        {"to_status": Order.Status.CONFIRMED, "delivery_fee": "75.00"},
        format="json",
    )

    assert response.status_code == 400

    order.refresh_from_db()

    assert order.status == Order.Status.PENDING_CONFIRMATION
    assert order.delivery_fee == Decimal("50.00")
    assert order.delivery_fee_confirmed is False
    assert order.total_amount == Decimal("250.00")
    assert not StockReservation.objects.filter(order=order).exists()
    assert not OrderStatusHistory.objects.filter(order=order).exists()


def test_manual_stock_requires_explicit_verification(
    staff_client, customer, product
):
    order, _ = make_order(
        customer,
        product,
        stock_tracked=False,
    )

    response = staff_client.post(
        f"{ORDERS_URL}{order.id}/transition/",
        {
            "to_status": Order.Status.CONFIRMED,
            "delivery_fee": "75.00",
        },
        format="json",
    )

    assert response.status_code == 400
    assert order.status == Order.Status.PENDING_CONFIRMATION

    response = staff_client.post(
        f"{ORDERS_URL}{order.id}/transition/",
        {
            "to_status": Order.Status.CONFIRMED,
            "delivery_fee": "75.00",
            "manual_stock_verified": True,
        },
        format="json",
    )

    assert response.status_code == 200, response.data

    order.refresh_from_db()

    assert order.status == Order.Status.CONFIRMED
    assert not StockReservation.objects.filter(order=order).exists()


def test_mixed_order_reserves_only_tracked_items(
    staff_client, customer, product, category
):
    product.stock_quantity = 10
    product.save(update_fields=["stock_quantity"])

    manual_product = make_product(
        category,
        "ORD-002",
        name="Manual Stock Product",
    )

    order, tracked_item = make_order(
        customer,
        product,
        quantity=3,
        stock_tracked=True,
    )

    OrderItem.objects.create(
        order=order,
        product=manual_product,
        product_name=manual_product.name,
        sku=manual_product.sku,
        pack_size=manual_product.pack_size,
        quantity=2,
        unit_price=Decimal("100.00"),
        stock_tracked=False,
    )

    response = staff_client.post(
        f"{ORDERS_URL}{order.id}/transition/",
        {
            "to_status": Order.Status.CONFIRMED,
            "delivery_fee": "75.00",
            "manual_stock_verified": True,
        },
        format="json",
    )

    assert response.status_code == 200, response.data

    assert StockReservation.objects.filter(
        order_item=tracked_item,
        status=StockReservation.Status.ACTIVE,
    ).exists()

    assert StockReservation.objects.filter(order=order).count() == 1


def test_rejection_requires_reason_and_records_it(
    staff_client, customer, product
):
    order, _ = make_order(customer, product)

    response = staff_client.post(
        f"{ORDERS_URL}{order.id}/transition/",
        {"to_status": Order.Status.REJECTED},
        format="json",
    )

    assert response.status_code == 400

    response = staff_client.post(
        f"{ORDERS_URL}{order.id}/transition/",
        {
            "to_status": Order.Status.REJECTED,
            "note": "Product is unavailable.",
        },
        format="json",
    )

    assert response.status_code == 200, response.data

    order.refresh_from_db()

    assert order.status == Order.Status.REJECTED
    assert order.cancellation_reason == "Product is unavailable."
    assert OrderStatusHistory.objects.filter(
        order=order,
        to_status=Order.Status.REJECTED,
        note="Product is unavailable.",
    ).exists()


def test_cancellation_releases_reservations(
    staff_client, staff_user, customer, product
):
    product.stock_quantity = 10
    product.save(update_fields=["stock_quantity"])
    order, item = make_order(customer, product, quantity=3)

    confirmed = staff_client.post(
        f"{ORDERS_URL}{order.id}/transition/",
        {"to_status": Order.Status.CONFIRMED, "delivery_fee": "75.00"},
        format="json",
    )
    assert confirmed.status_code == 200, confirmed.data

    cancelled = staff_client.post(
        f"{ORDERS_URL}{order.id}/transition/",
        {
            "to_status": Order.Status.CANCELLED,
            "note": "Customer requested cancellation.",
        },
        format="json",
    )

    assert cancelled.status_code == 200, cancelled.data

    order.refresh_from_db()
    product.refresh_from_db()
    reservation = StockReservation.objects.get(order_item=item)

    assert order.status == Order.Status.CANCELLED
    assert order.cancellation_reason == "Customer requested cancellation."
    assert product.stock_quantity == 10
    assert reservation.status == StockReservation.Status.RELEASED
    assert InventoryMovement.objects.filter(
        order=order,
        movement_type=InventoryMovement.MovementType.RELEASE,
    ).exists()


def test_delivery_consumes_reserved_physical_stock(
    staff_client, customer, product
):
    product.stock_quantity = 10
    product.save(update_fields=["stock_quantity"])
    order, item = make_order(customer, product, quantity=3)

    transitions = [
        (Order.Status.CONFIRMED, {"delivery_fee": "75.00"}),
        (Order.Status.PROCESSING, {}),
        (Order.Status.OUT_FOR_DELIVERY, {}),
        (Order.Status.DELIVERED, {}),
    ]

    for to_status, extra in transitions:
        response = staff_client.post(
            f"{ORDERS_URL}{order.id}/transition/",
            {"to_status": to_status, **extra},
            format="json",
        )
        assert response.status_code == 200, response.data

    order.refresh_from_db()
    product.refresh_from_db()
    reservation = StockReservation.objects.get(order_item=item)

    assert order.status == Order.Status.DELIVERED
    assert order.delivered_at is not None
    assert product.stock_quantity == 7
    assert reservation.status == StockReservation.Status.CONSUMED
    assert InventoryMovement.objects.filter(
        order=order,
        movement_type=InventoryMovement.MovementType.SALE,
    ).exists()


def test_invalid_transition_does_not_change_order(
    staff_client, customer, product
):
    order, _ = make_order(customer, product)

    response = staff_client.post(
        f"{ORDERS_URL}{order.id}/transition/",
        {"to_status": Order.Status.DELIVERED},
        format="json",
    )

    assert response.status_code == 400

    order.refresh_from_db()

    assert order.status == Order.Status.PENDING_CONFIRMATION
    assert not OrderStatusHistory.objects.filter(order=order).exists()


def test_completed_order_cannot_transition_again(
    staff_client, customer, product
):
    order, _ = make_order(customer, product)
    order.status = Order.Status.COMPLETED
    order.save(update_fields=["status"])

    response = staff_client.post(
        f"{ORDERS_URL}{order.id}/transition/",
        {"to_status": Order.Status.CANCELLED, "note": "Too late"},
        format="json",
    )

    assert response.status_code == 400

    order.refresh_from_db()
    assert order.status == Order.Status.COMPLETED


def test_transition_does_not_allow_payment_status_changes(
    staff_client, customer, product
):
    product.stock_quantity = 10
    product.save(update_fields=["stock_quantity"])

    order, _ = make_order(customer, product)

    response = staff_client.post(
        f"{ORDERS_URL}{order.id}/transition/",
        {
            "to_status": Order.Status.CONFIRMED,
            "delivery_fee": "75.00",
            "payment_status": Order.PaymentStatus.PAID,
        },
        format="json",
    )

    assert response.status_code == 200, response.data

    order.refresh_from_db()
    assert order.payment_status == Order.PaymentStatus.UNPAID
