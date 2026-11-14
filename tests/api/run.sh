#!/usr/bin/env bash
# Runs the stats API tests (pytest) against static/api/stats.php inside a PHP Docker container.
# Usage: tests/api/run.sh [php-version] [pytest args...]
#   tests/api/run.sh               all tests on PHP 8.2 (the production version)
#   tests/api/run.sh 8.3 -k auth   only tests matching "auth", on PHP 8.3
set -euo pipefail
REPO=$(cd "$(dirname "$0")/../.." && pwd)
PHP_VERSION="${1:-8.2}"
shift || true
IMAGE="deldoku-api-tests:php$PHP_VERSION"

docker build -q --build-arg "PHP_VERSION=$PHP_VERSION" -t "$IMAGE" "$REPO/tests/api" >/dev/null
docker run --rm --user "$(id -u):$(id -g)" -v "$REPO:/repo:ro" -w /repo "$IMAGE" \
  python3 -m pytest -p no:cacheprovider tests/api "$@"
