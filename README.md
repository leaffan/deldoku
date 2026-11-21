# DELdoku

A daily hockey puzzle for the German ice hockey league (DEL): fill a 3×3 grid with players who match both the row and the column category, such as a team, a career milestone or a decade. Rare answers score more points.

Play it at <https://www.leaffan.net/deldoku>.

## Features

- A new challenge every day, plus a permanent fallback challenge
- Player search that ignores case, accents and umlauts (`muller` and `mueller` both find Müller)
- Rarity scoring: the fewer players gave the same answer, the more points
- Statistics, streaks and game history, kept on the server without registration
- "Delete my data" in the statistics view; accounts without a game for 12 months are removed automatically
- German and English UI, keyboard and screen reader support, works down to 360 px wide screens

## Architecture

- **Frontend:** SvelteKit app built as a static site (`@sveltejs/adapter-static`) and served from `/deldoku` (production) or `/deldoku_tst` (test instance).
- **Stats API:** a single PHP file, `static/api/stats.php`, deployed with the static files. It validates submitted games against the day's challenge, computes the score and stores everything as JSON files.
- **Data files:** the API keeps its data next to the instance directory, in `data/` (production) or `data_tst/` (test instance), protected by `.htaccess`:
  - `users/<userId>.json`: one file per player with a hash of their access token and their games
  - `day_<date>.json`: anonymous daily aggregates (games, averages, how often each player was named per cell)
  - `games.jsonl`: an append-only log from which user and day files can be rebuilt
- **Player list and challenges:** `static/all_players.json` and `static/challenges/<date>.json`. Daily challenge files are not part of the repository; only `challenges/fallback.json` is.

### Stats API

| Request                                             | Purpose                                                                       |
| --------------------------------------------------- | ----------------------------------------------------------------------------- |
| `GET api/stats.php[?date=YYYY-MM-DD]`               | Public aggregates of a day                                                    |
| `GET api/stats.php?userId=<id>`                     | Own statistics; needs the `X-DelDoku-Token` header                            |
| `POST api/stats.php` `{date, selections[, userId]}` | Submit a game; without `userId` a new player is created and gets a token once |
| `DELETE api/stats.php?userId=<id>`                  | Delete the own account and games; needs the `X-DelDoku-Token` header          |

Players never choose an ID or password: the server issues a random ID and token on the first game, and the browser keeps both in `localStorage`.

## Development

Requirements: Node.js (see `engines` in `package.json`), pnpm and Docker. On Windows, Docker runs in WSL and the scripts call it there.

```sh
pnpm install
pnpm run dev        # starts the PHP container (docker-compose.yml) and the Vite dev server
pnpm run dev:down   # stops the PHP container
```

The dev server forwards `/deldoku/api/*` to the PHP container on port 8090. Local game data ends up in `.dev-data/`. Without a challenge file for today, the game uses `challenges/fallback.json`.

Other scripts:

```sh
pnpm run build      # static build into build/
pnpm run preview    # serve the build, with the PHP container
pnpm run check      # svelte-check (TypeScript)
pnpm run lint       # Prettier and ESLint
pnpm run format     # format all files with Prettier
```

Code comments, identifiers and log messages are in English; only the UI texts in `src/lib/i18n.ts` are German as well. See `.github/copilot-instructions.md`.

## Tests

| Suite            | Command                                             | What it covers                                                                                                    |
| ---------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Unit (Vitest)    | `pnpm run test:unit`                                | Logic in `src/lib` (data loading, player search)                                                                  |
| API (pytest)     | `bash tests/api/run.sh [php-version] [pytest args]` | `stats.php` against a real PHP server in Docker: scoring, validation, auth, storage, deletion and expiry, backups |
| E2E (Playwright) | `pnpm run build && pnpm run test:e2e`               | The production build with the real `stats.php`, in Chromium on desktop and at 360 px                              |

The E2E tests serve `build/`, so rebuild after changing the app.

## CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`: lint, type check and build; API tests on PHP 8.2; E2E tests; and a dependency audit (`pnpm audit`), which also runs weekly. `main` only accepts changes through pull requests with green checks. Dependabot opens grouped update PRs weekly.

## Releases

Versions follow [SemVer](https://semver.org/):

- **MAJOR**: incompatible for players or stored data (e.g. stats format changes)
- **MINOR**: new features
- **PATCH**: fixes

Tags have no `v` prefix (`2.0.0`). To release:

1. Bump `version` in `package.json` in a PR and merge it (the footer shows this version).
2. Create the release, which also creates the tag on the current `main`:
   ```sh
   gh release create 2.0.0 --target main --generate-notes
   ```
   The notes are built from PR titles and grouped by PR label (see `.github/release.yml`), so label PRs like their issues.

## Deployment

`.github/workflows/deploy.yml` builds and uploads the app with `rsync`:

- **Test instance** (`/deldoku_tst`): automatically after CI passes on `main`. To try a branch on the server before merging, run the workflow manually on that branch with environment `test`; the next merge to `main` replaces it again.
- **Production** (`/deldoku`): run the workflow manually with a release tag; the `production` environment asks for approval. The tag must be on `main` and match `package.json`.
  ```sh
  gh workflow run deploy.yml -f environment=production -f tag=2.0.0
  ```

The upload runs in two passes (new files first, then `index.html` and deleting outdated files), so visitors never get a page whose scripts are missing. Daily challenges on the server are never touched; production deploys only `challenges/fallback.json` and `challenges/.htaccess`, the test instance leaves `challenges/` out entirely. The test instance gets a `robots.txt` that disallows indexing. A smoke test then checks that the page shows the deployed version, that the server runs the deployed commit (`_app/version.json`) and that the stats API answers.

Each environment (`test`, `production`) needs these secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (a dedicated key, restricted on the server to that instance's directory) and `DEPLOY_KNOWN_HOSTS`, plus the variable `DEPLOY_URL` (public URL of the instance). `DEPLOY_KNOWN_HOSTS` must contain the host key for exactly the name in `DEPLOY_HOST`, e.g. from `ssh-keyscan <host>` (check the fingerprint against a trusted source first).

Restrict the deployment branches of `production` to `main`: a manual run uses `deploy.yml` from the selected branch, so otherwise a branch could run a modified workflow with the production secrets. `test` allows all branches, so branches can be tried before merging.

### Server setup

- PHP 8.0 or newer (`stats.php` uses `str_ends_with`).
- Restrict each deploy key to its instance directory with `rrsync` in `~/.ssh/authorized_keys`:
  ```
  command="rrsync <instance-dir>",restrict ssh-ed25519 <public-key> deploy-<environment>
  ```

## Backups

`scripts/backup.sh` archives the production game data (`data/`) as `tar.gz` and deletes its own archives older than the given number of days. It holds the same lock as `stats.php` while archiving, so no game is half in the backup. The test instance's data (`data_tst/`) is deliberately not backed up. Run it daily, with the backup directory outside the web root, e.g. with cron:

```sh
# m h dom mon dow  command
15 3 * * * bash <repo-scripts>/backup.sh <data-dir> <backup-dir> 14
```

or, where cron is not available, with a systemd user timer (`OnCalendar=*-*-* 03:15:00`, `Persistent=true`) that runs the same command as a `oneshot` service.

To restore, unpack the archive next to the live data and swap the directories (games played since the backup are lost):

```sh
mkdir restore && tar -xzf <backup-dir>/deldoku-data-<timestamp>.tar.gz -C restore
mv <data-dir> <data-dir>.broken && mv restore/data <data-dir>
```

## Technology stack

- SvelteKit 3 with Svelte 5, TypeScript 6 and Vite 8
- Tailwind CSS 4
- PHP 8 for the stats API
- Vitest, pytest and Playwright for tests
- pnpm, GitHub Actions, Dependabot

## License

[MIT](LICENSE)
