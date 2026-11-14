from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from apps.core.images import process_image
from apps.core.serializers import DeleteReplacedFileMixin, ModelCleanSerializerMixin

from .models import SKU_VALIDATOR, Category, Product, ProductImage
from .services import add_product_image


class StaffCategorySerializer(
    ModelCleanSerializerMixin, DeleteReplacedFileMixin, serializers.ModelSerializer
):
    product_count = serializers.IntegerField(read_only=True)
    children_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "slug",
            "parent",
            "description",
            "image",
            "sort_order",
            "is_active",
            "product_count",
            "children_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("slug", "created_at", "updated_at")

    def validate_image(self, value):
        return process_image(value) if value else value


class StaffProductImageSerializer(DeleteReplacedFileMixin, serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "image", "alt_text", "position", "created_at")
        read_only_fields = ("id", "created_at")
        extra_kwargs = {"position": {"required": False}}

    def validate_image(self, value):
        return process_image(value)

    def create(self, validated_data):
        return add_product_image(
            product=validated_data["product"],
            image=validated_data["image"],
            alt_text=validated_data.get("alt_text", ""),
            position=validated_data.get("position"),
        )


class ReorderImagesSerializer(serializers.Serializer):
    order = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)


class StaffProductSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(max_length=40, validators=[SKU_VALIDATOR])
    category_name = serializers.CharField(source="category.name", read_only=True)
    images = StaffProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "sku",
            "brand",
            "pack_size",
            "description",
            "price",
            "stock_quantity",
            "is_in_stock",
            "requires_advice",
            "is_featured",
            "is_active",
            "category",
            "category_name",
            "images",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("slug", "created_at", "updated_at")

    def validate_sku(self, value):
        value = value.strip().upper()
        clashes = Product.objects.filter(sku=value)
        if self.instance:
            clashes = clashes.exclude(pk=self.instance.pk)
        if clashes.exists():
            raise ValidationError("A product with this SKU already exists.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        current = self.instance.stock_quantity if self.instance else None
        quantity = attrs.get("stock_quantity", current)
        wanted = attrs.get("is_in_stock")
        if quantity is not None and wanted is not None and wanted != (quantity > 0):
            raise ValidationError(
                {
                    "is_in_stock": (
                        "Availability is derived from stock_quantity. Change the quantity, "
                        "or set stock_quantity to null to control availability manually."
                    )
                }
            )
        return attrs
