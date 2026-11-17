# DELdoku

A hockey puzzle game similar to Immaculate Grid, where players must guess players that meet specific criteria.

## Features

- Interactive 3x3 grid with various challenges
- Player search with autocomplete
- Statistics tracking for players
- Daily new challenges
- Responsive design with TailwindCSS

## Development

This project uses SvelteKit and pnpm. To get started:

```sh
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Or open directly in browser
pnpm run dev -- --open
```

## Build

Create a production version:

```sh
pnpm run build
```

You can preview the production build with `pnpm run preview`.

## Releases

Versions follow [SemVer](https://semver.org/):

- **MAJOR**: incompatible for players or stored data (e.g. stats format changes)
- **MINOR**: new features
- **PATCH**: fixes

Tags have no `v` prefix (`2.0.0`). To release:

1. Bump `version` in `package.json` in a PR and merge it (the footer shows this version).
2. Tag the merge commit on `main` and push the tag:
   ```sh
   git tag -a 2.0.0 -m "2.0.0"
   git push origin 2.0.0
   ```
3. Create the GitHub release from the tag with generated notes:
   ```sh
   gh release create 2.0.0 --generate-notes
   ```
   The notes are grouped by PR label (see `.github/release.yml`), so label PRs like their issues.

## Deployment

`.github/workflows/deploy.yml` builds and uploads the app with `rsync`:

- **Test instance** (`/deldoku_tst`): automatically after CI passes on `main`.
- **Production** (`/deldoku`): run the workflow manually with a release tag (e.g. `2.0.0`); the `production` environment asks for approval. The tag must be on `main` and match `package.json`.

The upload runs in two passes (new files first, then `index.html` and deleting outdated files), so visitors never get a page whose scripts are missing. Daily challenges on the server are never touched; only `challenges/fallback.json` is deployed. A smoke test then checks that the page shows the deployed version and that the stats API answers.

Each environment (`test`, `production`) needs these secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (a dedicated key, restricted on the server to that instance's directory) and `DEPLOY_KNOWN_HOSTS`, plus the variable `DEPLOY_URL` (public URL of the instance).

The test instance stores its game data in `data_tst/`, separate from production's `data/`.

## Backups

`scripts/backup.sh` archives the server-side game data (`data/`) as `tar.gz` and deletes its own archives older than the given number of days. It holds the same lock as `stats.php` while archiving, so no game is half in the backup. Run it daily via cron, with the backup directory outside the web root:

```sh
# m h dom mon dow  command
15 3 * * * bash <repo-scripts>/backup.sh <data-dir> <backup-dir> 14
```

To restore, unpack the archive next to the live data and swap the directories (games played since the backup are lost):

```sh
mkdir restore && tar -xzf <backup-dir>/deldoku-data-<timestamp>.tar.gz -C restore
mv <data-dir> <data-dir>.broken && mv restore/data <data-dir>
```

## Technology Stack

- **Framework**: SvelteKit 2
- **Styling**: TailwindCSS 4
- **TypeScript**: For type safety
- **Build Tool**: Vite
- **Package Manager**: pnpm

## License

MIT
