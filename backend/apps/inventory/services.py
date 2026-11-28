from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.catalog.models import Product
from apps.inventory.models import InventoryMovement, StockReservation
from apps.orders.models import Order


def _reserved_quantity(product_id):
    """Return the quantity currently reserved for a product."""
    result = StockReservation.objects.filter(
        product_id=product_id,
        status=StockReservation.Status.ACTIVE,
    ).aggregate(total=Sum("quantity"))

    return result["total"] or 0


def _record_movement(
    *,
    product,
    movement_type,
    physical_before,
    physical_after,
    reserved_before,
    reserved_after,
    reason,
    actor=None,
    order=None,
    order_item=None,
    reservation=None,
):
    """Write an immutable audit record for a stock operation."""
    return InventoryMovement.objects.create(
        product=product,
        movement_type=movement_type,
        physical_quantity_delta=physical_after - physical_before,
        reserved_quantity_delta=reserved_after - reserved_before,
        physical_quantity_before=physical_before,
        physical_quantity_after=physical_after,
        reserved_quantity_before=reserved_before,
        reserved_quantity_after=reserved_after,
        reason=reason,
        actor=actor,
        order=order,
        order_item=order_item,
        reservation=reservation,
    )


@transaction.atomic
def restock_product(*, product_id, quantity, actor, reason):
    """Increase physical stock and record the restock."""
    if quantity <= 0:
        raise ValidationError("Restock quantity must be greater than zero.")

    reason = (reason or "").strip()
    if not reason:
        raise ValidationError("A reason is required for this stock movement.")

    product = Product.objects.select_for_update().get(pk=product_id)

    if product.stock_quantity is None:
        raise ValidationError(
            "This product uses manual availability and does not have numerical stock tracking."
        )

    physical_before = product.stock_quantity
    reserved = _reserved_quantity(product.id)
    physical_after = physical_before + quantity

    product.stock_quantity = physical_after
    product.save(update_fields=["stock_quantity"])

    movement = _record_movement(
        product=product,
        movement_type=InventoryMovement.MovementType.RESTOCK,
        physical_before=physical_before,
        physical_after=physical_after,
        reserved_before=reserved,
        reserved_after=reserved,
        reason=reason,
        actor=actor,
    )

    return product, movement


@transaction.atomic
def adjust_product_stock(*, product_id, quantity_delta, actor, reason):
    """
    Apply a signed physical-stock adjustment.

    Positive values increase stock; negative values decrease it.
    Stock cannot be adjusted below the quantity already reserved.
    """
    if quantity_delta == 0:
        raise ValidationError("The stock adjustment cannot be zero.")

    reason = (reason or "").strip()
    if not reason:
        raise ValidationError("A reason is required for this stock movement.")

    product = Product.objects.select_for_update().get(pk=product_id)

    if product.stock_quantity is None:
        raise ValidationError(
            "This product uses manual availability and does not have numerical stock tracking."
        )

    physical_before = product.stock_quantity
    reserved = _reserved_quantity(product.id)
    physical_after = physical_before + quantity_delta

    if physical_after < 0:
        raise ValidationError("The adjustment would make physical stock negative.")

    if physical_after < reserved:
        raise ValidationError(
            f"Cannot reduce stock below {reserved} units because those units are reserved for orders."
        )

    product.stock_quantity = physical_after
    product.save(update_fields=["stock_quantity"])

    movement = _record_movement(
        product=product,
        movement_type=InventoryMovement.MovementType.ADJUSTMENT,
        physical_before=physical_before,
        physical_after=physical_after,
        reserved_before=reserved,
        reserved_after=reserved,
        reason=reason,
        actor=actor,
    )

    return product, movement


