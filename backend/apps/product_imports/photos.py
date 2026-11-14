"""Match photo filenames to products by SKU and attach the photos.

Naming rule (case and extension do not matter; the number is the photo slot):

    VET-IVM-50.jpg     -> slot 1 (the main photo) of product VET-IVM-50
    VET-IVM-50_2.jpg   -> slot 2

A whole filename that is itself a SKU always wins, so a SKU such as BAG_2 is
never misread as slot 2 of BAG. Uploading a name again replaces that slot,
which makes repeating an upload safe.
"""
import re
from collections import Counter
from dataclasses import dataclass
from difflib import get_close_matches
from pathlib import PurePosixPath

from django.db import transaction

from apps.catalog.models import IMAGE_EXTENSIONS, Product, ProductImage
from apps.catalog.services import MAX_IMAGES_PER_PRODUCT, add_product_image
from apps.core.files import delete_file_after_commit
from apps.core.images import process_image
from apps.core.validators import validate_image_size

MAX_FILES_PER_REQUEST = 20
MAX_FILENAMES_PER_CHECK = 500
MAX_SLOT = MAX_IMAGES_PER_PRODUCT
MAX_HINTS = 50
SUGGESTION_CUTOFF = 0.8

STATUSES = (
    "ready",
    "attached",
    "replaced",
    "failed",
    "unmatched",
    "unsupported",
    "duplicate",
    "invalid_slot",
    "limit_reached",
)

_SLOT_SUFFIX = re.compile(r"^(?P<base>.+)_(?P<slot>\d{1,3})$")


@dataclass
class PhotoPlan:
    filename: str
    status: str
    message: str = ""
    sku: str = ""
    slot: int | None = None
    action: str = ""  # "add" or "replace", only when status is "ready"
    suggestion: str = ""
    product: Product | None = None
    existing: ProductImage | None = None


def _base_name(raw: str) -> str:
    return PurePosixPath(raw.replace("\\", "/")).name.strip()


def _extension(name: str) -> str:
    return PurePosixPath(name).suffix.lower().lstrip(".")


def _stem(name: str) -> str:
    return PurePosixPath(name).stem.strip().upper()


def _candidates(stem: str) -> list[tuple[str, int]]:
    """(sku, slot) readings of a filename stem, most specific first."""
    options = [(stem, 1)]
    match = _SLOT_SUFFIX.match(stem)
    if match:
        options.append((match["base"], int(match["slot"])))
    return options


def _unsupported_message(extension: str) -> str:
    if extension in ("heic", "heif"):
        return "iPhone HEIC photos are not supported. Share or export them as JPEG."
    return "Unsupported file type. Use JPG, PNG or WEBP."


def _images_by_product(products: dict) -> dict[int, list[ProductImage]]:
    if not products:
        return {}
    grouped: dict[int, list[ProductImage]] = {}
    ids = [product.id for product in products.values()]
    for image in ProductImage.objects.filter(product_id__in=ids):
        grouped.setdefault(image.product_id, []).append(image)
    return grouped


def _resolve(stem: str, products: dict):
    """First (product, slot) reading of a filename stem that names a real product."""
    for sku, slot in _candidates(stem):
        product = products.get(sku)
        if product is not None:
            return product, slot
    return None


def _plan_one(name, products, images_by_product, taken, added) -> PhotoPlan:
    extension = _extension(name)
    if extension not in IMAGE_EXTENSIONS:
        return PhotoPlan(name, "unsupported", _unsupported_message(extension))

    stem = _stem(name)
    resolved = _resolve(stem, products)
    if resolved is None:
        return PhotoPlan(name, "unmatched", f'No product has the SKU "{stem}".')
    product, slot = resolved

    found = {"sku": product.sku, "slot": slot, "product": product}
    if not 1 <= slot <= MAX_SLOT:
        message = f"Photo number must be between 1 and {MAX_SLOT}."
        return PhotoPlan(name, "invalid_slot", message, **found)

    key = (product.id, slot)
    if key in taken:
        message = f"Same product and photo number as {taken[key]} in this batch."
        return PhotoPlan(name, "duplicate", message, **found)
    taken[key] = name

    images = images_by_product.get(product.id, [])
    existing = next((image for image in images if image.position == slot - 1), None)
    if existing is not None:
        return PhotoPlan(name, "ready", action="replace", existing=existing, **found)

    if len(images) + added[product.id] >= MAX_IMAGES_PER_PRODUCT:
        message = (
            f"{product.sku} already has {MAX_IMAGES_PER_PRODUCT} photos. "
            "Delete one in the dashboard first."
        )
        return PhotoPlan(name, "limit_reached", message, **found)
    added[product.id] += 1
    return PhotoPlan(name, "ready", action="add", **found)


def _add_suggestions(plans: list[PhotoPlan]) -> None:
    unmatched = [plan for plan in plans if plan.status == "unmatched"][:MAX_HINTS]
    if not unmatched:
        return
    known = list(Product.objects.order_by().values_list("sku", flat=True))
    for plan in unmatched:
        guess = _candidates(_stem(plan.filename))[-1][0]
        close = get_close_matches(guess, known, n=1, cutoff=SUGGESTION_CUTOFF)
        if close:
            plan.suggestion = close[0]
            plan.message += f' Did you mean "{close[0]}"?'


def plan_photos(filenames: list[str]) -> list[PhotoPlan]:
    """Decide what would happen to each file, in order. At most three queries."""
    names = [_base_name(raw) for raw in filenames]

    wanted: set[str] = set()
    for name in names:
        if _extension(name) in IMAGE_EXTENSIONS:
            wanted.update(sku for sku, _ in _candidates(_stem(name)))
    products = Product.objects.in_bulk(wanted, field_name="sku") if wanted else {}
    images_by_product = _images_by_product(products)

    taken: dict[tuple[int, int], str] = {}
    added: Counter = Counter()
    plans = [_plan_one(name, products, images_by_product, taken, added) for name in names]
    _add_suggestions(plans)
    return plans


def describe(plan: PhotoPlan) -> dict:
    return {
        "filename": plan.filename,
        "status": plan.status,
        "message": plan.message,
        "sku": plan.sku,
        "product_name": plan.product.name if plan.product else "",
        "slot": plan.slot,
        "action": plan.action,
        "suggestion": plan.suggestion,
    }


def summarise(items: list[dict]) -> dict:
    counts = Counter(item["status"] for item in items)
    return {"files": len(items), **{status: counts.get(status, 0) for status in STATUSES}}


def attach_photo(plan: PhotoPlan, uploaded) -> str:
    """Process one upload and store it. Returns "attached" or "replaced".

    Raises django ValidationError when the file cannot be used.
    """
    validate_image_size(uploaded)
    processed = process_image(uploaded)

    with transaction.atomic():
        if plan.action == "replace":
            image = plan.existing
            storage, old_name = image.image.storage, image.image.name
            image.image = processed
            image.save()
            delete_file_after_commit(storage, old_name)
            return "replaced"
        add_product_image(
            product=plan.product,
            image=processed,
            alt_text=plan.product.name[:200],
            position=plan.slot - 1,
        )
        return "attached"
