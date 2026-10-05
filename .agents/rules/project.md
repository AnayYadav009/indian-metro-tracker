---
trigger: always_on
---

# Project: Indian Metro Network Tracker

## Always read first
@C:/Anay/Programming/Projects/indian-metro-tracker/docs/BLUEPRINT.md
@C:/Anay/Programming/Projects/indian-metro-tracker/docs/MILESTONES.MD

## Hard constraints
- Everything must be FREE: no paid APIs, no API keys with billing, no database in v1.
- Stack: Next.js (App Router) + TypeScript, Tailwind, shadcn/ui, MapLibre GL JS via react-map-gl, Zustand, Zod, Vitest, Playwright.
- Next.js static export (`output: "export"`). No runtime server dependencies.
- Basemap URL lives in ONE config constant. OSM attribution must always be visible.

## Data rules
- Model SEGMENTS (LineString) with their own status/phase; stations are Points. Follow the schema in BLUEPRINT.md exactly.
- `phase` is a string validated per city, not a fixed enum.
- Three line layers by status: operational solid, construction dashed, planned dotted. Never rely on color alone.
- All data goes through the single loader in /lib/data.ts. Mock data records have "source": "mock".
- Adding a city must need ZERO code changes, only data files.

## Working rules
- Work on ONE milestone at a time. Do not start the next milestone.
- Produce an implementation plan and wait for my approval before writing code.
- Run lint, type-check, and tests before declaring a milestone done, and report results.
- Ask me before adding any dependency that is not in the approved stack.
- Never invent real-world metro facts. If real data is unknown, use clearly marked mock data.