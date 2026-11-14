from django.contrib import admin

from .models import Category, Product, ProductImage


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "parent", "sort_order", "is_active")
    list_filter = ("is_active", "parent")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name", "sku", "category", "pack_size", "price", "is_in_stock", "is_active",
    )
    list_filter = ("is_active", "is_in_stock", "is_featured", "category")
    search_fields = ("name", "sku", "brand")
    list_select_related = ("category",)
    prepopulated_fields = {"slug": ("name", "pack_size")}
    inlines = [ProductImageInline]
