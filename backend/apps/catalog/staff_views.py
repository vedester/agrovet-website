from django.db.models import Count
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import SearchFilter
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.filters import StableOrderingFilter
from apps.core.permissions import IsStaffUser

from .filters import StaffProductFilter
from .models import Category, Product, ProductImage
from .services import reorder_product_images
from .staff_serializers import (
    ReorderImagesSerializer,
    StaffCategorySerializer,
    StaffProductImageSerializer,
    StaffProductSerializer,
)


class StaffCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffUser]
    serializer_class = StaffCategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.select_related("parent").annotate(
            product_count=Count("products", distinct=True),
            children_count=Count("children", distinct=True),
        )


class StaffProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffUser]
    serializer_class = StaffProductSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, StableOrderingFilter]
    filterset_class = StaffProductFilter
    search_fields = ["name", "sku", "brand", "pack_size"]
    ordering_fields = ["name", "price", "created_at", "updated_at"]
    ordering = ["name"]

    def get_queryset(self):
        return Product.objects.select_related("category").prefetch_related("images")


class ProductImageListCreateView(ListCreateAPIView):
    permission_classes = [IsStaffUser]
    serializer_class = StaffProductImageSerializer
    parser_classes = [MultiPartParser]
    pagination_class = None

    def get_product(self):
        return get_object_or_404(Product, pk=self.kwargs["product_id"])

    def get_queryset(self):
        return ProductImage.objects.filter(product_id=self.kwargs["product_id"])

    def list(self, request, *args, **kwargs):
        self.get_product()  # 404 for an unknown product
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(product=self.get_product())


class ProductImageDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsStaffUser]
    serializer_class = StaffProductImageSerializer
    parser_classes = [MultiPartParser, JSONParser]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        # Scoped to the product in the URL, so an image id from another product is a 404.
        return ProductImage.objects.filter(product_id=self.kwargs["product_id"])


class ProductImageReorderView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        serializer = ReorderImagesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        images = reorder_product_images(product, serializer.validated_data["order"])
        return Response(
            StaffProductImageSerializer(images, many=True, context={"request": request}).data
        )
