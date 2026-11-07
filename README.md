# Echos

A free practice companion for students of Byzantine chant: the scales of every genus in moria, the eight modes with their intonations, an ison and a metronome. Works offline in the browser and installs on a phone. Interface in English and Greek.

Status: planning. See the issues for the spec and the build plan.

## Running and publishing

- `npm run dev` starts the app for development; `npm test` runs the tests.
- `npm run build` makes the installable, offline app in `dist/` (relative paths, a service worker that precaches every file).
- Every push to `main` is tested, built and published to GitHub Pages by `.github/workflows/deploy.yml`. One-time setup: Settings → Pages → Source: GitHub Actions.

## Licenses

- Code: MIT (see `LICENSE`).
- Theory data (tuning systems, mode variants, intonations): CC BY-SA 4.0. Every value cites its source in the data (`src/core/theory/`), not on screen (ADR-0010).
- Neume font: Neanes (SBMuFL layout) from the Neanes project, [github.com/neanes/sbmufl](https://github.com/neanes/sbmufl), SIL Open Font License 1.1. Bundled unmodified in `src/assets/fonts` with its licence (`OFL.txt`); only the font is used, no Neanes code.
