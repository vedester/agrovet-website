#!/usr/bin/env bash
# Photo import smoke test: check, upload, replace, public check, cleanup.
set -u
BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
API="$BASE_URL/api/v1"
PHOTOS="$API/admin/imports/photos"
DIR=/tmp/smoke_photos

report() {
  python3 -c 'import json,sys
d = json.load(sys.stdin)
print([r["status"] for r in d["results"]], {k: v for k, v in d["summary"].items() if v})'
}

UP=$(curl -s -o /dev/null -w "%{http_code}" "$API/health/")
if [ "$UP" != "200" ]; then
  echo "Server not reachable at $BASE_URL (got $UP). Start runserver first."
  exit 1
fi

read -r -p "Email: " EMAIL
read -r -s -p "Password: " PW
echo
LOGIN_BODY=$(python3 -c 'import json,sys
print(json.dumps({"email": sys.argv[1], "password": sys.argv[2]}))' "$EMAIL" "$PW")
unset PW
TOKEN=$(curl -s -X POST "$API/auth/login/" -H "Content-Type: application/json" \
  -d "$LOGIN_BODY" | python3 -c 'import json,sys
print(json.load(sys.stdin)["access"])' 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "Login failed."
  exit 1
fi
AUTH="Authorization: Bearer $TOKEN"

CAT_ID=$(curl -s -H "$AUTH" "$API/admin/catalog/categories/" | python3 -c 'import json,sys
print(json.load(sys.stdin)[0]["id"])')
BODY=$(python3 -c 'import json,sys
print(json.dumps({"category": int(sys.argv[1]), "name": "Smoke Photo Product",
 "sku": "smoke-ph-1", "pack_size": "1 kg", "price": "100.00"}))' "$CAT_ID")
RESP=$(curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
  -d "$BODY" "$API/admin/catalog/products/")
PID=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<< "$RESP")
SLUG=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["slug"])' <<< "$RESP")
echo "created product id=$PID"

mkdir -p "$DIR"
python3 -c "from PIL import Image
Image.new('RGB', (3000, 2000), 'green').save('$DIR/SMOKE-PH-1.jpg')
Image.new('RGB', (800, 600), 'blue').save('$DIR/smoke-ph-1_2.jpg')
Image.new('RGB', (800, 600), 'red').save('$DIR/IMG_0001.jpg')"

echo -n "check:    "
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"filenames": ["SMOKE-PH-1.jpg", "smoke-ph-1_2.jpg", "IMG_0001.jpg"]}' \
  "$PHOTOS/check/" | report

echo -n "upload:   "
curl -s -X POST -H "$AUTH" -F "files=@$DIR/SMOKE-PH-1.jpg" \
  -F "files=@$DIR/smoke-ph-1_2.jpg" -F "files=@$DIR/IMG_0001.jpg" "$PHOTOS/" | report

echo -n "public photos: "
IMG=$(curl -s "$API/catalog/products/$SLUG/" | python3 -c 'import json,sys
d = json.load(sys.stdin)
print(d["images"][0]["image"])')
curl -s "$API/catalog/products/$SLUG/" | python3 -c 'import json,sys
print(len(json.load(sys.stdin)["images"]))'
echo "first photo url: $IMG"
curl -s -o /dev/null -w "photo fetch: %{http_code}, %{size_download} bytes\n" "$IMG"

echo -n "re-upload: "
curl -s -X POST -H "$AUTH" -F "files=@$DIR/SMOKE-PH-1.jpg" "$PHOTOS/" | report

curl -s -o /dev/null -w "cleanup delete: %{http_code}\n" -X DELETE \
  -H "$AUTH" "$API/admin/catalog/products/$PID/"
rm -rf "$DIR"
