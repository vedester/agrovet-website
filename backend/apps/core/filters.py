from rest_framework.filters import OrderingFilter


class StableOrderingFilter(OrderingFilter):
    """OrderingFilter that always adds `id` as the final tie-breaker.

    Without it, rows with equal sort values can repeat or vanish between pages.
    """

    def get_ordering(self, request, queryset, view):
        ordering = super().get_ordering(request, queryset, view)
        if ordering:
            return [*ordering, "id"]
        return ordering
