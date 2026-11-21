#!/usr/bin/env bash
# Serves the production build (build/) with the real stats.php, laid out as on the server:
#   <root>/deldoku/   build, plus test player list and test challenge from tests/e2e/fixtures
#   <root>/data/      empty; the tests empty it before each test (see fixtures.ts)
# Started by Playwright (playwright.config.ts); requires `pnpm build`.
# Usage: serve.sh <date> <port>; the date comes from tests/e2e/constants.ts
set -euo pipefail
REPO=$(cd "$(dirname "$0")/../.." && pwd)
ROOT="$REPO/.e2e-server"
TODAY="${1:?date missing}"
PORT="${2:?port missing}"
CONTAINER=deldoku-e2e

if [ ! -f "$REPO/build/index.html" ]; then
	echo "build/ missing, run 'pnpm build' first" >&2
	exit 1
fi

rm -rf "$ROOT"
mkdir -p "$ROOT/data"
cp -r "$REPO/build" "$ROOT/deldoku"
# Serve only the test challenge, not any real challenges present locally
rm -rf "$ROOT/deldoku/challenges"
mkdir "$ROOT/deldoku/challenges"
cp "$REPO/tests/e2e/fixtures/challenge.json" "$ROOT/deldoku/challenges/$TODAY.json"
cp "$REPO/tests/e2e/fixtures/players.json" "$ROOT/deldoku/all_players.json"

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
exec docker run --rm --init --name "$CONTAINER" \
	--user "$(id -u):$(id -g)" \
	-p "127.0.0.1:$PORT:8000" \
	-e PHP_CLI_SERVER_WORKERS=4 \
	-e DELDOKU_TEST_TODAY="$TODAY" \
	-e DELDOKU_TEST_REGISTRATION_LIMIT=1000 \
	-v "$ROOT:/srv" \
	php:8.2-cli php -S 0.0.0.0:8000 -t /srv
