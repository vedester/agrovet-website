from django.db.models import Q
from django_filters import rest_framework as filters

from .models import Product


class ProductFilter(filters.FilterSet):
    category = filters.CharFilter(method="filter_category")
    in_stock = filters.BooleanFilter(field_name="is_in_stock")
    featured = filters.BooleanFilter(field_name="is_featured")
    min_price = filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="price", lookup_expr="lte")

    class Meta:
        model = Product
        fields = []

    def filter_category(self, queryset, name, value):
        """A parent category slug also matches its sub-categories."""
        return queryset.filter(Q(category__slug=value) | Q(category__parent__slug=value))
