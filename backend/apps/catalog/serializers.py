# backend/apps/catalog/serializers.py
from rest_framework import serializers

from .models import Category, Product, ProductImage


class CategoryBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("name", "slug")


class CategoryWithParentSerializer(serializers.ModelSerializer):
    parent = CategoryBriefSerializer(read_only=True)

    class Meta:
        model = Category
        fields = ("name", "slug", "parent")


class CategoryTreeSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description", "image", "product_count", "children")

    def get_children(self, obj):
        children = getattr(obj, "children_list", [])
        return CategoryTreeSerializer(children, many=True, context=self.context).data


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "image", "alt_text")


class ProductListSerializer(serializers.ModelSerializer):
    """Compact card for lists. Never exposes exact stock or internal flags."""

    category = CategoryBriefSerializer(read_only=True)
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "sku",
            "brand",
            "pack_size",
            "price",
            "is_in_stock",
            "requires_advice",
            "is_featured",
            "category",
            "cover_image",
        )

    def get_cover_image(self, obj):
        cover = obj.cover_image
        if cover is None:
            return None
        return ProductImageSerializer(cover, context=self.context).data


class ProductDetailSerializer(ProductListSerializer):
    category = CategoryWithParentSerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = (*ProductListSerializer.Meta.fields, "description", "images")
