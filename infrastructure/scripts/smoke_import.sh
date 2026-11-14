#!/usr/bin/env bash
# Product import smoke test: templates, preview, commit, public check, cleanup.
set -u
BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
API="$BASE_URL/api/v1"
IMPORTS="$API/admin/imports/products"
CSV_FILE=/tmp/smoke_import.csv

summary() {
  python3 -c 'import json,sys
d = json.load(sys.stdin)
print(d["mode"], "applied=" + str(d["applied"]), d["summary"])'
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

CAT=$(curl -s -H "$AUTH" "$API/admin/catalog/categories/" | python3 -c 'import json,sys
print(json.load(sys.stdin)[0]["name"])')
printf 'sku,name,category,pack_size,price\nSMOKE-IMP-1,Smoke Import Item,%s,1 kg,"KES 1,250"\nSMOKE-IMP-2,Bad Row,Nowhere,1 kg,100\n' "$CAT" > "$CSV_FILE"

curl -s -o /dev/null -w "template csv:  %{http_code}\n" -H "$AUTH" "$IMPORTS/template/?file=csv"
curl -s -o /dev/null -w "template xlsx: %{http_code}, %{size_download} bytes\n" \
  -H "$AUTH" "$IMPORTS/template/"

echo -n "preview: "
curl -s -X POST -H "$AUTH" -F "file=@$CSV_FILE" "$IMPORTS/" | summary
echo -n "commit:  "
curl -s -X POST -H "$AUTH" -F "file=@$CSV_FILE" -F commit=true -F skip_invalid=true \
  "$IMPORTS/" | summary

echo -n "public search count: "
curl -s "$API/catalog/products/?search=smoke-imp" | python3 -c 'import json,sys
print(json.load(sys.stdin)["count"])'

IDS=$(curl -s -H "$AUTH" "$API/admin/catalog/products/?search=smoke-imp" | python3 -c 'import json,sys
print(" ".join(str(p["id"]) for p in json.load(sys.stdin)["results"]))')
for ID in $IDS; do
  curl -s -o /dev/null -w "cleanup delete $ID: %{http_code}\n" -X DELETE \
    -H "$AUTH" "$API/admin/catalog/products/$ID/"
done
rm -f "$CSV_FILE"
