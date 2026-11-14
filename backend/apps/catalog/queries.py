"""Read-side queries for the public storefront.

The visibility rule lives here and nowhere else: a product is public only when
the product, its category, and its parent category (if any) are all active.
"""
from django.db.models import Count, Q

from .models import Category, Product


def public_categories():
    return Category.objects.filter(is_active=True).filter(
        Q(parent__isnull=True) | Q(parent__is_active=True)
    )


def public_products():
    return Product.objects.filter(is_active=True, category__is_active=True).filter(
        Q(category__parent__isnull=True) | Q(category__parent__is_active=True)
    )


def public_category_tree():
    """Top-level categories with `children_list` and `product_count` attached.

    Two queries in total, regardless of how many categories exist. A parent's
    count includes the products of its sub-categories.
    """
    categories = list(public_categories())
    counts = dict(
        public_products().order_by().values_list("category_id").annotate(n=Count("id"))
    )

    by_id = {category.id: category for category in categories}
    for category in categories:
        category.children_list = []
        category.product_count = counts.get(category.id, 0)

    roots = []
    for category in categories:
        if category.parent_id is None:
            roots.append(category)
        elif category.parent_id in by_id:
            by_id[category.parent_id].children_list.append(category)

    for root in roots:
        root.product_count += sum(child.product_count for child in root.children_list)
    return roots
