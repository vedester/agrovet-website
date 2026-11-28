from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from apps.inventory.models import InventoryMovement, StockReservation
from apps.inventory.services import (
    adjust_product_stock,
    consume_order_stock,
    release_order_stock,
    reserve_order_stock,
    restock_product,
)
from apps.orders.models import Order, OrderItem


pytestmark = pytest.mark.django_db


@pytest.fixture
def actor(django_user_model):
    return django_user_model.objects.create_user(
        email="inventory-owner@example.com",
        password="test-password",
        is_staff=True,
    )


def make_order(actor, product, *, quantity=2, stock_tracked=True):
    order = Order.objects.create(
        customer=actor,
        customer_name="Test Customer",
        customer_email="customer@example.com",
        customer_phone="0712345678",
        delivery_address="Juja, Kenya",
        payment_method=Order.PaymentMethod.MPESA,
        subtotal=Decimal("200.00"),
        delivery_fee=Decimal("0.00"),
        total_amount=Decimal("200.00"),
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


def test_restock_increases_physical_stock_and_records_movement(product, actor):
    product.stock_quantity = 5
    product.save(update_fields=["stock_quantity"])

    updated_product, movement = restock_product(
        product_id=product.id,
        quantity=10,
        actor=actor,
        reason="Supplier delivery",
    )

    assert updated_product.stock_quantity == 15
    assert movement.movement_type == InventoryMovement.MovementType.RESTOCK
    assert movement.physical_quantity_delta == 10
    assert movement.reserved_quantity_delta == 0
    assert movement.physical_quantity_before == 5
    assert movement.physical_quantity_after == 15


def test_restock_rejects_untracked_product(product, actor):
    with pytest.raises(ValidationError, match="manual availability"):
        restock_product(
            product_id=product.id,
            quantity=5,
            actor=actor,
            reason="Supplier delivery",
        )

    assert InventoryMovement.objects.count() == 0


def test_adjustment_cannot_reduce_stock_below_active_reservations(
    product, actor
):
    product.stock_quantity = 10
    product.save(update_fields=["stock_quantity"])
    order, item = make_order(actor, product, quantity=4)

    reserve_order_stock(order_id=order.id, actor=actor)

    with pytest.raises(ValidationError, match="reserved for orders"):
        adjust_product_stock(
            product_id=product.id,
            quantity_delta=-7,
            actor=actor,
            reason="Physical count correction",
        )

    product.refresh_from_db()
    assert product.stock_quantity == 10


def test_reserving_order_preserves_physical_stock(product, actor):
    product.stock_quantity = 10
    product.save(update_fields=["stock_quantity"])
    order, item = make_order(actor, product, quantity=3)

    reserve_order_stock(order_id=order.id, actor=actor)

    product.refresh_from_db()
    reservation = StockReservation.objects.get(order_item=item)

    assert product.stock_quantity == 10
    assert reservation.quantity == 3
    assert reservation.status == StockReservation.Status.ACTIVE
    assert InventoryMovement.objects.filter(
        movement_type=InventoryMovement.MovementType.RESERVATION,
        order=order,
    ).count() == 1


def test_reservation_rejects_insufficient_stock(product, actor):
    product.stock_quantity = 2
    product.save(update_fields=["stock_quantity"])
    order, item = make_order(actor, product, quantity=3)

    with pytest.raises(ValidationError, match="Insufficient stock"):
        reserve_order_stock(order_id=order.id, actor=actor)

    assert not StockReservation.objects.filter(order=order).exists()
    assert not InventoryMovement.objects.filter(order=order).exists()


def test_manual_stock_requires_seller_verification(product, actor):
    order, item = make_order(
        actor,
        product,
        quantity=2,
        stock_tracked=False,
    )

    with pytest.raises(ValidationError, match="Manual stock verification"):
        reserve_order_stock(order_id=order.id, actor=actor)

    reserve_order_stock(
        order_id=order.id,
        actor=actor,
        manual_stock_verified=True,
    )

    assert not StockReservation.objects.filter(order=order).exists()


def test_release_returns_reserved_stock_without_deducting_physical(
    product, actor
):
    product.stock_quantity = 10
    product.save(update_fields=["stock_quantity"])
    order, item = make_order(actor, product, quantity=3)

    reserve_order_stock(order_id=order.id, actor=actor)
    release_order_stock(
        order_id=order.id,
        actor=actor,
        reason="Seller cancelled the order",
    )

    product.refresh_from_db()
    reservation = StockReservation.objects.get(order_item=item)

    assert product.stock_quantity == 10
    assert reservation.status == StockReservation.Status.RELEASED
    assert reservation.released_at is not None
    assert InventoryMovement.objects.filter(
        movement_type=InventoryMovement.MovementType.RELEASE,
        order=order,
    ).count() == 1


def test_released_reservation_can_be_reactivated(product, actor):
    product.stock_quantity = 10
    product.save(update_fields=["stock_quantity"])
    order, item = make_order(actor, product, quantity=3)

    reserve_order_stock(order_id=order.id, actor=actor)
    release_order_stock(
        order_id=order.id,
        actor=actor,
        reason="Order confirmation reversed",
    )
    reserve_order_stock(order_id=order.id, actor=actor)

    reservation = StockReservation.objects.get(order_item=item)

    assert reservation.status == StockReservation.Status.ACTIVE
    assert reservation.released_at is None
    assert InventoryMovement.objects.filter(
        order=order,
        movement_type=InventoryMovement.MovementType.RESERVATION,
    ).count() == 2


def test_delivery_deducts_physical_stock_once(product, actor):
    product.stock_quantity = 10
    product.save(update_fields=["stock_quantity"])
    order, item = make_order(actor, product, quantity=3)

    reserve_order_stock(order_id=order.id, actor=actor)

    order.status = Order.Status.OUT_FOR_DELIVERY
    order.save(update_fields=["status"])

    consume_order_stock(order_id=order.id, actor=actor)

    product.refresh_from_db()
    reservation = StockReservation.objects.get(order_item=item)

    assert product.stock_quantity == 7
    assert reservation.status == StockReservation.Status.CONSUMED
    assert reservation.consumed_at is not None

    with pytest.raises(ValidationError, match="no active stock reservations"):
        consume_order_stock(order_id=order.id, actor=actor)

    product.refresh_from_db()
    assert product.stock_quantity == 7
