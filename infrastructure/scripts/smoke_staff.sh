#!/usr/bin/env bash
# Staff API smoke test: login, create a product, upload a photo, check it, clean up.
set -u
BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
API="$BASE_URL/api/v1"
IMG_FILE=/tmp/smoke_photo.jpg

json_get() {
  python3 -c 'import json,sys; print(json.load(sys.stdin)[sys.argv[1]])' "$1"
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
  -d "$LOGIN_BODY" | json_get access 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "Login failed."
  exit 1
fi
AUTH="Authorization: Bearer $TOKEN"
ADMIN="$API/admin/catalog"

CAT_ID=$(curl -s -H "$AUTH" "$ADMIN/categories/" | python3 -c 'import json,sys
print(json.load(sys.stdin)[0]["id"])')
BODY=$(python3 -c 'import json,sys
print(json.dumps({"category": int(sys.argv[1]), "name": "Smoke Test Product",
 "sku": "smoke-1", "pack_size": "1 kg", "price": "100.00"}))' "$CAT_ID")

RESP=$(curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
  -d "$BODY" "$ADMIN/products/")
PID=$(json_get id <<< "$RESP")
SLUG=$(json_get slug <<< "$RESP")
echo "created product id=$PID slug=$SLUG"

python3 -c "from PIL import Image; Image.new('RGB', (3000, 2000), 'green').save('$IMG_FILE')"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "$AUTH" \
  -F "image=@$IMG_FILE" -F "alt_text=Smoke" "$ADMIN/products/$PID/images/")
echo "upload status:     $CODE (expect 201)"

IMG=$(curl -s "$API/catalog/products/$SLUG/" | python3 -c 'import json,sys
print(json.load(sys.stdin)["images"][0]["image"])')
echo "public image url:  $IMG"
curl -s -o /dev/null -w "image fetch:       %{http_code}, %{size_download} bytes (expect 200)\n" "$IMG"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE -H "$AUTH" "$ADMIN/products/$PID/")
echo "cleanup delete:    $CODE (expect 204)"
rm -f "$IMG_FILE"
