1. Executive Project Objective

Build "Indian Metro Network Tracker", an interactive, web-based map that visualizes the current state of every metro rail system in India.

The app renders each metro line on a single pan-and-zoom map, encoding three things at a glance:

Status through line style: operational lines are solid, under-construction lines are dashed, and planned/proposed lines are dotted.
Phase through color: operational lines can be filtered and color-coded by the phase in which they were planned and inaugurated (e.g. Delhi Phase I–IV, Bengaluru Phase 1/2/2A/2B/3).
Detail through interaction: clicking any line or station opens a metadata panel (status, phase, length, expected completion, and more).

Success criteria for agents:

All three statuses are visually distinguishable at a glance, without relying on color alone.
Filters (city, status, phase) update the map instantly (<100 ms) with no page reload.
The app is responsive and usable on mobile.
The data layer is cleanly separated from the UI, so real data can replace mock data without touching components.

Non-goals (v1): live train tracking, route planning or fare calculation, user accounts.

2. Optimal Tech Stack
Layer	Choice	Rationale
Framework	Next.js (App Router) + TypeScript	Full-stack in one repo; API routes or static data serving; easy deployment
Map engine	MapLibre GL JS via react-map-gl (react-map-gl/maplibre)	WebGL rendering handles many polylines smoothly; supports line-dasharray, data-driven styling, and feature-state (hover/select); open source with no token or billing
Basemap	A free vector style (e.g. OpenFreeMap or a MapTiler free tier) with a light, muted look	Muted basemaps make colored transit lines stand out
Styling/UI	Tailwind CSS + shadcn/ui	Fast, consistent filter panels, drawers, and legends
State	Zustand	Lightweight store for filters and selected feature
Data (v1)	Static GeoJSON files in /data, validated with Zod	No database needed for a read-mostly dataset
Data (v2, optional)	PostgreSQL + PostGIS, served through Next.js route handlers	Only if you need an admin panel or frequent updates
Testing	Vitest (data validation, filter logic) + Playwright (map interactions)	Gives Antigravity's agents something concrete to run
Deploy	Vercel	Zero-config for Next.js

Why MapLibre over Leaflet: Leaflet renders each polyline as an SVG/DOM element, which gets sluggish with many stations and lines. MapLibre uses WebGL and layer-level filters, which suits this use case better.

Why not Mapbox GL JS: it's equivalent technically, but requires an access token and usage-based billing. MapLibre is API-compatible and free. Switching later would be a small change.

Implementation note for agents: MapLibre's line-dasharray is not data-driven, so a single layer cannot style solid, dashed, and dotted lines from a property. Use three separate line layers, one per status, each with a filter on status and a shared data-driven line-color:

operational → solid
construction → line-dasharray: [4, 2]
planned → line-dasharray: [0.1, 2] with line-cap: round (renders as dots)
3. Data Architecture Strategy
Core design decision: model segments, not whole lines

A single metro line is often partly open, partly under construction, and partly planned (for example, a line opened in stretches over several years). If status lives only on the line, you can't draw that correctly. So:

Line = a logical named route (e.g. "Yellow Line"). It holds shared metadata.
Segment = a contiguous stretch of a line with its own status, phase, and dates. Segments are the GeoJSON LineString features that get drawn.
Station = a Point feature linked to a line and (ideally) a segment.
Files
/data
  segments.geojson   # FeatureCollection<LineString>
  stations.geojson   # FeatureCollection<Point>
  lines.json         # Line-level metadata (id, name, city, color)
  cities.json        # City-level metadata (name, bbox, operator, phase list)
segments.geojson feature schema
json
{
  "type": "Feature",
  "geometry": { "type": "LineString", "coordinates": [[77.20, 28.63], [77.22, 28.64]] },
  "properties": {
    "segment_id": "del-yellow-seg-01",
    "line_id": "del-yellow",
    "line_name": "Yellow Line",
    "city": "Delhi",
    "operator": "DMRC",
    "status": "operational",
    "phase": "I",
    "length_km": 12.3,
    "gauge": "standard",
    "inaugurated_on": "2004-12-20",
    "expected_completion": null,
    "stations_count": 11,
    "color": "#FFD700",
    "source": "TBD",
    "last_verified": "2026-10-05"
  }
}
stations.geojson feature schema
json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [77.2090, 28.6139] },
  "properties": {
    "station_id": "del-rajiv-chowk",
    "name": "Rajiv Chowk",
    "city": "Delhi",
    "line_ids": ["del-yellow", "del-blue"],
    "status": "operational",
    "phase": "I",
    "is_interchange": true,
    "opened_on": "2005-01-01",
    "expected_completion": null,
    "layout": "underground"
  }
}
Field rules (enforce with a Zod schema)
status: enum "operational" | "construction" | "planned"
phase: string, not a fixed I | II | III enum. Phase systems differ per city (Bengaluru uses "1", "2", "2A", "2B", "3"; Delhi runs to Phase IV and beyond), so define the allowed phases per city in cities.json and validate against that.
inaugurated_on: required if status = operational, otherwise null
expected_completion: YYYY-MM or YYYY; required if status = construction, optional if planned
length_km: number, sanity-checked against computed geometry length (flag >10% mismatch)
color: hex; the phase color palette is applied at runtime from a lookup table, not hardcoded per feature
Coordinates are [lng, lat] in WGS84 (GeoJSON standard)
Data sourcing (for the real-data stage)

Candidate sources are OpenStreetMap (via Overpass API, which has railway=subway/light_rail geometry), official operator and ministry sites (DMRC, BMRCL, MMRDA, CMRL, KMRCL, etc.), and Wikipedia for phase and date cross-checks. Metro status changes frequently, so every record should carry source and last_verified fields, and the UI should show a "Data last updated" note.