from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import generics, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsStaffUser
from apps.orders.models import Order
from apps.orders.serializers import (
    OrderStatusTransitionSerializer,
    StaffOrderDetailSerializer,
    StaffOrderListSerializer,
)
from apps.orders.services import transition_order_status


class StaffOrderListView(generics.ListAPIView):
    permission_classes = [IsStaffUser]
    serializer_class = StaffOrderListSerializer

    def get_queryset(self):
        queryset = (
            Order.objects.select_related(
                "customer",
                "confirmed_by",
            )
            .annotate(item_count=Count("items", distinct=True))
            .order_by("-created_at", "-id")
        )

        order_status = self.request.query_params.get("status")
        payment_status = self.request.query_params.get("payment_status")
        search = self.request.query_params.get("search", "").strip()

        if order_status:
            queryset = queryset.filter(status=order_status)

        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)

        if search:
            queryset = queryset.filter(
                Q(reference__icontains=search)
                | Q(customer_name__icontains=search)
                | Q(customer_email__icontains=search)
                | Q(customer_phone__icontains=search)
            )

        return queryset


class StaffOrderDetailView(generics.RetrieveAPIView):
    permission_classes = [IsStaffUser]
    serializer_class = StaffOrderDetailSerializer
    queryset = (
        Order.objects.select_related(
            "customer",
            "confirmed_by",
        )
        .prefetch_related(
            "items",
            "status_history__actor",
        )
    )


class StaffOrderTransitionView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)

        serializer = OrderStatusTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        try:
            updated_order = transition_order_status(
                order_id=order.id,
                to_status=data["to_status"],
                actor=request.user,
                note=data.get("note", ""),
                manual_stock_verified=data["manual_stock_verified"],
                delivery_fee=data.get("delivery_fee"),
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                {"detail": exc.messages}
            )

        updated_order = (
            Order.objects.select_related(
                "customer",
                "confirmed_by",
            )
            .prefetch_related(
                "items",
                "status_history__actor",
            )
            .get(pk=updated_order.pk)
        )

        return Response(
            {
                "detail": "Order status updated successfully.",
                "order": StaffOrderDetailSerializer(
                    updated_order,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_200_OK,
        )
