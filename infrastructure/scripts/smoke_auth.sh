#!/usr/bin/env bash
# Manual smoke test for the auth endpoints. Prints status codes only.
set -u
BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
HEALTH="$BASE_URL/api/v1/health/"
LOGIN="$BASE_URL/api/v1/auth/login/"
ME="$BASE_URL/api/v1/auth/me/"

UP=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH")
if [ "$UP" != "200" ]; then
  echo "Server not reachable at $BASE_URL (got $UP)."
  echo "Start it first: python manage.py runserver 8000"
  exit 1
fi

read -r -p "Email: " EMAIL
read -r -s -p "Password: " PW
echo

json_body() {
  python3 -c 'import json,sys
print(json.dumps({"email": sys.argv[1], "password": sys.argv[2]}))' "$1" "$2"
}

BODY=$(json_body "$EMAIL" "$PW")
unset PW

RESP=$(curl -s -w "\n%{http_code}" -X POST "$LOGIN" \
  -H "Content-Type: application/json" -d "$BODY")
CODE=$(tail -n1 <<< "$RESP")
JSON=$(sed '$d' <<< "$RESP")
echo "login status:      $CODE (expect 200)"

ACCESS=$(python3 -c 'import json,sys
print(json.load(sys.stdin).get("access",""))' <<< "$JSON" 2>/dev/null)

if [ -n "$ACCESS" ]; then
  OK=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $ACCESS" "$ME")
  echo "me with token:     $OK (expect 200)"
else
  echo "me with token:     skipped (no access token)"
fi

NO=$(curl -s -o /dev/null -w "%{http_code}" "$ME")
echo "me without token:  $NO (expect 401)"
