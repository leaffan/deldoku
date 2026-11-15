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

## Technology Stack

- **Framework**: SvelteKit 2
- **Styling**: TailwindCSS 4
- **TypeScript**: For type safety
- **Build Tool**: Vite
- **Package Manager**: pnpm

## License

MIT
