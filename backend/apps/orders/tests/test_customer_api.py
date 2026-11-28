from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.catalog.models import Category
from apps.catalog.tests.helpers import make_product
from apps.orders.models import Order, OrderItem, OrderStatusHistory


pytestmark = pytest.mark.django_db

CUSTOMER_ORDERS_URL = "/api/v1/orders/"


@pytest.fixture
def customer_user(django_user_model):
    return django_user_model.objects.create_user(
        email="buyer@example.com",
        password="TestPassword123!",
    )


@pytest.fixture
def another_customer(django_user_model):
    return django_user_model.objects.create_user(
        email="another-buyer@example.com",
        password="TestPassword123!",
    )


@pytest.fixture
def customer_client(customer_user):
    client = APIClient()
    client.force_authenticate(user=customer_user)
    return client


@pytest.fixture
def category():
    return Category.objects.create(name="Customer Order Category")


@pytest.fixture
def product(category):
    return make_product(
        category,
        "CUST-001",
        name="Customer Order Product",
        pack_size="1 kg",
    )


def checkout_payload(product, **overrides):
    payload = {
        "customer_name": "Jane Buyer",
        "customer_email": "jane@example.com",
        "customer_phone": "0712345678",
        "delivery_address": "Juja, Kiambu, Kenya",
        "delivery_instructions": "Call before delivery.",
        "payment_method": Order.PaymentMethod.CASH_ON_DELIVERY,
        "items": [
            {
                "product_id": product.id,
                "quantity": 2,
            }
        ],
    }
    payload.update(overrides)
    return payload


def test_guest_can_place_order(anon_client, product):
    response = anon_client.post(
        CUSTOMER_ORDERS_URL,
        checkout_payload(product),
        format="json",
    )

    assert response.status_code == 201, response.data

    order = Order.objects.get(reference=response.data["order"]["reference"])

    assert order.customer is None
    assert order.customer_name == "Jane Buyer"
    assert order.status == Order.Status.PENDING_CONFIRMATION
    assert order.payment_method == Order.PaymentMethod.CASH_ON_DELIVERY
    assert order.payment_status == Order.PaymentStatus.UNPAID
    assert order.subtotal == product.price * 2
    assert order.delivery_fee == Decimal("0.00")
    assert order.delivery_fee_confirmed is False
    assert order.total_amount == order.subtotal

    item = OrderItem.objects.get(order=order)
    assert item.product == product
    assert item.quantity == 2
    assert item.unit_price == product.price

    history = OrderStatusHistory.objects.get(order=order)
    assert history.from_status == ""
    assert history.to_status == Order.Status.PENDING_CONFIRMATION
    assert history.actor is None


def test_authenticated_customer_order_is_linked_to_account(
    customer_client,
    customer_user,
    product,
):
    response = customer_client.post(
        CUSTOMER_ORDERS_URL,
        checkout_payload(product),
        format="json",
    )

    assert response.status_code == 201, response.data

    order = Order.objects.get(reference=response.data["order"]["reference"])
    assert order.customer == customer_user

    history = OrderStatusHistory.objects.get(order=order)
    assert history.actor == customer_user


def test_customer_cannot_override_server_calculated_prices(
    anon_client,
    product,
):
    payload = checkout_payload(product)
    payload["subtotal"] = "1.00"
    payload["delivery_fee"] = "0.00"
    payload["total_amount"] = "1.00"
    payload["payment_status"] = Order.PaymentStatus.PAID
    payload["status"] = Order.Status.CONFIRMED
    payload["items"][0]["unit_price"] = "0.50"

    response = anon_client.post(
        CUSTOMER_ORDERS_URL,
        payload,
        format="json",
    )

    assert response.status_code == 201, response.data

    order = Order.objects.get(reference=response.data["order"]["reference"])

    assert order.subtotal == product.price * 2
    assert order.total_amount == order.subtotal
    assert order.payment_status == Order.PaymentStatus.UNPAID
    assert order.status == Order.Status.PENDING_CONFIRMATION

    item = OrderItem.objects.get(order=order)
    assert item.unit_price == product.price


def test_customer_cannot_order_inactive_product(anon_client, product):
    product.is_active = False
    product.save(update_fields=["is_active"])

    response = anon_client.post(
        CUSTOMER_ORDERS_URL,
        checkout_payload(product),
        format="json",
    )

    assert response.status_code == 400
    assert not Order.objects.exists()


def test_customer_cannot_order_product_in_inactive_category(
    anon_client,
    category,
    product,
):
    category.is_active = False
    category.save(update_fields=["is_active"])

    response = anon_client.post(
        CUSTOMER_ORDERS_URL,
        checkout_payload(product),
        format="json",
    )

    assert response.status_code == 400
    assert not Order.objects.exists()


def test_customer_cannot_order_out_of_stock_product(anon_client, product):
    product.stock_quantity = 0
    product.save()

    response = anon_client.post(
        CUSTOMER_ORDERS_URL,
        checkout_payload(product),
        format="json",
    )

    assert response.status_code == 400
    assert not Order.objects.exists()


def test_customer_checkout_rejects_mpesa_until_payment_integration(
    anon_client,
    product,
):
    response = anon_client.post(
        CUSTOMER_ORDERS_URL,
        checkout_payload(
            product,
            payment_method=Order.PaymentMethod.MPESA,
        ),
        format="json",
    )

    assert response.status_code == 400
    assert "payment_method" in response.data
    assert not Order.objects.exists()


def test_customer_can_list_only_their_own_orders(
    customer_client,
    customer_user,
    another_customer,
    product,
):
    own_order = Order.objects.create(
        customer=customer_user,
        customer_name="Jane Buyer",
        customer_email="jane@example.com",
        customer_phone="0712345678",
        delivery_address="Juja, Kenya",
        payment_method=Order.PaymentMethod.CASH_ON_DELIVERY,
        subtotal=Decimal("100.00"),
        delivery_fee=Decimal("0.00"),
        total_amount=Decimal("100.00"),
    )

    Order.objects.create(
        customer=another_customer,
        customer_name="Another Buyer",
        customer_email="another@example.com",
        customer_phone="0798765432",
        delivery_address="Nairobi, Kenya",
        payment_method=Order.PaymentMethod.CASH_ON_DELIVERY,
        subtotal=Decimal("200.00"),
        delivery_fee=Decimal("0.00"),
        total_amount=Decimal("200.00"),
    )

    response = customer_client.get(f"{CUSTOMER_ORDERS_URL}mine/")

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["results"][0]["reference"] == own_order.reference


def test_customer_cannot_view_another_customers_order(
    customer_client,
    another_customer,
):
    other_order = Order.objects.create(
        customer=another_customer,
        customer_name="Another Buyer",
        customer_email="another@example.com",
        customer_phone="0798765432",
        delivery_address="Nairobi, Kenya",
        payment_method=Order.PaymentMethod.CASH_ON_DELIVERY,
        subtotal=Decimal("100.00"),
        delivery_fee=Decimal("0.00"),
        total_amount=Decimal("100.00"),
    )

    response = customer_client.get(
        f"{CUSTOMER_ORDERS_URL}{other_order.reference}/"
    )

    assert response.status_code == 404


def test_guest_cannot_access_customer_order_history(anon_client):
    response = anon_client.get(f"{CUSTOMER_ORDERS_URL}mine/")
    assert response.status_code == 401
