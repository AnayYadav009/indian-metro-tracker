# Indian Metro Network Tracker

An interactive web-based map visualizing the past, present, and future of every metro rail transit system in India. The application renders metro lines and stations on a unified pan-and-zoom map, visually encoding operational status (solid for operational, dashed for under-construction, and dotted for planned/proposed), color-coded by development phase, and offering interactive inspector panels for deep dive transit metadata.

## Tech Stack

- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Data Validation**: Zod
- **Map Engine** _(Milestone 2+)_: MapLibre GL JS via react-map-gl
- **Basemap** _(Milestone 2+)_: Free OpenFreeMap vector basemap
- **Testing**: Vitest (Unit/Integration) + Playwright (E2E)
- **Deployment**: Next.js static export (`output: "export"`) deployed automatically via GitHub Pages

## Project Structure

```text
├── app/                  # Next.js App Router layout, global styles, and pages
├── components/
│   ├── map/              # Map canvas, layers, markers, and controls
│   ├── filters/          # City, status, and phase filter controls
│   ├── panels/           # Station and line metadata detail panels
│   └── ui/               # shadcn/ui primitives
├── data/                 # GeoJSON datasets (segments, stations, lines, cities)
├── docs/                 # Architectural blueprint and milestone tracking
├── e2e/                  # Playwright end-to-end tests
├── lib/                  # Data loaders, GeoJSON helpers, and utilities
├── scripts/              # Data normalization and verification scripts
├── store/                # Zustand global state slices
├── types/                # TypeScript type definitions and Zod schemas
└── __tests__/            # Vitest unit and integration test suites
```

## Getting Started

### Prerequisites

- Node.js 18.18+ or 20+ (tested on Node.js 24)
- npm 9+

### Installation

Clone the repository and install dependencies:

```bash
npm install
```

### Development Server

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- **`npm run dev`**: Start the Next.js local development server (`next dev`).
- **`npm run build`**: Build the production static export (`next build`) to the `out/` directory.
- **`npm start`**: Serve the static export locally with path traversal protection (`node scripts/serve.mjs`).
- **`npm run lint`**: Lint source files with ESLint (`eslint .`).
- **`npm run format`**: Format codebase using Prettier (`prettier --write .`).
- **`npm run typecheck`**: Run TypeScript compiler type checking without emitting files (`tsc --noEmit`).
- **`npm test`**: Run Vitest unit and integration test suite (`vitest run`).
- **`npm run test:watch`**: Run Vitest in interactive watch mode (`vitest`).
- **`npm run test:e2e`**: Run Playwright end-to-end browser tests (`playwright test`).
- **`npm run validate:data`**: Validate datasets against Zod schemas and relational rules (`tsx scripts/validate-data.ts`).
- **`npm run pipeline:fetch`**: Fetch raw OSM transit elements via Overpass API (`tsx scripts/pipeline/fetch-overpass.ts`).
- **`npm run pipeline:build`**: Normalize, merge overrides, and build dataset for a city (`tsx scripts/pipeline/build-real-data.ts`).
- **`npm run pipeline:all`**: Run full pipeline build across all configured cities (`tsx scripts/pipeline/build-all.ts`).

## Project Rules & Hard Constraints

- **Strictly Free**: No paid APIs, no API keys requiring billing, no server-side databases.
- **Static Export**: Zero runtime server dependencies; pure static deployment.
- **Segment Modeling**: Transit lines are modeled as contiguous LineString segments to accurately reflect partial openings and phase rollouts.
- **Milestone Discipline**: Developed one milestone at a time with strict acceptance testing.

## Data Licence & Attribution

- **Geospatial & Transit Network Data**: Contains data from OpenStreetMap, available under the [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/). © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
- **Map Vector Tiles**: Sourced from [OpenFreeMap](https://openfreemap.org), licensed under open data terms.
- **Application Code**: MIT License.
