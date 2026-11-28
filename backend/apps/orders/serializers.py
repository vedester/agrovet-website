from rest_framework import serializers

from apps.orders.models import Order, OrderItem, OrderStatusHistory


class StaffOrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product",
            "product_name",
            "sku",
            "pack_size",
            "quantity",
            "unit_price",
            "line_total",
            "stock_tracked",
        )
        read_only_fields = fields


class StaffOrderStatusHistorySerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(
        source="actor.email",
        read_only=True,
        allow_null=True,
    )
    from_status_label = serializers.SerializerMethodField()
    to_status_label = serializers.SerializerMethodField()

    def get_from_status_label(self, obj):
        if not obj.from_status:
            return "Order placed"

        return dict(Order.Status.choices).get(
            obj.from_status,
            obj.from_status,
        )

    def get_to_status_label(self, obj):
        return dict(Order.Status.choices).get(
            obj.to_status,
            obj.to_status,
        )

    class Meta:
        model = OrderStatusHistory
        fields = (
            "id",
            "from_status",
            "from_status_label",
            "to_status",
            "to_status_label",
            "actor_email",
            "note",
            "created_at",
        )
        read_only_fields = fields


class StaffOrderListSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    payment_method_label = serializers.CharField(
        source="get_payment_method_display",
        read_only=True,
    )
    payment_status_label = serializers.CharField(
        source="get_payment_status_display",
        read_only=True,
    )
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "reference",
            "customer_name",
            "customer_email",
            "customer_phone",
            "status",
            "status_label",
            "payment_method",
            "payment_method_label",
            "payment_status",
            "payment_status_label",
            "subtotal",
            "delivery_fee",
            "delivery_fee_confirmed",
            "total_amount",
            "item_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class StaffOrderDetailSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    payment_method_label = serializers.CharField(
        source="get_payment_method_display",
        read_only=True,
    )
    payment_status_label = serializers.CharField(
        source="get_payment_status_display",
        read_only=True,
    )
    confirmed_by_email = serializers.EmailField(
        source="confirmed_by.email",
        read_only=True,
        allow_null=True,
    )
    items = StaffOrderItemSerializer(many=True, read_only=True)
    status_history = StaffOrderStatusHistorySerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Order
        fields = (
            "id",
            "reference",
            "customer",
            "customer_name",
            "customer_email",
            "customer_phone",
            "delivery_address",
            "delivery_instructions",
            "status",
            "status_label",
            "payment_method",
            "payment_method_label",
            "payment_status",
            "payment_status_label",
            "subtotal",
            "delivery_fee",
            "delivery_fee_confirmed",
            "total_amount",
            "seller_notes",
            "cancellation_reason",
            "confirmed_by",
            "confirmed_by_email",
            "confirmed_at",
            "delivered_at",
            "completed_at",
            "items",
            "status_history",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class OrderStatusTransitionSerializer(serializers.Serializer):
    to_status = serializers.ChoiceField(
        choices=Order.Status.choices,
    )
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=2000,
        trim_whitespace=True,
    )
    manual_stock_verified = serializers.BooleanField(
        required=False,
        default=False,
    )
    delivery_fee = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=0,
        required=False,
    )

    def validate(self, attrs):
        if attrs["to_status"] == Order.Status.CONFIRMED:
            if "delivery_fee" not in attrs:
                raise serializers.ValidationError({
                    "delivery_fee": (
                        "Enter the delivery fee before confirming this order."
                    )
                })
        elif "delivery_fee" in attrs:
            raise serializers.ValidationError({
                "delivery_fee": (
                    "The delivery fee can only be set when confirming an order."
                )
            })

        if (
            attrs.get("manual_stock_verified", False)
            and attrs["to_status"] != Order.Status.CONFIRMED
        ):
            raise serializers.ValidationError({
                "manual_stock_verified": (
                    "Manual stock verification is only applicable "
                    "when confirming an order."
                )
            })

        return attrs
