"""Validate and apply a parsed product sheet.

Rules:
- Products are matched by SKU: a known SKU is updated, an unknown one is created.
- A new product needs name, category and price. An existing product needs only
  the columns being changed.
- A blank cell, or a column missing from the file, leaves the current value alone.
- Availability follows stock_quantity when one is set (same rule as the staff API).
"""
import re
from dataclasses import dataclass, field
from decimal import Decimal
from difflib import get_close_matches

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction

from apps.catalog.models import SKU_VALIDATOR, Category, Product

from .parsing import ParsedRow, ParsedSheet

MAX_REPORTED_ISSUES = 200

_TEXT_COLUMNS = ("name", "pack_size", "brand", "description")
_FLAG_FIELDS = {
    "in_stock": "is_in_stock",
    "requires_advice": "requires_advice",
    "featured": "is_featured",
    "active": "is_active",
}
_PRICE_NOISE = re.compile(r"(?i)kshs?|kes|shs?|/=|/-|[,\s]")
_PRICE_SHAPE = re.compile(r"^\d{1,8}(\.\d{1,2})?$")
_QUANTITY_SHAPE = re.compile(r"^\d{1,7}(\.0+)?$")
_TRUE_WORDS = {"yes", "y", "true", "t", "1"}
_FALSE_WORDS = {"no", "n", "false", "f", "0"}


def parse_price(raw: str) -> Decimal:
    cleaned = _PRICE_NOISE.sub("", raw)
    if not _PRICE_SHAPE.match(cleaned):
        raise ValueError(f'"{raw}" is not a valid price. Use a number like 650 or 1200.50.')
    return Decimal(cleaned)


def parse_quantity(raw: str) -> int:
    cleaned = raw.replace(",", "").strip()
    if not _QUANTITY_SHAPE.match(cleaned):
        raise ValueError(f'"{raw}" is not a whole number of 0 or more.')
    return int(Decimal(cleaned))


def parse_flag(raw: str) -> bool:
    value = raw.strip().lower()
    if value in _TRUE_WORDS:
        return True
    if value in _FALSE_WORDS:
        return False
    raise ValueError(f'"{raw}" is not valid here. Use yes or no.')


@dataclass
class RowPlan:
    number: int
    sku: str
    existing: Product | None
    changes: dict
    errors: list[dict] = field(default_factory=list)


@dataclass
class ImportOutcome:
    commit: bool
    applied: bool
    total: int
    counts: dict[str, int]
    issues: list[dict]
    issues_truncated: bool
    ignored_columns: list[str]


def _error(column: str, message: str) -> dict:
    return {"field": column, "message": message}


def _max_length(name: str) -> int:
    return Product._meta.get_field(name).max_length


def _check_sku(sku: str) -> list[dict]:
    limit = _max_length("sku")
    if len(sku) > limit:
        return [_error("sku", f"SKU is longer than {limit} characters.")]
    try:
        SKU_VALIDATOR(sku)
    except DjangoValidationError as exc:
        return [_error("sku", exc.messages[0])]
    return []


def _find_category(raw: str, categories: dict[str, Category]) -> Category:
    category = categories.get(raw.lower())
    if category is not None:
        return category
    close = get_close_matches(raw.lower(), list(categories), n=1, cutoff=0.6)
    if close:
        raise ValueError(f'Unknown category "{raw}". Did you mean "{categories[close[0]].name}"?')
    raise ValueError(f'Unknown category "{raw}". Create it in the dashboard first.')


def _parse_cell(column: str, raw: str, categories: dict[str, Category]) -> dict:
    """Return {model_field: value} for one non-blank cell, or raise ValueError."""
    if column in _TEXT_COLUMNS:
        if column != "description" and len(raw) > _max_length(column):
            raise ValueError(f"Longer than {_max_length(column)} characters.")
        return {column: raw}
    if column == "category":
        return {"category": _find_category(raw, categories)}
    if column == "price":
        return {"price": parse_price(raw)}
    if column == "stock_quantity":
        return {"stock_quantity": parse_quantity(raw)}
    return {_FLAG_FIELDS[column]: parse_flag(raw)}


