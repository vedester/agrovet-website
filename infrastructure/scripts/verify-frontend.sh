#!/usr/bin/env bash
# Frontend gate. Run before every commit; prints a PASS or FAIL line.
# Enforces the proxy rules: the browser only talks to this site, and the
# backend address lives in exactly one file (src/config/backend.ts).
cd "$(dirname "$0")/../../frontend" || exit 1
FAILED=0

scan() {
  local label="$1" pattern="$2" skip="$3" hits
  hits=$(grep -rnE "$pattern" src next.config.ts --include='*.ts' --include='*.tsx' --include='*.css' 2>/dev/null \
    | grep -vE "$skip" | grep -v "allow-url")
  if [ -n "$hits" ]; then
    echo "RULE BROKEN: $label"
    echo "$hits"
    FAILED=1
  else
    echo "rule ok:     $label"
  fi
}

run() {
  local label="$1"
  shift
  if "$@" > /tmp/frontend_step.log 2>&1; then
    echo "step ok:     $label"
  else
    echo "STEP FAILED: $label"
    tail -40 /tmp/frontend_step.log
    FAILED=1
  fi
}

scan "no NEXT_PUBLIC_ variables" 'NEXT_PUBLIC_' '^$'
scan "no hardcoded hosts or URLs outside config" 'localhost|127\.0\.0\.1|https?://' '^src/config/backend\.ts:|\.test\.tsx?:'
scan "no raw fetch outside src/lib/api" '\bfetch\(' '^src/lib/api/|\.test\.tsx?:'

if ls .env* > /dev/null 2>&1; then
  echo "RULE BROKEN: .env files must not exist in frontend/"
  FAILED=1
else
  echo "rule ok:     no .env files"
fi

run "type-check" npx tsc --noEmit
run "lint" npm run lint
run "format" npx prettier --check .
run "unit tests" npm test
run "production build" env BACKEND_ORIGIN="${BACKEND_ORIGIN:-http://127.0.0.1:8000}" npm run build

if [ "$FAILED" -eq 0 ]; then
  echo "FRONTEND VERIFY: PASS"
else
  echo "FRONTEND VERIFY: FAIL"
fi
exit "$FAILED"
