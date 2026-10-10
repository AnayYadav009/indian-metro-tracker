# Indian Metro Network Tracker

An interactive static map of India's metro networks: operational lines, construction, planned corridors, stations, interchanges, opening history, and source metadata.

The map uses line pattern as well as colour:

- solid: operational
- dashed: construction
- dotted: planned

The timeline can scrub historical years, include future corridors, and hide station markers without removing the map source. Search, city/status/phase filters, station and segment panels, URL deep links, and a station-visibility URL option are available in the current app.

## Technology

- Next.js App Router with TypeScript and static export
- React, Tailwind CSS, and Zustand
- MapLibre GL JS through `react-map-gl`
- Zod schemas and a pipeline that builds the generated datasets
- Vitest unit tests and Playwright browser tests
- GitHub Pages deployment through GitHub Actions

## Quick start

Requirements: Node.js 18.18 or newer and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

To build and serve the static export:

```bash
npm run build
npm start
```

The export is written to `out/` and `npm start` serves that directory with the repository's static server.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Copy the local MapLibre worker, then start Next development mode. |
| `npm run build` | Copy the worker, validate data, and build the static export. |
| `npm start` | Serve `out/` locally with `scripts/serve.mjs`. |
| `npm run lint` | Run ESLint. |
| `npm run format` | Format the repository with Prettier. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:e2e` | Run Playwright tests against the configured server. |
| `npm run validate:data` | Validate schemas, IDs, foreign keys, and relational data rules. |
| `npm run pipeline:fetch` | Fetch or refresh raw OSM/Overpass city data. |
| `npm run pipeline:build` | Build a real city dataset from raw data and overrides. |
| `npm run pipeline:all` | Build all configured city datasets. |
| `npm run audit:dedupe` | Report possible station deduplication clusters. |
| `npm run audit:links` | Check HTTP references in data and reference files. |
| `npm run audit:data` | Run the read-only consistency audit and write dated reports. |

`predev`, `prebuild`, and `postinstall` are lifecycle hooks that copy local MapLibre worker assets; `prebuild` also runs data validation.

## Project structure

```text
app/                 Next.js routes and page
components/          Map, filters, timeline, legend, panels, and UI
data/                Generated datasets, raw inputs, references, overrides, and fixtures
docs/                Architecture, standards, audit, onboarding, and milestones
e2e/                 Playwright browser tests
hooks/               React hooks, including URL synchronization
lib/                 Data, geometry, style, filter, and validation helpers
reports/             Audits and QA artifacts
scripts/             Pipeline, audit, validation, and local-server tools
store/               Zustand application state
types/               Domain types and Zod schemas
__tests__/           Vitest tests
```

## Data workflow

Generated files in `data/` are never hand-edited. Corrections belong in `data/overrides/<city>.json`; reference facts belong in `data/reference/<city>.json`; raw Overpass responses are pipeline inputs.

Typical workflow:

```bash
npm run pipeline:fetch -- --city=delhi --force
npm run pipeline:build -- --city=delhi
npm run validate:data
npm run audit:data
```

Unknown facts remain `null` and produce an audit warning. Every non-OSM value needs a source URL and a human verification date. Construction and planned geometry must be labelled honestly as exact or schematic according to the available evidence. See [`docs/DATA-STANDARDS.md`](docs/DATA-STANDARDS.md), [`docs/DATA_AUDIT.md`](docs/DATA_AUDIT.md), and [`docs/DATA_CONTRIBUTING.md`](docs/DATA_CONTRIBUTING.md).

## Verification

Before submitting a change, run:

```bash
npm run lint
npm run typecheck
npm test
npm run validate:data
npm run build
npm run test:e2e
npm run audit:data
```

The local audit intentionally fails for uncorrected errors and un-baselined warnings; baselines must not be used to hide data problems. CI runs the same audit in warning report-only mode, so un-baselined warnings remain visible in the generated report while errors still fail the quality gate. Current audit status is reported in the latest dated report under [`reports/data-audit/`](reports/data-audit/).

## Screenshots and attribution

Existing QA screenshots are retained under [`reports/data-audit/`](reports/data-audit/). They are diagnostic artifacts, not a substitute for current visual verification.

Network geometry and station data are derived from OpenStreetMap, © OpenStreetMap contributors, under the Open Database License (ODbL). Map tiles are provided by OpenFreeMap. See [`docs/DATA-LICENSE.md`](docs/DATA-LICENSE.md).

Application code is licensed under the MIT License; see [`LICENSE`](LICENSE).

## Contributing

Please read [`CONTRIBUTING.md`](CONTRIBUTING.md), [`docs/DATA_CONTRIBUTING.md`](docs/DATA_CONTRIBUTING.md), and [`SECURITY.md`](SECURITY.md). Data corrections must include a source, and generated data must be rebuilt through the pipeline.
