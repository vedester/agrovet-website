#!/usr/bin/env bash
# Site settings smoke test: public read, staff update, public re-read, restore.
set -u
API="${BASE_URL:-http://127.0.0.1:8000}/api/v1"

show() {
  python3 -c 'import json,sys
d = json.load(sys.stdin)
print(d["business_name"] or "(blank)", "|", d["whatsapp_url"] or "(none)")'
}

UP=$(curl -s -o /dev/null -w "%{http_code}" "$API/health/")
if [ "$UP" != "200" ]; then
  echo "Server not reachable (got $UP). Start runserver first."
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
JSON="Content-Type: application/json"

echo -n "public before: "
curl -s "$API/site/" | show

echo -n "staff update:  "
curl -s -X PATCH -H "$AUTH" -H "$JSON" \
  -d '{"business_name": "Smoke Agrovet", "whatsapp_number": "0712 345 678"}' \
  "$API/admin/site/" | show

echo -n "public after:  "
curl -s "$API/site/" | show

curl -s -o /dev/null -w "bad number:    %{http_code} (expect 400)\n" -X PATCH \
  -H "$AUTH" -H "$JSON" -d '{"whatsapp_number": "12345"}' "$API/admin/site/"

curl -s -o /dev/null -w "http link:     %{http_code} (expect 400)\n" -X PATCH \
  -H "$AUTH" -H "$JSON" -d '{"facebook_url": "http://facebook.com/x"}' "$API/admin/site/"

echo -n "restore:       "
curl -s -X PATCH -H "$AUTH" -H "$JSON" \
  -d '{"business_name": "", "whatsapp_number": ""}' "$API/admin/site/" | show
