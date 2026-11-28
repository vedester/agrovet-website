from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.core.models import TimeStampedModel


class StockReservation(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        RELEASED = "released", "Released"
        CONSUMED = "consumed", "Consumed"

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.PROTECT,
        related_name="stock_reservations",
    )

    order_item = models.OneToOneField(
        "orders.OrderItem",
        on_delete=models.PROTECT,
        related_name="stock_reservation",
    )

    product = models.ForeignKey(
        "catalog.Product",
        on_delete=models.PROTECT,
        related_name="stock_reservations",
    )

    quantity = models.PositiveIntegerField()

    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )

    reserved_at = models.DateTimeField()
    released_at = models.DateTimeField(null=True, blank=True)
    consumed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gt=0),
                name="stock_reservation_quantity_gt_0",
            ),
        ]
        indexes = [
            models.Index(
                fields=["product", "status"],
                name="reservation_product_status_idx",
            ),
        ]

    def __str__(self):
        return f"{self.product} - {self.quantity} ({self.status})"


class InventoryMovement(TimeStampedModel):
    class MovementType(models.TextChoices):
        RESTOCK = "restock", "Restock"
        SALE = "sale", "Sale"
        ADJUSTMENT = "adjustment", "Stock adjustment"
        RESERVATION = "reservation", "Stock reservation"
        RELEASE = "release", "Reservation release"

    product = models.ForeignKey(
        "catalog.Product",
        on_delete=models.PROTECT,
        related_name="inventory_movements",
    )

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_movements",
    )

    order_item = models.ForeignKey(
        "orders.OrderItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_movements",
    )

    reservation = models.ForeignKey(
        StockReservation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movements",
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_movements",
    )

    movement_type = models.CharField(
        max_length=20,
        choices=MovementType.choices,
    )

    # Signed changes: positive means stock increased; negative means decreased.
    physical_quantity_delta = models.IntegerField(default=0)
    reserved_quantity_delta = models.IntegerField(default=0)

    physical_quantity_before = models.PositiveIntegerField()
    physical_quantity_after = models.PositiveIntegerField()

    reserved_quantity_before = models.PositiveIntegerField()
    reserved_quantity_after = models.PositiveIntegerField()

    reason = models.CharField(max_length=255)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(physical_quantity_before__gte=0)
                    & Q(physical_quantity_after__gte=0)
                    & Q(reserved_quantity_before__gte=0)
                    & Q(reserved_quantity_after__gte=0)
                ),
                name="inventory_movement_quantities_gte_0",
            ),
            models.CheckConstraint(
                condition=(
                    ~Q(physical_quantity_delta=0)
                    | ~Q(reserved_quantity_delta=0)
                ),
                name="inventory_movement_nonzero_delta",
            ),
        ]
        indexes = [
            models.Index(
                fields=["product", "created_at"],
                name="movement_product_created_idx",
            ),
            models.Index(
                fields=["order", "created_at"],
                name="movement_order_created_idx",
            ),
        ]

    def __str__(self):
        return f"{self.product} - {self.get_movement_type_display()}"
