#!/usr/bin/env bash
# Runs the stats API tests against static/api/stats.php in a PHP Docker container.
# Usage: tests/api/run.sh [php-version]   (default 8.2, matching the production server)
set -euo pipefail
REPO=$(cd "$(dirname "$0")/../.." && pwd)
TAG="${1:-8.2}"; PORT=18090
SRV=$(mktemp -d)
CID=""
cleanup() {
  if [[ -n "$CID" ]]; then docker stop "$CID" >/dev/null 2>&1 || true; fi
  rm -rf "$SRV"
}
trap cleanup EXIT

mkdir -p "$SRV/deldoku/api" "$SRV/deldoku/challenges" "$SRV/data"
cp "$REPO/static/api/stats.php" "$SRV/deldoku/api/"
# Fixed test challenge instead of the real (gitignored) daily files: every cell has several
# answers and no player appears in two cells, so the tests can always build a valid grid.
# Today and yesterday in UTC via Python (already required below), since `date -d` is GNU-only
DATES=$(python3 -I -c 'from datetime import datetime, timedelta, timezone as tz; d = datetime.now(tz.utc).date(); print(d, d - timedelta(days=1))')
for d in $DATES; do
  cp "$REPO/tests/api/fixtures/challenge.json" "$SRV/deldoku/challenges/$d.json"
done
cp "$REPO/tests/api/fixtures/fallback.json" "$SRV/deldoku/challenges/fallback.json"
docker run --rm -v "$SRV:/srv" "php:$TAG-cli" php -l /srv/deldoku/api/stats.php
CID=$(docker run -d --rm --user "$(id -u):$(id -g)" -e PHP_CLI_SERVER_WORKERS=8 -e DELDOKU_REGISTRATION_LIMIT=30 -p "$PORT:8000" \
      -v "$SRV:/srv" "php:$TAG-cli" php -S 0.0.0.0:8000 -t /srv)

ready=""
for _ in $(seq 1 50); do
  if curl -s -o /dev/null "http://127.0.0.1:$PORT/"; then ready=1; break; fi
  sleep 0.2
done
[[ -n "$ready" ]] || { echo "PHP server did not start on port $PORT" >&2; exit 1; }

python3 -I "$REPO/tests/api/test_api.py" "http://127.0.0.1:$PORT" "$SRV"
