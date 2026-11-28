from rest_framework import serializers

from apps.inventory.models import InventoryMovement
from apps.catalog.models import Product


class InventoryProductSerializer(serializers.ModelSerializer):
    reserved_quantity = serializers.IntegerField(read_only=True)
    available_quantity = serializers.SerializerMethodField()
    stock_tracked = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "sku",
            "brand",
            "pack_size",
            "stock_quantity",
            "is_in_stock",
            "stock_tracked",
            "reserved_quantity",
            "available_quantity",
        )

    def get_available_quantity(self, obj):
        if obj.stock_quantity is None:
            return None

        return max(obj.stock_quantity - obj.reserved_quantity, 0)

    def get_stock_tracked(self, obj):
        return obj.stock_quantity is not None


class RestockSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=255, trim_whitespace=True)


class StockAdjustmentSerializer(serializers.Serializer):
    quantity_delta = serializers.IntegerField()
    reason = serializers.CharField(max_length=255, trim_whitespace=True)

    def validate_quantity_delta(self, value):
        if value == 0:
            raise serializers.ValidationError(
                "The stock adjustment cannot be zero."
            )
        return value


class InventoryMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    actor_email = serializers.EmailField(
        source="actor.email",
        read_only=True,
        allow_null=True,
    )
    order_reference = serializers.CharField(
        source="order.reference",
        read_only=True,
        allow_null=True,
    )
    movement_type_label = serializers.CharField(
        source="get_movement_type_display",
        read_only=True,
    )

    class Meta:
        model = InventoryMovement
        fields = (
            "id",
            "product",
            "product_name",
            "product_sku",
            "movement_type",
            "movement_type_label",
            "physical_quantity_delta",
            "reserved_quantity_delta",
            "physical_quantity_before",
            "physical_quantity_after",
            "reserved_quantity_before",
            "reserved_quantity_after",
            "reason",
            "actor_email",
            "order",
            "order_reference",
            "created_at",
        )
        read_only_fields = fields


class StockTrackingSerializer(serializers.Serializer):
    stock_tracked = serializers.BooleanField()

    
