from django.db.models import Count
from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsCustomerUser
from apps.orders.customer_serializers import (
    CustomerOrderCreateSerializer,
    CustomerOrderDetailSerializer,
    CustomerOrderListSerializer,
)
from apps.orders.models import Order


class CustomerOrderCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomerOrderCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        order = (
            Order.objects.prefetch_related("items")
            .get(pk=order.pk)
        )

        return Response(
            {
                "detail": (
                    "Your order has been submitted. "
                    "The seller will confirm product availability "
                    "and your delivery fee."
                ),
                "order": CustomerOrderDetailSerializer(order).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CustomerOrderListView(generics.ListAPIView):
    permission_classes = [IsCustomerUser]
    serializer_class = CustomerOrderListSerializer

    def get_queryset(self):
        return (
            Order.objects.filter(customer=self.request.user)
            .annotate(item_count=Count("items", distinct=True))
            .order_by("-created_at", "-id")
        )


class CustomerOrderDetailView(generics.RetrieveAPIView):
    permission_classes = [IsCustomerUser]
    serializer_class = CustomerOrderDetailSerializer
    lookup_field = "reference"
    lookup_url_kwarg = "reference"

    def get_queryset(self):
        return (
            Order.objects.filter(customer=self.request.user)
            .prefetch_related("items")
        )
