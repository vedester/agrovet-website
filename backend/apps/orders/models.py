import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.core.models import TimeStampedModel


def generate_order_reference():
    return f"AGV-{uuid.uuid4().hex[:12].upper()}"


class Order(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING_CONFIRMATION = "pending_confirmation", "Pending confirmation"
        CONFIRMED = "confirmed", "Confirmed"
        PROCESSING = "processing", "Processing"
        OUT_FOR_DELIVERY = "out_for_delivery", "Out for delivery"
        DELIVERED = "delivered", "Delivered"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        REJECTED = "rejected", "Rejected"

    class PaymentMethod(models.TextChoices):
        MPESA = "mpesa", "M-Pesa"
        CASH_ON_DELIVERY = "cash_on_delivery", "Cash on delivery"

    class PaymentStatus(models.TextChoices):
        UNPAID = "unpaid", "Unpaid"
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    reference = models.CharField(
        max_length=20,
        unique=True,
        default=generate_order_reference,
        editable=False,
    )

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_orders",
    )

    # Customer details are snapshots so historical orders remain readable.
    customer_name = models.CharField(max_length=200)
    customer_email = models.EmailField(blank=True)
    customer_phone = models.CharField(max_length=30)

    delivery_address = models.TextField()
    delivery_instructions = models.TextField(blank=True)

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING_CONFIRMATION,
        db_index=True,
    )

    payment_method = models.CharField(
        max_length=30,
        choices=PaymentMethod.choices,
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID,
        db_index=True,
    )

    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    delivery_fee = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    delivery_fee_confirmed = models.BooleanField(
        default=False,
        help_text="Whether the seller has confirmed the delivery fee.",
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)

    seller_notes = models.TextField(blank=True)
    cancellation_reason = models.TextField(blank=True)

    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="confirmed_orders",
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)

    delivered_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(
                fields=["status", "created_at"],
                name="order_status_created_idx",
            ),
            models.Index(
                fields=["customer", "created_at"],
                name="order_customer_created_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(subtotal__gte=0),
                name="order_subtotal_gte_0",
            ),
            models.CheckConstraint(
                condition=Q(delivery_fee__gte=0),
                name="order_delivery_fee_gte_0",
            ),
            models.CheckConstraint(
                condition=Q(total_amount__gte=0),
                name="order_total_gte_0",
            ),
        ]

    def __str__(self):
        return self.reference


class OrderItem(TimeStampedModel):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )

    # Preserve the order if a catalog product is later removed.
    product = models.ForeignKey(
        "catalog.Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
    )

    # Product details are snapshots from checkout time.
    product_name = models.CharField(max_length=200)
    sku = models.CharField(max_length=40)
    pack_size = models.CharField(max_length=50, blank=True)

    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    stock_tracked = models.BooleanField(
        default=True,
        help_text="Whether this product used numerical stock tracking at checkout.",
    )

    class Meta:
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gt=0),
                name="order_item_quantity_gt_0",
            ),
            models.CheckConstraint(
                condition=Q(unit_price__gte=0),
                name="order_item_price_gte_0",
            ),
        ]

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"

    @property
    def line_total(self):
        return self.unit_price * self.quantity


class OrderStatusHistory(TimeStampedModel):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="status_history",
    )

    from_status = models.CharField(max_length=30)
    to_status = models.CharField(max_length=30)

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_status_changes",
    )

    note = models.TextField(blank=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(
                fields=["order", "created_at"],
                name="order_history_created_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.order.reference}: "
            f"{self.from_status} -> {self.to_status}"
        )   

