from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.catalog.models import Category, Product

CATEGORIES = [
    ("Veterinary Drugs", None),
    ("Animal Feeds", None),
    ("Dairy Meal", "Animal Feeds"),
    ("Seeds", None),
    ("Fertilizers", None),
    ("Agrochemicals", None),
    ("Farm Tools", None),
]

# sku, name, category, pack_size, price (KES), requires_advice, stock_quantity
PRODUCTS = [
    ("VET-IVM-50", "Ivermectin 1% Injection", "Veterinary Drugs", "50 ml", "650.00", True, 12),
    ("VET-OTC-100", "Oxytetracycline 20% LA", "Veterinary Drugs", "100 ml", "980.00", True, 0),
    ("FEED-DM-70", "Dairy Meal", "Dairy Meal", "70 kg bag", "3400.00", False, None),
    ("FEED-LM-70", "Layers Mash", "Animal Feeds", "70 kg bag", "3200.00", False, 25),
    ("SEED-MZ-2", "Hybrid Maize Seed", "Seeds", "2 kg", "560.00", False, 40),
    ("FERT-CAN-50", "CAN Fertilizer", "Fertilizers", "50 kg bag", "3300.00", False, 18),
    ("FERT-DAP-50", "DAP Fertilizer", "Fertilizers", "50 kg bag", "4500.00", False, 0),
    ("AGR-GLY-1", "Glyphosate 480 SL Herbicide", "Agrochemicals", "1 litre", "850.00", True, 30),
    ("TOOL-KS-16", "Knapsack Sprayer", "Farm Tools", "16 litre", "3800.00", False, 6),
    ("TOOL-PRN-8", "Pruning Shears", "Farm Tools", "8 inch", "750.00", False, None),
]


class Command(BaseCommand):
    help = "Create demo categories and products (development only)."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("seed_demo is for development only (DEBUG is off).")

        with transaction.atomic():
            categories = {}
            for name, parent_name in CATEGORIES:
                category, _ = Category.objects.get_or_create(
                    name=name, defaults={"parent": categories.get(parent_name)}
                )
                categories[name] = category

            for sku, name, cat_name, pack, price, advice, qty in PRODUCTS:
                Product.objects.update_or_create(
                    sku=sku,
                    defaults={
                        "name": name,
                        "category": categories[cat_name],
                        "pack_size": pack,
                        "price": Decimal(price),
                        "requires_advice": advice,
                        "stock_quantity": qty,
                    },
                )

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {Category.objects.count()} categories, "
            f"{Product.objects.count()} products."
        ))
