#!/usr/bin/env bash
# Liefert den Produktions-Build (build/) mit dem echten stats.php aus, wie auf dem Server:
#   <root>/deldoku/   Build, dazu Test-Spielerliste und Test-Challenge aus tests/e2e/fixtures
#   <root>/data/      leer; die Tests leeren es vor jedem Test (siehe fixtures.ts)
# Wird von Playwright gestartet (playwright.config.ts); setzt `pnpm build` voraus.
# Aufruf: serve.sh <datum> <port>; das Datum kommt aus tests/e2e/constants.ts
set -euo pipefail
REPO=$(cd "$(dirname "$0")/../.." && pwd)
ROOT="$REPO/.e2e-server"
TODAY="${1:?Datum fehlt}"
PORT="${2:?Port fehlt}"
CONTAINER=deldoku-e2e

if [ ! -f "$REPO/build/index.html" ]; then
	echo "build/ fehlt, zuerst 'pnpm build' ausführen" >&2
	exit 1
fi

rm -rf "$ROOT"
mkdir -p "$ROOT/data"
cp -r "$REPO/build" "$ROOT/deldoku"
# Nur die Test-Challenge ausliefern, keine lokal vorhandenen echten Challenges
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
