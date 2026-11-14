#!/usr/bin/env bash
# One-command gate. Run before every commit; prints PASS or FAIL.
cd "$(dirname "$0")/../../backend" || exit 1
source .venv/bin/activate
python manage.py check &&
ruff check . --output-format concise &&
python manage.py makemigrations --check --dry-run &&
pytest -q
STATUS=$?
if [ $STATUS -eq 0 ]; then echo "VERIFY: PASS"; else echo "VERIFY: FAIL"; fi
exit $STATUS