def _plan_row(
    row: ParsedRow,
    categories: dict[str, Category],
    existing_by_sku: dict[str, Product],
    seen_skus: dict[str, int],
) -> RowPlan:
    errors: list[dict] = []
    changes: dict = {}
    sku = row.values.get("sku", "").strip().upper()

    if not sku:
        errors.append(_error("sku", "SKU is required."))
    else:
        errors.extend(_check_sku(sku))
        if sku in seen_skus:
            message = f"Duplicate of row {seen_skus[sku]}. Each SKU may appear once."
            errors.append(_error("sku", message))
        else:
            seen_skus[sku] = row.number

    existing = existing_by_sku.get(sku)

    for column, raw in row.values.items():
        raw = raw.strip()
        if column == "sku" or not raw:
            continue
        try:
            changes.update(_parse_cell(column, raw, categories))
        except ValueError as exc:
            errors.append(_error(column, str(exc)))

    failed = {error["field"] for error in errors}

    if existing is None:
        for column in ("name", "category", "price"):
            if column not in changes and column not in failed:
                message = "Required for a new product (this SKU does not exist yet)."
                errors.append(_error(column, message))

    if "is_in_stock" in changes and "stock_quantity" not in failed:
        quantity = changes.get("stock_quantity", existing.stock_quantity if existing else None)
        if quantity is not None and changes["is_in_stock"] != (quantity > 0):
            errors.append(
                _error(
                    "in_stock",
                    "Conflicts with the stock quantity. Availability follows the quantity "
                    "when one is set; leave in_stock blank.",
                )
            )

    return RowPlan(row.number, sku, existing, changes, errors)


def _changed_fields(plan: RowPlan) -> list[str] | None:
    """Model fields that would change, or None when the product is new."""
    if plan.existing is None:
        return None
    changed = []
    for name, value in plan.changes.items():
        if name == "category":
            current, new = plan.existing.category_id, value.id
        else:
            current, new = getattr(plan.existing, name), value
        if current != new:
            changed.append(name)
    return changed


def _apply(plan: RowPlan, changed: list[str] | None) -> None:
    if changed is None:
        Product(sku=plan.sku, **plan.changes).save()
    elif changed:
        for name in changed:
            setattr(plan.existing, name, plan.changes[name])
        plan.existing.save(update_fields=[*changed, "updated_at"])


def run_import(sheet: ParsedSheet, *, commit: bool = False, skip_invalid: bool = False):
    """Validate every row; write only when `commit` is set and the rules allow it.

    Read queries are constant (two), however many rows the sheet has.
    """
    categories = {category.name.lower(): category for category in Category.objects.all()}
    skus = {row.values.get("sku", "").strip().upper() for row in sheet.rows} - {""}
    existing_by_sku = Product.objects.in_bulk(skus, field_name="sku")

    seen_skus: dict[str, int] = {}
    plans = [_plan_row(row, categories, existing_by_sku, seen_skus) for row in sheet.rows]

    counts = {"create": 0, "update": 0, "unchanged": 0, "invalid": 0}
    issues = []
    valid = []
    for plan in plans:
        if plan.errors:
            counts["invalid"] += 1
            issues.append({"row": plan.number, "sku": plan.sku, "errors": plan.errors})
            continue
        changed = _changed_fields(plan)
        counts["create" if changed is None else "update" if changed else "unchanged"] += 1
        valid.append((plan, changed))

    applied = commit and (counts["invalid"] == 0 or skip_invalid)
    if applied:
        with transaction.atomic():
            for plan, changed in valid:
                _apply(plan, changed)

    return ImportOutcome(
        commit=commit,
        applied=applied,
        total=len(sheet.rows),
        counts=counts,
        issues=issues[:MAX_REPORTED_ISSUES],
        issues_truncated=len(issues) > MAX_REPORTED_ISSUES,
        ignored_columns=sheet.ignored_columns,
    )
