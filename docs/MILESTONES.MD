#	Milestone	Scope change
1	Setup & Boilerplate	Add static export config and a GitHub Pages/Cloudflare deploy workflow
2	Map Canvas Integration	Free basemap via a single config constant; add OSM attribution
3	Data Schema & Mock Data	Tier 1 cities only, 2+ segments per status, 2+ phases, DATA_SOURCE flag
4	Layer Rendering & Filter UI	Unchanged
5	Interactions & Metadata Panels	Unchanged
6	Styling, Legend & Polish	Add the "data is illustrative/mock" banner whenever DATA_SOURCE=mock
7	Real Data Pipeline (run after the UI is stable)	Overpass fetch script, normalizer, override-merge step, schema validation, then onboard Tier 1 cities one at a time, starting with Delhi. Each city must pass validate:data before merging.