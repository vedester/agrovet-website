from decimal import Decimal

import pytest

from apps.catalog.models import Product
from apps.catalog.tests.helpers import make_product
from apps.product_imports.importer import run_import
from apps.product_imports.parsing import parse_upload
from apps.product_imports.tests.helpers import csv_upload

pytestmark = pytest.mark.django_db


def sheet(text):
    return parse_upload(csv_upload(text))


def test_preview_reports_actions_without_writing(vet):
    make_product(vet, "OLD-1", name="Old", price=Decimal("100"))
    make_product(vet, "SAME-1", name="Same", price=Decimal("50"))

    outcome = run_import(
        sheet(
            "sku,name,category,price\n"
            "NEW-1,Fresh Item,Veterinary Drugs,200\n"
            "OLD-1,Old,Veterinary Drugs,120\n"
            "SAME-1,Same,Veterinary Drugs,50\n"
            "BAD-1,,Veterinary Drugs,abc\n"
        )
    )
    assert outcome.applied is False
    assert outcome.counts == {"create": 1, "update": 1, "unchanged": 1, "invalid": 1}
    assert outcome.issues[0]["row"] == 5
    assert Product.objects.count() == 2
    assert Product.objects.get(sku="OLD-1").price == Decimal("100.00")


def test_commit_creates_and_updates_products(vet, feeds):
    existing = make_product(vet, "OLD-1", name="Old", price=Decimal("100"))

    outcome = run_import(
        sheet(
            "sku,name,category,pack_size,price,stock_quantity\n"
            'new-1,Layers Mash,Animal Feeds,70 kg bag,"3,200",0\n'
            "OLD-1,Old,Animal Feeds,,150,5\n"
        ),
        commit=True,
    )
    assert outcome.applied is True
    assert outcome.counts == {"create": 1, "update": 1, "unchanged": 0, "invalid": 0}

    created = Product.objects.get(sku="NEW-1")
    assert created.slug == "layers-mash-70-kg-bag"
    assert created.price == Decimal("3200.00")
    assert created.category == feeds
    assert created.is_in_stock is False  # quantity 0

    existing.refresh_from_db()
    assert existing.price == Decimal("150.00")
    assert existing.category == feeds
    assert existing.stock_quantity == 5
    assert existing.pack_size == "1 kg"  # blank cell leaves the value unchanged


def test_unknown_category_suggests_closest_match(vet, feeds):
    outcome = run_import(
        sheet(
            "sku,name,category,price\n"
            "A-1,Thing,Animal Feed,100\n"
            "A-2,Thing,Spaceships,100\n"
        )
    )
    first, second = outcome.issues
    assert first["errors"][0]["field"] == "category"
    assert 'Did you mean "Animal Feeds"' in first["errors"][0]["message"]
    assert "Create it in the dashboard" in second["errors"][0]["message"]


def test_new_products_need_core_fields_but_updates_do_not(vet):
    make_product(vet, "OLD-1", price=Decimal("100"))

    outcome = run_import(sheet("sku,price\nOLD-1,175\nNEW-1,99\n"), commit=True)

    assert outcome.counts == {"create": 0, "update": 1, "unchanged": 0, "invalid": 1}
    assert outcome.applied is False
    assert {error["field"] for error in outcome.issues[0]["errors"]} == {"name", "category"}
    assert Product.objects.get(sku="OLD-1").price == Decimal("100.00")  # all-or-nothing


def test_duplicate_sku_in_file_is_flagged(vet):
    outcome = run_import(
        sheet(
            "sku,name,category,price\n"
            "A-1,One,Veterinary Drugs,10\n"
            "a-1,Two,Veterinary Drugs,20\n"
        )
    )
    assert outcome.counts["create"] == 1
    assert outcome.counts["invalid"] == 1
    assert outcome.issues[0]["row"] == 3
    assert "Duplicate of row 2" in outcome.issues[0]["errors"][0]["message"]


@pytest.mark.parametrize(
    ("raw", "expected"),
    [("KES 1,200.50", "1200.50"), ("650/=", "650"), ("Ksh 80", "80"), ("1200", "1200")],
)
def test_price_formats_are_understood(vet, raw, expected):
    outcome = run_import(
        sheet(f'sku,name,category,price\nP-1,Item,Veterinary Drugs,"{raw}"\n'), commit=True
    )
    assert outcome.applied is True, outcome.issues
    assert Product.objects.get(sku="P-1").price == Decimal(expected)


