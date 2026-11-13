#!/usr/bin/env bash
# Manual smoke test for the auth endpoints. Prints status codes only.
set -u
BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"

read -r -p "Email: " EMAIL
read -r -s -p "Password: " PW
echo

BODY=$(python3 -c 'import json,sys; print(json.dumps({"email": sys.argv[1], "password": sys.argv[2]}))' "$EMAIL" "$PW")
unset PW

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/login/" \
  -H "Content-Type: application/json" -d "$BODY")
CODE=$(tail -n1 <<< "$RESP")
JSON=$(sed '$d' <<< "$RESP")
echo "login status:            $CODE   (expect 200)"

ACCESS=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("access",""))' <<< "$JSON" 2>/dev/null)

if [ -n "$ACCESS" ]; then
  ME=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $ACCESS" "$BASE_URL/api/v1/auth/me/")
  echo "me with token:           $ME   (expect 200)"
else
  echo "me with token:           skipped (no access token returned)"
fi

NOTOKEN=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/auth/me/")
echo "me without token:        $NOTOKEN   (expect 401)"
