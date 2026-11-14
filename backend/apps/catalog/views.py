from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.filters import StableOrderingFilter
from apps.core.views import PublicReadOnlyMixin

from .filters import ProductFilter
from .queries import public_category_tree, public_products
from .serializers import (
    CategoryTreeSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
)


class CategoryTreeView(PublicReadOnlyMixin, APIView):
    def get(self, request):
        serializer = CategoryTreeSerializer(
            public_category_tree(), many=True, context={"request": request}
        )
        return Response(serializer.data)


class ProductListView(PublicReadOnlyMixin, ListAPIView):
    serializer_class = ProductListSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, StableOrderingFilter]
    filterset_class = ProductFilter
    search_fields = ["name", "sku", "brand", "pack_size"]
    ordering_fields = ["name", "price", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return public_products().select_related("category").prefetch_related("images")


class ProductDetailView(PublicReadOnlyMixin, RetrieveAPIView):
    serializer_class = ProductDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return public_products().select_related("category__parent").prefetch_related("images")
