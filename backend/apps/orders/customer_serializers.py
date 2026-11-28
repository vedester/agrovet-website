from django.db import transaction
from rest_framework import serializers

from apps.catalog.queries import public_products
from apps.orders.models import Order, OrderItem, OrderStatusHistory


class CustomerOrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=10000)


class CustomerOrderCreateSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=200, trim_whitespace=True)
    customer_email = serializers.EmailField(
        required=False,
        allow_blank=True,
    )
    customer_phone = serializers.CharField(max_length=30, trim_whitespace=True)
    delivery_address = serializers.CharField(
        trim_whitespace=True,
        max_length=2000,
    )
    delivery_instructions = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=2000,
    )
    payment_method = serializers.ChoiceField(
        choices=Order.PaymentMethod.choices,
    )
    items = CustomerOrderItemInputSerializer(many=True, allow_empty=False)

    def validate_customer_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Customer name is required.")
        return value.strip()

    def validate_customer_phone(self, value):
        if not value.strip():
            raise serializers.ValidationError("Customer phone number is required.")
        return value.strip()

    def validate_delivery_address(self, value):
        if not value.strip():
            raise serializers.ValidationError("Delivery address is required.")
        return value.strip()

    def validate_payment_method(self, value):
        if value != Order.PaymentMethod.CASH_ON_DELIVERY:
            raise serializers.ValidationError(
                "M-Pesa payments are not available yet. "
                "Please select Cash on Delivery."
            )
        return value

    def validate_items(self, items):
        product_ids = [item["product_id"] for item in items]

        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError(
                "A product may only appear once. "
                "Update its quantity instead of adding duplicate lines."
            )

        return items

    def validate(self, attrs):
        request = self.context.get("request")

        if (
            request
            and request.user.is_authenticated
            and (
                request.user.is_staff
                or request.user.is_superuser
                or not request.user.is_active
            )
        ):
            raise serializers.ValidationError(
                "Staff accounts cannot place customer orders."
            )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        user = request.user

        items_data = validated_data.pop("items")
        product_ids = [item["product_id"] for item in items_data]

        # Lock and retrieve only products currently visible in the storefront.
        products = list(
            public_products()
            .select_for_update()
            .select_related("category", "category__parent")
            .filter(id__in=product_ids)
        )
        products_by_id = {product.id: product for product in products}

        unavailable_ids = [
            product_id
            for product_id in product_ids
            if product_id not in products_by_id
        ]

        if unavailable_ids:
            raise serializers.ValidationError({
                "items": (
                    "One or more selected products are unavailable. "
                    "Refresh the catalogue and try again."
                )
            })

        out_of_stock = [
            products_by_id[item["product_id"]].name
            for item in items_data
            if not products_by_id[item["product_id"]].is_in_stock
        ]

        if out_of_stock:
            raise serializers.ValidationError({
                "items": (
                    "The following products are currently unavailable: "
                    + ", ".join(out_of_stock)
                )
            })

        subtotal = sum(
            (
                products_by_id[item["product_id"]].price * item["quantity"]
                for item in items_data
            ),
            start=0,
        )

        order = Order.objects.create(
            customer=user if user.is_authenticated else None,
            customer_name=validated_data["customer_name"],
            customer_email=validated_data.get("customer_email", ""),
            customer_phone=validated_data["customer_phone"],
            delivery_address=validated_data["delivery_address"],
            delivery_instructions=validated_data.get(
                "delivery_instructions",
                "",
            ),
            payment_method=validated_data["payment_method"],
            payment_status=Order.PaymentStatus.UNPAID,
            status=Order.Status.PENDING_CONFIRMATION,
            subtotal=subtotal,
            delivery_fee=0,
            delivery_fee_confirmed=False,
            total_amount=subtotal,
        )

        OrderItem.objects.bulk_create([
            OrderItem(
                order=order,
                product=products_by_id[item["product_id"]],
                product_name=products_by_id[item["product_id"]].name,
                sku=products_by_id[item["product_id"]].sku,
                pack_size=products_by_id[item["product_id"]].pack_size,
                quantity=item["quantity"],
                unit_price=products_by_id[item["product_id"]].price,
                stock_tracked=(
                    products_by_id[item["product_id"]].stock_quantity is not None
                ),
            )
            for item in items_data
        ])

        OrderStatusHistory.objects.create(
            order=order,
            from_status="",
            to_status=Order.Status.PENDING_CONFIRMATION,
            actor=user if user.is_authenticated else None,
            note="Order placed by customer.",
        )

        return order


class CustomerOrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product_name",
            "sku",
            "pack_size",
            "quantity",
            "unit_price",
            "line_total",
        )
        read_only_fields = fields


class CustomerOrderListSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    payment_method_label = serializers.CharField(
        source="get_payment_method_display",
        read_only=True,
    )
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = (
            "reference",
            "status",
            "status_label",
            "payment_method",
            "payment_method_label",
            "payment_status",
            "subtotal",
            "delivery_fee",
            "delivery_fee_confirmed",
            "total_amount",
            "item_count",
            "created_at",
        )
        read_only_fields = fields


class CustomerOrderDetailSerializer(serializers.ModelSerializer):
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
    items = CustomerOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "reference",
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
            "items",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
