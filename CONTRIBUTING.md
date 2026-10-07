# Contributing Guidelines

Thank you for contributing to the Indian Metro Network Tracker. Please adhere to these quality and architectural standards when modifying the codebase.

## 1. Core Constraints & Invariants

- **Strictly Free Dependencies**: Never introduce paid APIs, services with mandatory billing, or proprietary runtime map services.
- **Pure Static Export**: The web application must build with `next build` targeting a static export (`output: "export"`). No Node.js runtime servers or serverless runtime endpoints are permitted.
- **Data Invariants**:
  - All stations and segments must strictly possess a valid `city_id` matching an entry in `data/cities.json`.
  - Station coordinates must strictly align within their city's bounding box margins.
  - Segments are contiguous `LineString` features representing operational, under-construction, or planned transit lines.
  - Zero modifications to active data files (`data/*.json`, `data/*.geojson`) without running through the pipeline and audit checks.

## 2. Code Quality & Conventions

- **Centralized Constants & Symbology**:
  - Reference status colors, line dash patterns, and badges from `lib/metro-styles.ts`. Never hardcode ad-hoc status color hex values or dynamic class interpolations that risk Tailwind purging.
  - Keep map zoom thresholds and MapLibre configurations centralized in `lib/map-config.ts`.
- **Imports & Types**:
  - Canonical type definitions reside in `types/schema.ts` (Zod schemas and inferred types) and `types/metro.ts` (convenience interfaces).
  - Use `@/` absolute aliases for imports across the app.
- **Dead Code & Duplication**:
  - Keep duplicated blocks to a minimum. Run `npx jscpd components lib hooks --threshold 2` before submitting PRs.
  - Clean up obsolete files and unused exports promptly.

## 3. Verification Workflow

Before submitting changes, run the following verification checks:

```bash
# 1. Type check
npm run typecheck

# 2. Linting
npm run lint

# 3. Unit and integration tests
npm test

# 4. Production build
npm run build

# 5. Data validation and audit
npm run validate:data
npm run audit:data
```

Ensure all 182+ tests pass, linting completes with 0 errors, and no regressions are introduced into the data audit report.
