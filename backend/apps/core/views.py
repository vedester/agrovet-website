from django.utils.cache import patch_cache_control
from rest_framework.permissions import AllowAny


class PublicReadOnlyMixin:
    """Open, read-only, cacheable endpoint for the public storefront.

    Authentication is skipped on purpose: a stale or invalid token sent by the
    frontend must not turn a public page into a 401.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    http_method_names = ["get", "head", "options"]
    cache_max_age = 60
    cache_stale_while_revalidate = 300

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        if response.status_code == 200 and request.method in ("GET", "HEAD"):
            patch_cache_control(
                response,
                public=True,
                max_age=self.cache_max_age,
                stale_while_revalidate=self.cache_stale_while_revalidate,
            )
        return response
