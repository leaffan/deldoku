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

- **Test instance** (`/deldoku_tst`): automatically after CI passes on `main`. To try a branch on the server before merging, run the workflow manually on that branch with environment `test`; the next merge to `main` replaces it again.
- **Production** (`/deldoku`): run the workflow manually with a release tag (e.g. `2.0.0`); the `production` environment asks for approval. The tag must be on `main` and match `package.json`.

The upload runs in two passes (new files first, then `index.html` and deleting outdated files), so visitors never get a page whose scripts are missing. Daily challenges on the server are never touched; production deploys only `challenges/fallback.json` and `challenges/.htaccess`, the test instance leaves `challenges/` out entirely. The test instance gets a `robots.txt` that disallows indexing. A smoke test then checks that the page shows the deployed version, that the server runs the deployed commit (`_app/version.json`) and that the stats API answers.

Each environment (`test`, `production`) needs these secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (a dedicated key, restricted on the server to that instance's directory) and `DEPLOY_KNOWN_HOSTS`, plus the variable `DEPLOY_URL` (public URL of the instance).

Restrict the deployment branches of `production` to `main`: a manual run uses `deploy.yml` from the selected branch, so otherwise a branch could run a modified workflow with the production secrets. `test` allows all branches, so branches can be tried before merging.

The test instance stores its game data in `data_tst/`, separate from production's `data/`.

### Server setup

- PHP 8.0 or newer (`stats.php` uses `str_ends_with`).
- Restrict each deploy key to its instance directory with `rrsync` in `~/.ssh/authorized_keys`:
  ```
  command="rrsync <instance-dir>",restrict ssh-ed25519 <public-key> deploy-<environment>
  ```

## Backups

`scripts/backup.sh` archives the server-side game data (`data/`) as `tar.gz` and deletes its own archives older than the given number of days. It holds the same lock as `stats.php` while archiving, so no game is half in the backup. The test instance's data (`data_tst/`) is deliberately not backed up. Run the script daily via cron, with the backup directory outside the web root:

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