@transaction.atomic
def reserve_order_stock(*, order_id, actor, manual_stock_verified=False):
    """
    Reserve tracked products when the seller confirms an order.

    Products without numerical stock tracking require explicit seller
    verification before this operation can proceed.
    """
    order = Order.objects.select_for_update().get(pk=order_id)

    if order.status != Order.Status.PENDING_CONFIRMATION:
        raise ValidationError(
            "Only orders awaiting confirmation can have stock reserved."
        )

    items = list(
        order.items.select_related("product").order_by("id")
    )

    if not items:
        raise ValidationError("This order has no items to reserve.")

    manual_items = [
        item.product_name
        for item in items
        if not item.stock_tracked
    ]

    if manual_items and not manual_stock_verified:
        names = ", ".join(manual_items)
        raise ValidationError(
            f"Manual stock verification is required for: {names}."
        )

    tracked_items = [item for item in items if item.stock_tracked]

    for item in tracked_items:
        if item.product_id is None:
            raise ValidationError(
                f"The product for order item '{item.product_name}' no longer exists."
            )

    product_ids = sorted({item.product_id for item in tracked_items})

    # Lock products in a consistent order to reduce deadlock risk.
    products = {
        product.id: product
        for product in Product.objects.select_for_update()
        .filter(id__in=product_ids)
        .order_by("id")
    }

    if len(products) != len(product_ids):
        raise ValidationError("One or more products in this order no longer exist.")

    reservations = {
        reservation.order_item_id: reservation
        for reservation in StockReservation.objects.select_for_update().filter(
            order=order
        )
    }

    reserved_by_product = {
        product_id: _reserved_quantity(product_id)
        for product_id in product_ids
    }

    for item in tracked_items:
        product = products[item.product_id]

        if product.stock_quantity is None:
            raise ValidationError(
                f"Stock tracking is no longer enabled for '{item.product_name}'."
            )

        existing = reservations.get(item.id)

        if existing and existing.status == StockReservation.Status.ACTIVE:
            raise ValidationError(
                f"Stock for '{item.product_name}' is already reserved."
            )

        if existing and existing.status == StockReservation.Status.CONSUMED:
            raise ValidationError(
                f"Stock for '{item.product_name}' has already been consumed."
            )

        physical = product.stock_quantity
        reserved_before = reserved_by_product[product.id]
        available = physical - reserved_before

        if available < item.quantity:
            raise ValidationError(
                f"Insufficient stock for '{item.product_name}'. "
                f"Available: {available}; requested: {item.quantity}."
            )

        reserved_after = reserved_before + item.quantity
        now = timezone.now()

        if existing:
            existing.quantity = item.quantity
            existing.status = StockReservation.Status.ACTIVE
            existing.reserved_at = now
            existing.released_at = None
            existing.consumed_at = None
            existing.save(
                update_fields=[
                    "quantity",
                    "status",
                    "reserved_at",
                    "released_at",
                    "consumed_at",
                    "updated_at",
                ]
            )
            reservation = existing
        else:
            reservation = StockReservation.objects.create(
                order=order,
                order_item=item,
                product=product,
                quantity=item.quantity,
                status=StockReservation.Status.ACTIVE,
                reserved_at=now,
            )

        _record_movement(
            product=product,
            movement_type=InventoryMovement.MovementType.RESERVATION,
            physical_before=physical,
            physical_after=physical,
            reserved_before=reserved_before,
            reserved_after=reserved_after,
            reason=f"Stock reserved for order {order.reference}.",
            actor=actor,
            order=order,
            order_item=item,
            reservation=reservation,
        )

        reserved_by_product[product.id] = reserved_after

    return order


@transaction.atomic
def release_order_stock(*, order_id, actor, reason):
    """Release active reservations without changing physical stock."""
    order = Order.objects.select_for_update().get(pk=order_id)

    reservations = list(
        StockReservation.objects.select_for_update()
        .filter(order=order, status=StockReservation.Status.ACTIVE)
        .select_related("product", "order_item")
        .order_by("product_id", "id")
    )

    product_ids = sorted({reservation.product_id for reservation in reservations})

    products = {
        product.id: product
        for product in Product.objects.select_for_update()
        .filter(id__in=product_ids)
        .order_by("id")
    }

    reserved_by_product = {
        product_id: _reserved_quantity(product_id)
        for product_id in product_ids
    }

    now = timezone.now()

    for reservation in reservations:
        product = products[reservation.product_id]
        physical = product.stock_quantity

        if physical is None:
            raise ValidationError(
                f"Numerical stock tracking is missing for '{product.name}'."
            )

        reserved_before = reserved_by_product[product.id]
        reserved_after = reserved_before - reservation.quantity

        if reserved_after < 0:
            raise ValidationError(
                f"Stock reservation data is inconsistent for '{product.name}'."
            )

        reservation.status = StockReservation.Status.RELEASED
        reservation.released_at = now
        reservation.save(update_fields=["status", "released_at", "updated_at"])

        _record_movement(
            product=product,
            movement_type=InventoryMovement.MovementType.RELEASE,
            physical_before=physical,
            physical_after=physical,
            reserved_before=reserved_before,
            reserved_after=reserved_after,
            reason=reason,
            actor=actor,
            order=order,
            order_item=reservation.order_item,
            reservation=reservation,
        )

        reserved_by_product[product.id] = reserved_after

    return order


