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

### Quality & Verification Scripts

- **Run unit tests**: `npm test`
- **Run unit tests in watch mode**: `npm run test:watch`
- **Run E2E tests**: `npm run test:e2e`
- **Type check**: `npm run typecheck`
- **Lint code**: `npm run lint`
- **Format code**: `npm run format`
- **Validate dataset**: `npm run validate:data`
- **Run Overpass pipeline**: `npm run pipeline:all`
- **Build static export**: `npm run build`

## Project Rules & Hard Constraints

- **Strictly Free**: No paid APIs, no API keys requiring billing, no server-side databases.
- **Static Export**: Zero runtime server dependencies; pure static deployment.
- **Segment Modeling**: Transit lines are modeled as contiguous LineString segments to accurately reflect partial openings and phase rollouts.
- **Milestone Discipline**: Developed one milestone at a time with strict acceptance testing.
