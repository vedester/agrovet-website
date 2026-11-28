from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.inventory.services import (
    consume_order_stock,
    release_order_stock,
    reserve_order_stock,
)
from apps.orders.models import Order, OrderStatusHistory


ALLOWED_TRANSITIONS = {
    Order.Status.PENDING_CONFIRMATION: {
        Order.Status.CONFIRMED,
        Order.Status.REJECTED,
        Order.Status.CANCELLED,
    },
    Order.Status.CONFIRMED: {
        Order.Status.PROCESSING,
        Order.Status.CANCELLED,
    },
    Order.Status.PROCESSING: {
        Order.Status.OUT_FOR_DELIVERY,
        Order.Status.CANCELLED,
    },
    Order.Status.OUT_FOR_DELIVERY: {
        Order.Status.DELIVERED,
    },
    Order.Status.DELIVERED: {
        Order.Status.COMPLETED,
    },
    Order.Status.COMPLETED: set(),
    Order.Status.CANCELLED: set(),
    Order.Status.REJECTED: set(),
}


@transaction.atomic
def transition_order_status(
    *,
    order_id,
    to_status,
    actor,
    note="",
    manual_stock_verified=False,
    delivery_fee=None,
):
    """
    Perform a valid order status transition.

    Stock reservations, stock consumption, order updates, and status
    history are committed or rolled back together.
    """
    order = (
        Order.objects.select_for_update()
        .get(pk=order_id)
    )

    note = (note or "").strip()

    valid_statuses = Order.Status.values

    if to_status not in valid_statuses:
        raise ValidationError("The requested order status is invalid.")

    current_status = order.status

    allowed = ALLOWED_TRANSITIONS.get(current_status, set())

    if to_status not in allowed:
        raise ValidationError(
            f"An order cannot move from "
            f"'{order.get_status_display()}' to "
            f"'{dict(Order.Status.choices).get(to_status, to_status)}'."
        )

    if to_status in {
        Order.Status.REJECTED,
        Order.Status.CANCELLED,
    } and not note:
        raise ValidationError(
            "A reason is required when rejecting or cancelling an order."
        )

    now = timezone.now()

    # Confirmation requires the seller to calculate and provide
    # the delivery fee before the order can be approved.
    if to_status == Order.Status.CONFIRMED and delivery_fee is None:
        raise ValidationError(
            "Enter the delivery fee before confirming this order."
        )

    # Confirming an order reserves tracked stock.
    # Manual-stock products require explicit seller verification.
    if to_status == Order.Status.CONFIRMED:
        reserve_order_stock(
            order_id=order.id,
            actor=actor,
            manual_stock_verified=manual_stock_verified,
        )

        order.confirmed_by = actor
        order.confirmed_at = now
        order.delivery_fee = delivery_fee
        order.delivery_fee_confirmed = True
        order.total_amount = order.subtotal + delivery_fee

    # Rejection and cancellation release any active reservations.
    if to_status in {
        Order.Status.REJECTED,
        Order.Status.CANCELLED,
    }:
        release_order_stock(
            order_id=order.id,
            actor=actor,
            reason=(
                f"Stock released because order {order.reference} "
                f"was {to_status}."
            ),
        )

    # Physical stock is deducted only when the order is delivered.
    # Manual-stock items have no numerical reservations to consume.
    if to_status == Order.Status.DELIVERED:
        has_tracked_items = order.items.filter(
            stock_tracked=True
        ).exists()

        if has_tracked_items:
            consume_order_stock(
                order_id=order.id,
                actor=actor,
            )

        order.delivered_at = now

    if to_status == Order.Status.COMPLETED:
        order.completed_at = now

    if to_status in {
        Order.Status.REJECTED,
        Order.Status.CANCELLED,
    }:
        order.cancellation_reason = note

    order.status = to_status

    update_fields = [
        "status",
        "updated_at",
    ]

    if to_status == Order.Status.CONFIRMED:
        update_fields.extend([
            "confirmed_by",
            "confirmed_at",
            "delivery_fee",
            "delivery_fee_confirmed",
            "total_amount",
        ])

    if to_status == Order.Status.DELIVERED:
        update_fields.append("delivered_at")

    if to_status == Order.Status.COMPLETED:
        update_fields.append("completed_at")

    if to_status in {
        Order.Status.REJECTED,
        Order.Status.CANCELLED,
    }:
        update_fields.append("cancellation_reason")

    order.save(update_fields=update_fields)

    OrderStatusHistory.objects.create(
        order=order,
        from_status=current_status,
        to_status=to_status,
        actor=actor,
        note=note,
    )

    return order
