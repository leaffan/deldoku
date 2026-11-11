#!/usr/bin/env bash
# Runs the stats API tests against static/api/stats.php in a PHP Docker container.
# Usage: tests/api/run.sh [php-version]   (default 8.2, matching the production server)
set -u
REPO=$(cd "$(dirname "$0")/../.." && pwd)
TAG="${1:-8.2}"; PORT=18090
SRV=$(mktemp -d)
trap 'rm -rf "$SRV"' EXIT
mkdir -p "$SRV/deldoku/api" "$SRV/deldoku/challenges" "$SRV/data"
cp "$REPO/static/api/stats.php" "$SRV/deldoku/api/"
for d in "$(date -u +%F)" "$(date -u -d yesterday +%F)"; do
  cp "$REPO/static/challenges/$d.json" "$SRV/deldoku/challenges/" || { echo "missing challenge $d"; exit 1; }
done
docker run --rm -v "$SRV:/srv" "php:$TAG-cli" php -l /srv/deldoku/api/stats.php || exit 1
CID=$(docker run -d --rm --user "$(id -u):$(id -g)" -e PHP_CLI_SERVER_WORKERS=8 -p "$PORT:8000" \
      -v "$SRV:/srv" "php:$TAG-cli" php -S 0.0.0.0:8000 -t /srv)
for _ in $(seq 1 50); do curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 0.2; done
python3 -I "$REPO/tests/api/test_api.py" "http://127.0.0.1:$PORT" "$SRV"; rc=$?
docker stop "$CID" >/dev/null
exit $rc
