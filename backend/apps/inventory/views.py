from django.db.models import Q, Sum, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404

from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import generics, status,serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Product
from apps.core.permissions import IsStaffUser

from apps.inventory.models import InventoryMovement, StockReservation
from apps.inventory.serializers import (
    InventoryMovementSerializer,
    InventoryProductSerializer,
    RestockSerializer,
    StockAdjustmentSerializer,
    StockTrackingSerializer,
)
from apps.inventory.services import (
    adjust_product_stock,
    restock_product,
    set_product_stock_tracking,
)

def get_inventory_product(product_id):
    return (
        Product.objects.annotate(
            reserved_quantity=Coalesce(
                Sum(
                    "stock_reservations__quantity",
                    filter=Q(
                        stock_reservations__status=StockReservation.Status.ACTIVE
                    ),
                ),
                Value(0),
            )
        )
        .get(pk=product_id)
    )


class StaffInventoryListView(generics.ListAPIView):
    permission_classes = [IsStaffUser]
    serializer_class = InventoryProductSerializer

    def get_queryset(self):
        queryset = Product.objects.select_related("category").annotate(
            reserved_quantity=Coalesce(
                Sum(
                    "stock_reservations__quantity",
                    filter=Q(
                        stock_reservations__status=StockReservation.Status.ACTIVE
                    ),
                ),
                Value(0),
            )
        ).order_by("name")

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(sku__icontains=search)
                | Q(brand__icontains=search)
            )

        stock_status = self.request.query_params.get("stock_status")

        if stock_status == "tracked":
            queryset = queryset.filter(stock_quantity__isnull=False)
        elif stock_status == "manual":
            queryset = queryset.filter(stock_quantity__isnull=True)
        elif stock_status == "out_of_stock":
            queryset = queryset.filter(stock_quantity=0)
        elif stock_status == "low_stock":
            queryset = queryset.filter(
                stock_quantity__gt=0,
                stock_quantity__lte=5,
            )

        return queryset


class StaffProductRestockView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)

        serializer = RestockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_product, movement = restock_product(
            product_id=product.id,
            quantity=serializer.validated_data["quantity"],
            actor=request.user,
            reason=serializer.validated_data["reason"],
        )

        return Response(
            {
                "detail": "Stock restocked successfully.",
                "product_id": updated_product.id,
                "movement_id": movement.id,
            },
            status=status.HTTP_200_OK,
        )


class StaffProductStockAdjustmentView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)

        serializer = StockAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_product, movement = adjust_product_stock(
            product_id=product.id,
            quantity_delta=serializer.validated_data["quantity_delta"],
            actor=request.user,
            reason=serializer.validated_data["reason"],
        )

        return Response(
            {
                "detail": "Stock adjusted successfully.",
                "product_id": updated_product.id,
                "movement_id": movement.id,
            },
            status=status.HTTP_200_OK,
        )


class StaffInventoryMovementListView(generics.ListAPIView):
    permission_classes = [IsStaffUser]
    serializer_class = InventoryMovementSerializer

    def get_queryset(self):
        queryset = InventoryMovement.objects.select_related(
            "product",
            "actor",
            "order",
        )

        product_id = self.request.query_params.get("product")
        movement_type = self.request.query_params.get("movement_type")

        if product_id:
            queryset = queryset.filter(product_id=product_id)

        if movement_type:
            queryset = queryset.filter(movement_type=movement_type)

        return queryset


class StaffProductStockTrackingView(APIView):
    permission_classes = [IsStaffUser]

    def patch(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)

        serializer = StockTrackingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated_product = set_product_stock_tracking(
                product_id=product.id,
                stock_tracked=serializer.validated_data["stock_tracked"],
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"detail": exc.messages})

        return Response(
            {
                "detail": "Stock tracking settings updated successfully.",
                "product": InventoryProductSerializer(
                        get_inventory_product(updated_product.id)
                    ).data,
            },
            status=status.HTTP_200_OK,
        )