@transaction.atomic
def consume_order_stock(*, order_id, actor):
    """
    Deduct physical stock when an order is delivered.

    The reservation is consumed in the same transaction, so available
    stock does not change a second time at delivery.
    """
    order = Order.objects.select_for_update().get(pk=order_id)

    if order.status != Order.Status.OUT_FOR_DELIVERY:
        raise ValidationError(
            "Stock can only be deducted for an order marked out for delivery."
        )

    reservations = list(
        StockReservation.objects.select_for_update()
        .filter(order=order, status=StockReservation.Status.ACTIVE)
        .select_related("product", "order_item")
        .order_by("product_id", "id")
    )

    if not reservations:
        raise ValidationError(
            "This order has no active stock reservations to consume."
        )

    product_ids = sorted({reservation.product_id for reservation in reservations})

    products = {
        product.id: product
        for product in Product.objects.select_for_update()
        .filter(id__in=product_ids)
        .order_by("id")
    }

    reserved_by_product = {
        product_id: _reserved_quantity(product_id)
        for product_id in product_ids
    }

    now = timezone.now()

    for reservation in reservations:
        product = products[reservation.product_id]

        if product.stock_quantity is None:
            raise ValidationError(
                f"Numerical stock tracking is missing for '{product.name}'."
            )

        physical_before = product.stock_quantity
        reserved_before = reserved_by_product[product.id]

        if physical_before < reservation.quantity:
            raise ValidationError(
                f"Physical stock is insufficient to fulfil '{product.name}'."
            )

        physical_after = physical_before - reservation.quantity
        reserved_after = reserved_before - reservation.quantity

        if reserved_after < 0:
            raise ValidationError(
                f"Stock reservation data is inconsistent for '{product.name}'."
            )

        product.stock_quantity = physical_after
        product.save(update_fields=["stock_quantity"])

        reservation.status = StockReservation.Status.CONSUMED
        reservation.consumed_at = now
        reservation.save(update_fields=["status", "consumed_at", "updated_at"])

        _record_movement(
            product=product,
            movement_type=InventoryMovement.MovementType.SALE,
            physical_before=physical_before,
            physical_after=physical_after,
            reserved_before=reserved_before,
            reserved_after=reserved_after,
            reason=f"Stock deducted for delivered order {order.reference}.",
            actor=actor,
            order=order,
            order_item=reservation.order_item,
            reservation=reservation,
        )

        reserved_by_product[product.id] = reserved_after

    return order


@transaction.atomic
def set_product_stock_tracking(*, product_id, stock_tracked):
    """
    Switch a product between numerical stock tracking and manual availability.

    Enabling tracking starts at zero. Disabling tracking is only permitted
    when there is no physical stock and no active reservation.
    """
    product = Product.objects.select_for_update().get(pk=product_id)

    currently_tracked = product.stock_quantity is not None

    # Make repeated requests safe and idempotent.
    if currently_tracked == stock_tracked:
        return product

    if stock_tracked:
        product.stock_quantity = 0
        product.is_in_stock = False
    else:
        if product.stock_quantity != 0:
            raise ValidationError(
                "Stock tracking cannot be disabled while physical stock remains. "
                "Adjust the stock to zero first."
            )

        reserved = _reserved_quantity(product.id)

        if reserved > 0:
            raise ValidationError(
                "Stock tracking cannot be disabled while units are reserved for orders."
            )

        product.stock_quantity = None

    product.save(update_fields=["stock_quantity", "is_in_stock"])

    return product
