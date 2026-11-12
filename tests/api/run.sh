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
for d in "$(date -u +%F)" "$(date -u -d yesterday +%F)"; do
  cp "$REPO/static/challenges/$d.json" "$SRV/deldoku/challenges/" || { echo "missing challenge $d" >&2; exit 1; }
done
docker run --rm -v "$SRV:/srv" "php:$TAG-cli" php -l /srv/deldoku/api/stats.php
CID=$(docker run -d --rm --user "$(id -u):$(id -g)" -e PHP_CLI_SERVER_WORKERS=8 -p "$PORT:8000" \
      -v "$SRV:/srv" "php:$TAG-cli" php -S 0.0.0.0:8000 -t /srv)

ready=""
for _ in $(seq 1 50); do
  if curl -s -o /dev/null "http://127.0.0.1:$PORT/"; then ready=1; break; fi
  sleep 0.2
done
[[ -n "$ready" ]] || { echo "PHP server did not start on port $PORT" >&2; exit 1; }

python3 -I "$REPO/tests/api/test_api.py" "http://127.0.0.1:$PORT" "$SRV"
