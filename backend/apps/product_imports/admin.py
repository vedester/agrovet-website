from django.contrib import admin

from .models import ProductImport


@admin.register(ProductImport)
class ProductImportAdmin(admin.ModelAdmin):
    list_display = (
        "filename",
        "created_by",
        "created_count",
        "updated_count",
        "skipped_count",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