@pytest.mark.parametrize("raw", ["abc", "12.345", "-5"])
def test_bad_prices_are_rejected(vet, raw):
    outcome = run_import(sheet(f"sku,name,category,price\nP-1,Item,Veterinary Drugs,{raw}\n"))
    assert outcome.counts["invalid"] == 1
    assert outcome.issues[0]["errors"][0]["field"] == "price"


def test_bad_quantity_and_flags_are_reported_per_column(vet):
    outcome = run_import(
        sheet(
            "sku,name,category,price,stock_quantity,featured\n"
            "A-1,One,Veterinary Drugs,10,-1,yes\n"
            "A-2,Two,Veterinary Drugs,10,2.5,yes\n"
            "A-3,Three,Veterinary Drugs,10,5,maybe\n"
            "A-4,Four,Veterinary Drugs,10,7,yes\n"
        )
    )
    by_row = {
        issue["row"]: {error["field"] for error in issue["errors"]} for issue in outcome.issues
    }
    assert by_row == {2: {"stock_quantity"}, 3: {"stock_quantity"}, 4: {"featured"}}
    assert outcome.counts["create"] == 1


def test_stock_rules(vet):
    make_product(vet, "TRACKED", stock_quantity=4)
    make_product(vet, "MANUAL")  # quantity not tracked

    outcome = run_import(
        sheet(
            "sku,name,category,price,stock_quantity,in_stock\n"
            "N-1,New,Veterinary Drugs,10,0,yes\n"  # 0 means out of stock: conflict
            "N-2,New,Veterinary Drugs,10,,no\n"  # untracked: manual flag is fine
            "N-3,New,Veterinary Drugs,10,3,yes\n"  # consistent
            "TRACKED,,,,,no\n"  # conflicts with the existing quantity of 4
            "MANUAL,,,,,no\n"  # untracked product: manual flag is fine
        ),
        commit=True,
        skip_invalid=True,
    )
    assert outcome.counts == {"create": 2, "update": 1, "unchanged": 0, "invalid": 2}
    assert {issue["row"] for issue in outcome.issues} == {2, 5}

    assert not Product.objects.filter(sku="N-1").exists()
    n2 = Product.objects.get(sku="N-2")
    assert n2.stock_quantity is None
    assert n2.is_in_stock is False
    assert Product.objects.get(sku="N-3").is_in_stock is True
    assert Product.objects.get(sku="MANUAL").is_in_stock is False
    tracked = Product.objects.get(sku="TRACKED")
    assert tracked.stock_quantity == 4  # blank quantity cell left it alone
    assert tracked.is_in_stock is True


def test_invalid_rows_block_the_import_unless_skipped(vet):
    text = "sku,name,category,price\nA-1,One,Veterinary Drugs,10\nA-2,Two,Nowhere,20\n"

    blocked = run_import(sheet(text), commit=True)
    assert blocked.applied is False
    assert Product.objects.count() == 0

    partial = run_import(sheet(text), commit=True, skip_invalid=True)
    assert partial.applied is True
    assert list(Product.objects.values_list("sku", flat=True)) == ["A-1"]


def test_unchanged_rows_are_not_touched(vet):
    product = make_product(vet, "SAME-1", name="Same", price=Decimal("50"))
    before = Product.objects.get(pk=product.pk).updated_at

    outcome = run_import(sheet("sku,name,price\nSAME-1,Same,50\n"), commit=True)

    assert outcome.counts["unchanged"] == 1
    assert Product.objects.get(pk=product.pk).updated_at == before


def test_validation_query_count_is_constant(vet, django_assert_max_num_queries):
    for index in range(50):
        make_product(vet, f"OLD-{index}", name=f"Old {index}", price=Decimal("10"))
    lines = ["sku,name,category,price"]
    lines += [f"OLD-{index},Old {index},Veterinary Drugs,20" for index in range(50)]
    lines += [f"NEW-{index},New {index},Veterinary Drugs,20" for index in range(50)]
    parsed = sheet("\n".join(lines) + "\n")

    with django_assert_max_num_queries(3):
        outcome = run_import(parsed)

    assert outcome.counts["update"] == 50
    assert outcome.counts["create"] == 50
