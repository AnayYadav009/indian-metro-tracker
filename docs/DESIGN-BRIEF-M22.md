# M22 UI Design Brief: Public Usability & Mobile-First Shell

- **Author**: Antigravity (Pair Programming Agent)
- **Status**: Brief drafted, awaiting owner sign-off (M22)
- **Target Implementation**: Milestone M23 (UI Shell) through M26 (Acceptance)
- **Audience**: General public across India, predominantly using mid-range Android devices on variable 4G/slow mobile data.
- **Constraints**: 100% static export (Next.js SSG, no backend, no serverless functions, no paid services). Free basemap (OpenFreeMap + OSM attribution). High-performance geospatial rendering with MapLibre GL JS (<100ms filter latency). Zero unverified claims.

---

## 1. Goals and Non-Goals

### Goals
1. **Instant Clarity on Landing**: Within 2 seconds on mobile, user sees their city, can search any station or plan a route, and views the network on the map.
2. **Unified Mobile Bottom Sheet**: Replace the chaotic, overlapping stack of 4 floating panels (Header, Filter Panel, Metadata Panel, Timeline Slider) with a single, gesture-friendly, 3-state bottom sheet (Peek, Half, Full).
3. **Streamlined Information Architecture**: Remove 22 sprawling city chips and multiple redundant inputs. Introduce a clean searchable city selector + universal station search box. Secondary layers (Timeline scrubber, Phase filters, Comparison table, Attribution) tucked cleanly behind a "Layers / More" sheet.
4. **Transparent Trust & Provenance**: Disclose verification status honestly. No false claims like "verified geospatial" or "≥80% stations verified". One concise, non-intrusive "About this data" disclosure per sheet with source links and operator attribution.
5. **Thumb-Friendly Touch Targets**: Ensure minimum 44×44 px touch targets for all primary mobile actions.
6. **Zero Regression for Routing & Geo Features**: Fully reserve layouts for M24 (Route Finder v2 with distance-band fares and first/last trains) and M25 (Nearest station geolocation and walking directions).

### Non-Goals
1. **No Live Vehicle Tracking / Real-Time Arrivals**: Static site cannot stream live telemetry.
2. **No User Accounts / Bookmarks / Auth**: No database, no cookies, no tracking.
3. **No Dynamic Backend or Paid APIs**: No Google Maps API, no Mapbox API, no routing engines requiring server compute. All routing and geocoding run client-side in pure TypeScript / WebAssembly.
4. **No New Geometry or Unverified Cities**: Data remains strictly within the current 21-city scope validated in M21c.
5. **No Multilingual Localization in M23**: Hindi and regional language support are parked for later milestones (UI text stays clean, plain English with transit conventions).

---

## 2. Key User Journeys

Comparison of user steps and tap counts between today's measured UI and the proposed M23/M24 design:

| Journey | Today's Measured Path | Today Taps | Proposed Path (M23/M24) | Proposed Taps |
| :--- | :--- | :---: | :--- | :---: |
| **(a) Route from A to B in my city** | 1. Tap "Route" in header nav<br>2. Select city in dropdown<br>3. Tap origin input & type<br>4. Select origin match<br>5. Tap dest input & type<br>6. Select dest match | **6 taps** | 1. Tap Search box on bottom sheet<br>2. Type station name (or select "Route")<br>3. Pick destination from sheet | **3 taps** |
| **(b) Nearest station to me** | 1. Tap "Nearest" in header nav<br>2. Browser prompts permission<br>3. View results list (if granted) | **2 taps** | 1. Tap "Nearby" shortcut button on sheet<br>2. Browser prompts permission | **1 tap** |
| **(c) Check station details** | 1. Pan/zoom map or scroll 22 city chips to find city<br>2. Tap city chip<br>3. Tap station marker on map | **3–4 taps** | 1. Type station name in universal search box<br>2. Tap result (auto-centers map & opens Half sheet) | **2 taps** |
| **(d) Fare estimate & first/last train** | *Not available in UI yet* (Model ready in M21c). Today: 0 | N/A | Calculated automatically in Journey (a) route result card. For Delhi, shows band estimate (e.g. ₹43); for unverified cities, row is completely hidden. | **0 extra taps** |
| **(e) Report an error** | 1. Open station/segment (2)<br>2. Scroll past data table (1)<br>3. Click "Report an error" (1) | **4 taps** | 1. Open station or route card (1–2)<br>2. Tap persistent flag icon "Report error" at bottom of sheet (1) | **2 taps** |
| **(f) Compare cities (secondary)** | 1. Tap "Compare" in top header nav pill | **1 tap** | 1. Tap "Layers / More" icon<br>2. Tap "Compare Networks" | **2 taps** (demoted to secondary) |

---

## 3. Information Architecture & Wireframes

### Proposed Landing View
1. **Top Bar**: Minimalist, sticky, 48px height. Contains "IM" Logo, Title ("Indian Metro Tracker"), City Switcher button (showing current city or "All Cities"), and a "Layers / More" drawer button.
2. **Interactive Map**: Dominates the viewport, edge-to-edge.
3. **Mobile Bottom Sheet**: Fixed at the bottom of the screen.
   - **Peek State (64px)**: Search bar: `🔍 Search stations, lines...` + `[Nearby]` quick-action icon.
   - **Half State (40% viewport height)**: Quick transit actions (Find Route, Browse Lines, Nearby Stations).
   - **Full State (85% viewport height)**: Complete search results, active station sheet, or route step-by-step instructions.
4. **Secondary Features ("Layers / More" Menu)**:
   - Timeline Scrubber (Year slider + Play button)
   - Status Filters (Operational, Construction, Planned)
   - Phase Filters (Phase I, II, III, IV)
   - Compare Cities Link & City Directory
   - Basemap & Data Attribution

---

### ASCII Wireframes

#### Desktop View (1280 × 800)
```text
+----------------------------------------------------------------------------------------------------+
| [IM] Indian Metro Network Tracker   [ Delhi (DMRC) v ]   [🔍 Search any station...        ]   [Layers] |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|   +----------------------------+                                                                   |
|   | ROUTE / STATION PANEL      |                                                                   |
|   |----------------------------|                                     [MAP CANVAS - FULL VIEW]      |
|   | From: Kashmere Gate        |                                                                   |
|   | To:   Rajiv Chowk          |                                            (Kashmere Gate)        |
|   |----------------------------|                                                   \               |
|   | 14 min · 5 stops · Direct  |                                                    \ Yellow Line  |
|   | Fare: Rs 32 (Mon-Sat est.) |                                                     \             |
|   |----------------------------|                                                 (Rajiv Chowk)     |
|   | • Kashmere Gate (Platform) |                                                                   |
|   | • Chandni Chowk            |                                                                   |
|   | • Chawri Bazar             |                                                                   |
|   | • New Delhi (Interchange)  |                                                                   |
|   | • Rajiv Chowk (Exit Gate)  |                                                                   |
|   |----------------------------|                                                                   |
|   | ℹ About this data [v]      |                                                                   |
|   | [!] Report an error        |                                                                   |
|   +----------------------------+                                                                   |
|                                                                                                    |
|                                              +----------------------------------+  [Legend]        |
|                                              | [Play] Year: 2026 ======o======  |  Data: Oct 2026  |
|                                              +----------------------------------+  (C) OSM         |
+----------------------------------------------------------------------------------------------------+
```

#### Mobile Landing View (Pixel 7 / 360–412 px)
```text
+------------------------------------------+
| [IM] Indian Metro Tracker  [Delhi v] [=] |  <-- Top Bar (48px)
+------------------------------------------+
|                                          |
|                                          |
|                 MAP AREA                 |
|                                          |
|           o Kashmere Gate                |
|            \                             |
|             \ Yellow Line                |
|              \                           |
|               o Rajiv Chowk              |
|                                          |
+------------------------------------------+
|  ====== [ DRAG HANDLE ] ======           |
|  [ 🔍 Search stations, lines... ] [Nearby|  <-- Peek Sheet (64px)
+------------------------------------------+
```

#### Mobile Station Selected (Half Sheet, ~40% Screen)
```text
+------------------------------------------+
| [IM] Indian Metro Tracker  [Delhi v] [=] |
+------------------------------------------+
|                 MAP AREA                 |
|               (Centered)                 |
+------------------------------------------+
|  ====== [ DRAG HANDLE ] ======           |
|  KASHMERE GATE                 [Share][X]|
|  Interchange Station · Underground       |
|  --------------------------------------- |
|  Lines: [Red Line] [Yellow Line] [Violet]|
|  Status: Operational (Phase I)           |
|  [ Directions To ]    [ Directions From ]|
|  --------------------------------------- |
|  > About this data (DMRC / OSM)          |
|  [!] Report an error with this station   |
+------------------------------------------+
```

#### Mobile Route Result (Full Sheet, ~85% Screen)
```text
+------------------------------------------+
|  ====== [ DRAG HANDLE ] ======           |
|  <- Route Result                      [X]|
|  Kashmere Gate -> Rajiv Chowk            |
|  ======================================= |
|  14 min · 5 stops · 0 transfers          |
|  Fare: Rs 32 (Mon-Sat estimate)*         |
|  --------------------------------------- |
|  (O) Kashmere Gate (Yellow Line)         |
|   |  Chandni Chowk                       |
|   |  Chawri Bazar                        |
|   |  New Delhi (Airport Link)            |
|  (*) Rajiv Chowk (Arrived)               |
|  --------------------------------------- |
|  * Fare estimate based on DMRC distance  |
|    bands. Timetable not verified.        |
|  > About this data (Status: Verified)    |
|  [!] Report an error on this route       |
+------------------------------------------+
```

#### Mobile "Layers / More" Drawer (Slide-over from Right or Modal Sheet)
```text
+------------------------------------------+
|  Layers & Settings                    [X]|
|  ======================================= |
|  MAP LAYERS                              |
|  [x] Operational Lines (Solid)           |
|  [x] Under Construction (Dashed)         |
|  [ ] Planned Lines (Dotted)              |
|  [x] Show Station Dots                   |
|  --------------------------------------- |
|  TIMELINE SCRUBBER                       |
|  [Play] Year: 2026 (1,010 km open)       |
|  1984 ----------------------o 2026       |
|  --------------------------------------- |
|  EXPLORE                                 |
|  -> City Metro Directory (21 cities)     |
|  -> Nationwide Comparison Dashboard      |
|  --------------------------------------- |
|  DATA & CREDITS                          |
|  Sources: DMRC, BMRCL, OpenStreetMap     |
|  Basemap: OpenFreeMap (ODbL)             |
+------------------------------------------+
```

---

## 4. Mobile Bottom Sheet Specification

A single responsive bottom sheet component (`components/sheet/bottom-sheet.tsx`) replaces the four floating, overlapping panels.

### Sheet States
1. **Peek State (`h-16`, 64px above safe-area)**:
   - Default resting state on initial load.
   - Contains drag indicator handle, input-styled search trigger button (`Search stations, lines...`), and quick-action icon (`[Nearby]`).
   - Leaves 90% of screen height completely clear for map exploration and gestures.
2. **Half State (`40vh` to `50vh`)**:
   - Triggered when user selects a station/segment or opens a basic feature.
   - Displays station summary, line chips, operational status, and "Route to / from" actions.
   - Map automatically pads/offsets center point to remain visible in the top 50vh.
3. **Full State (`85vh` to `90vh`)**:
   - Triggered on search input focus, active route calculation results, or expanding station details.
   - Supports internal vertical scrolling (`overflow-y-auto`).
   - Never covers 100% of the screen so user always retains spatial awareness of the map behind a dimmed backdrop.

### Interaction & Gesture Physics
- **Drag Handle**: Visual pill (36×4 px, `bg-slate-700`) centered at top of sheet. Supports touch pan gestures (`onTouchStart`, `onTouchMove`, `onTouchEnd`) with velocity detection. Swiping down snaps from Full -> Half -> Peek.
- **Map Interaction**: Touching/dragging the map while sheet is in Half state does *not* dismiss the sheet, allowing users to inspect neighboring stations. Tapping an empty area of the map snaps sheet down to Peek.
- **Hardware / Browser Back Button**:
  - Full State -> Snaps to Half (or Peek if Full was entered from Peek).
  - Half State with feature selected -> Clears selection and snaps to Peek.
  - Peek State -> Standard browser history pop (returns to previous city or page).
- **Search Focus & Soft Keyboard**:
  - Tapping search input immediately transitions sheet to Full State (`85vh`) before focusing the input, preventing layout viewport jumps on Android mobile Chrome when the virtual keyboard pops up.
  - Safe area padding (`env(safe-area-inset-bottom)`) applied to bottom of sheet.

---

## 5. Trust and Provenance Presentation

Most records in the dataset (segments and stations) are currently **Unverified** (OSM geometry without an official signed-off survey). A massive footer on every panel causes banner fatigue and visual noise.

### Presentation Rules
1. **Single "About this data" Collapsible Disclosure**:
   - Rendered as a compact expandable accordion row at the bottom of the active sheet.
   - Displays a clean status chip in the header:
     - `Verified` (Green pill: official operator verification)
     - `Schematic` (Amber pill: hand-drawn/construction alignment)
     - `Unverified` (Slate pill: OpenStreetMap community data, unofficial)
2. **Strict Use of the Word "Verified"**:
   - The word "verified" MUST NEVER appear in marketing copy, titles, or subtitles (e.g. "verified geospatial data").
   - It appears exclusively as an exact status token: `Status: Verified` or `Status: Unverified`.
3. **Multi-Line Station Rule (Weakest Status Wins)**:
   - If an interchange station serves lines with differing provenance statuses (e.g., Delhi Yellow Line verified, Green Line unverified), the station card MUST display the **weakest** status (`Unverified`) with a breakdown in disclosure: *"Yellow Line: Verified (DMRC) · Green Line: Unverified (OSM)"*.
4. **Fare Scope & Estimate Label**:
   - Fares MUST carry day scope and estimate qualifier: e.g. `₹43 (Mon–Sat estimate)`.
   - Near-band warning: If calculated distance is within 500 meters of a fare band boundary, show footnote: *"Near band edge (11.8 km): may be ₹32 or ₹43 depending on operator route calculation"*.
5. **Zero-Data Gating**:
   - If a city has no verified fare rule (e.g. Mumbai, Bengaluru), the fare section is completely omitted. No `"N/A"`, no `"TBD"`, no estimate.
   - If service hours are 0 / unverified, the first/last train section is completely omitted.

---

## 6. Interchange Highlighting (M25 Spec)

For implementation in Milestone M25:
1. **Map Visualization**:
   - Interchange stations rendered with concentric dual-ring markers (outer ring white/accent, inner ring line colors).
   - Distinctive icon or glyph at zoom levels ≥ 12.
2. **Route Steps**:
   - Interchange points explicitly flagged with a badge: `🔄 Transfer at Rajiv Chowk`.
   - Specific transfer instructions: *"Change from Yellow Line (Platform 2) to Blue Line (Platform 3). Allow ~4 min transfer time."*
   - Walking transfer notes (e.g. Sikanderpur interchange between DMRC Yellow Line and Gurugram Rapid Metro) highlighted with separate ticketing warning.
3. **Station Sheet**:
   - Lists all intersecting lines as tappable color-coded badges.
   - If interchange connects different operators (e.g., DMRC and NMRC at Noida Sector 52/51), display: *"Cross-operator interchange: Requires exiting fare gates and separate ticketing"*.

---

## 7. Route Result Card (M24 Spec)

To ensure the M23 UI shell reserves proper container space, the Route Result Card spec is defined:

```text
+-----------------------------------------------------------+
| [<- Back]  Route Details                          [Share] |
|-----------------------------------------------------------|
| Kashmere Gate -> Rajiv Chowk                              |
| 14 min (est.) · 5 stations · Direct (0 transfers)         |
| Fare: Rs 32 (Mon-Sat estimate)*                           |
|-----------------------------------------------------------|
| [o] Kashmere Gate                                         |
|  |  Yellow Line towards Millennium City Centre Gurugram   |
|  |  Chandni Chowk                                         |
|  |  Chawri Bazar                                          |
|  |  New Delhi (Interchange for Airport Express)           |
| [*] Rajiv Chowk                                           |
|-----------------------------------------------------------|
| * Separate tickets required for Airport Express line.     |
| ℹ About this calculation: 32 km/h avg speed · DMRC bands |
| [!] Report an error on this route                         |
+-----------------------------------------------------------+
```

Required Fields:
- Total estimated duration (minutes, calculated at standard 32 km/h).
- Total station stop count.
- Transfer count.
- Sourced fare estimate with day scope (hidden if city unsourced).
- "Separate tickets" caveat where applicable.
- Ordered stop list with line badge and interchange markers.
- Report an error link prefilled with origin and destination IDs.

---

## 8. Copy Inventory (M23 Text Replacements)

Audit of all user-visible text requiring correction in M23:

| Location | Current Text | Proposed Wording | Reason |
| :--- | :--- | :--- | :--- |
| `components/filters/network-stats.tsx`, `components/legend/map-legend.tsx` | `Data: Oct 2026 (MANUAL, OSM)` / `(DMRC, BMRCL, OSM)` | `Data updated: Oct 2026` (Clicking opens Data Sources list) | Current badge implies all data from those operators is verified, which is false. |
| `app/compare/page.tsx:280` | `...comprehensive verified geospatial statistics...` | `...compiled transit statistics and geospatial alignment data...` | Violates hard rule: only a fraction of data is verified. |
| `lib/city-seo.ts:35` | `...verified track alignments and station counts...` | `...mapped track alignments and station counts...` | Removes false claim in meta descriptions. |
| `app/city/[id]/page.tsx:220` | `≥80% stations verified` | `≥80% stations opened for commercial service` | Conflates "opened" with "verified provenance". |
| `components/routing/route-finder-panel.tsx:14` | `verified lines` | `routable lines` | Refers to topological graph connectivity, not operator provenance verification. |
| `components/panels/station-detail.tsx`, `segment-detail.tsx` | `Feature data date: Oct 2026` | `Record retrieved: Oct 2026` | Clarifies machine scrape date vs official publication date. |
| `components/filters/filter-panel.tsx:90` | Placeholder: `Search lines, phases, stations...` | Placeholder: `Search lines, phases...` (or full station search once wired) | Current search does NOT search stations at all. |

---

## 9. Accessibility (a11y) Specifications

1. **Keyboard Navigation & Order**:
   - Logical tab flow: Top bar (Logo -> City Switcher -> Layers button) -> Search input -> Quick action buttons -> Bottom sheet content -> Map canvas controls.
   - Escape key: Closes open dropdowns, collapses Full sheet to Half/Peek, dismisses modals.
2. **Focus Management**:
   - When bottom sheet transitions to Full state via search click, focus automatically shifts to input.
   - Closing modals (City Directory, Layers) returns focus to triggering element.
3. **Screen Reader (ARIA) Labels**:
   - Bottom sheet has `role="region" aria-label="Transit station and route information"`.
   - Drag handle has `aria-label="Drag sheet to expand or collapse"`.
   - Line colors accompanied by descriptive text: `Yellow Line (Operational)` rather than just a colored circle.
4. **Touch Target Sizing**:
   - All interactive touch targets (buttons, links, search triggers, city chips) must be at least **44 × 44 CSS pixels** on mobile.
5. **Contrast & Color Independence**:
   - Statuses distinguished by line stroke styles (Solid = Operational, Dashed = Under Construction, Dotted = Planned) in addition to color.
   - Text contrast ratio ≥ 4.5:1 against `slate-900` / `slate-950` backgrounds.
6. **Reduced Motion**:
   - Respect `prefers-reduced-motion: reduce`: disable sheet spring transitions and map flyTo animations when enabled.

---

## 10. Performance Budgets (Relative to M21c Baseline)

### Baseline (Part 1.6 Measurements from `npm run build`)
- **Total First Load Shared JS**: `103 kB`
- **Route `/` (Home)**: `27.6 kB` page chunk (`267 kB` First Load JS)
- **Route `/compare`**: `22.3 kB` page chunk (`259 kB` First Load JS)
- **Route `/city/[id]`**: `2.78 kB` page chunk (`114 kB` First Load JS)
- **Static Export**: 28 pages pre-rendered.

### Performance Budgets for M23 UI Shell
1. **First Load JS Budget for `/`**:
   - Must NOT exceed **+15 kB** over baseline (Budget: `< 282 kB` First Load JS).
2. **Lazy Loading Strategy**:
   - **Timeline Scrubber & Sparkline SVG**: Dynamically loaded via `next/dynamic` only when user opens "Layers / More" menu (`ssr: false`). Saves ~8 kB on initial landing bundle.
   - **Route Finder Algorithm & Graph**: Graph initialized on demand when user activates routing, not on first paint.
   - **Compare City Modal / Sheet**: Code split; loaded only when accessed.
3. **Filter Latency**:
   - Must remain `< 100 ms` on mid-range Android (Snapdragon 680 / Helio G99 benchmark). Map filters applied via `map.setFilter()` without recreating data sources.

---

## 11. Shared Top Bar Extraction Plan

Currently, `app/page.tsx`, `app/compare/page.tsx`, and `app/city/[id]/page.tsx` each duplicate header markup with divergent classes, logos, and badges.

### Extraction Plan for M23:
1. **Create `components/layout/app-header.tsx`**:
   - Single reusable header component.
   - Props:
     - `variant`: `"map"` | `"subpage"`
     - `title`: Optional custom title (defaults to "Indian Metro Tracker")
     - `activeCityId`: Optional current city
     - `showCityPicker`: Boolean
   - Standardized layout:
     - Left: "IM" Logo pill + Title.
     - Center/Right (Map view): City Switcher dropdown + "Layers / More" button.
     - Center/Right (Subpage view): `← Back to Map` button + Page title + Metadata badge.
2. **Benefits**:
   - Eliminates ~150 lines of duplicated JSX across the 3 route files.
   - Enforces uniform 48px height and consistent safe-area padding across all pages.

---

## 12. M23 Implementation Plan

Ordered, independently mergeable steps:

| Step | Scope | Files Touched | Tests Added / Updated |
| :---: | :--- | :--- | :--- |
| **M23.1** | Extract shared `AppHeader` component across all 3 pages | `components/layout/app-header.tsx`, `app/page.tsx`, `app/compare/page.tsx`, `app/city/[id]/page.tsx` | Unit tests for `AppHeader`. Verify existing `home.spec.ts` and `compare.spec.ts`. |
| **M23.2** | Implement searchable City Picker dropdown (replacing 22 chips) | `components/filters/city-select.tsx`, `components/filters/city-picker-combobox.tsx` | Unit test for search filtering. E2E test for city selection on desktop & mobile. |
| **M23.3** | Build responsive 3-state `BottomSheet` container | `components/sheet/bottom-sheet.tsx` | Component test for Peek/Half/Full states and touch gestures. |
| **M23.4** | Extract "Layers & Timeline" into secondary drawer | `components/layers/layers-drawer.tsx`, `components/timeline/timeline-slider.tsx` | Verify timeline tests pass in new drawer container. |
| **M23.5** | Integrate universal station search into bottom sheet | `components/search/station-search-input.tsx`, `lib/station-search.ts` | Unit tests for station fuzzy search. E2E test for selecting station from sheet. |
| **M23.6** | Re-mount Station & Segment details into bottom sheet | `components/panels/station-detail.tsx`, `components/panels/segment-detail.tsx` | Mobile viewport E2E test verifying zero overlap with map. |
| **M23.7** | Copy cleanup & provenance disclosure polish | All affected files from Section 8 | Update snapshot and text assertion tests. |

### Feature Relocation Mapping

| Feature | Today's Location | New Location in M23 Shell |
| :--- | :--- | :--- |
| **City Selection** | 22 horizontal/vertical chips in FilterPanel | Searchable combobox in Top Bar & Sheet |
| **Station Search** | Hidden in Route Finder panel only | Top of Mobile Bottom Sheet & Desktop Header |
| **Line / Phase Filters** | Always-visible left sidebar panel | "Layers / More" drawer |
| **Timeline Scrubber** | Floating bottom bar above map | "Layers / More" drawer (or toggleable overlay) |
| **Map Legend** | Floating bottom-right box | Collapsible button in bottom-right / Layers |
| **Station Details** | Left sliding overlay (overlaps filters on mobile) | Half / Full Bottom Sheet (replaces map clutter) |
| **Segment Details** | Left sliding overlay | Half / Full Bottom Sheet |
| **Route Finder** | Floating full-height side modal | Full Bottom Sheet card |
| **Nearest Station** | Separate modal panel | Dedicated tab inside Bottom Sheet |
| **Compare Cities** | Pill link in header | Top bar secondary action / Layers drawer |

---

## 13. Options and Open Questions

### Design Options
- **Option A (Recommended)**: Clean Map + Mobile Bottom Sheet. Landing shows map with searchable city picker in top bar and Peek bottom sheet with station search. All heavy secondary controls (timeline, filters, compare) move into "Layers". Maximum map visibility, instant station search, zero mobile panel stacking.
- **Option B (Alternative)**: Floating Card Interface (similar to Google Maps desktop). Floats a search and filter widget over top-left of map on both desktop and mobile.
  - *Trade-offs of Option B*: Clutters mobile screen; leaves less than 40% of viewport for map on 360px phones; causes keyboard resize bugs on mobile Android.

---

### Open Questions for Owner (Checklist)

- [ ] **Q1: City Selection Default**: Should the app remember the user's last selected city in `localStorage`, or stay 100% stateless (defaulting to Delhi or Nationwide view on each fresh visit)?
  - *Recommendation*: Stay stateless unless `?city=` query param is in URL; preserve the project rule forbidding `localStorage` without explicit approval.
- [ ] **Q2: Timeline Scrubber Placement**: Should the historical timeline scrubber live entirely inside the "Layers / More" menu, or retain a floating icon on the desktop map?
  - *Recommendation*: Move inside "Layers / More" on mobile; show a floating icon button on desktop.
- [ ] **Q3: Nationwide View vs Single City**: Should first load default to showing Delhi (the flagship network with sourced fares), or the nationwide map with all 21 cities?
  - *Recommendation*: Nationwide overview on first load with top 5 cities highlighted, prompting user to pick a city.
- [ ] **Q4: Station Search Scope**: Should the universal search box search across all cities simultaneously, or scope to the currently selected city?
  - *Recommendation*: If a city is active, rank that city's stations first, with other cities grouped below.
- [ ] **Q5: Phase Filter Retention**: Is the Phase filter (Phase I, II, III, IV) used frequently enough by the general public to keep in "Layers", or should it be removed from the primary UI?
  - *Recommendation*: Keep in "Layers" drawer under "Advanced Filters" for transit enthusiasts and researchers.
- [ ] **Q6: Fare Near-Band Proximity**: Should the route card show a near-band warning when distance is within 500m of a band threshold (e.g. 4.9 km on a 2-5 km band)?
  - *Recommendation*: Yes, add a subtle footnote *"Distance near fare threshold; actual station-to-station fare may vary by ±₹10."*
- [ ] **Q7: Bottom Sheet Snap Points**: Do you approve the 3 snap heights: Peek (64px), Half (45vh), Full (85vh)?
  - *Recommendation*: Yes, standard Android Material You snap ratios.
- [ ] **Q8: Shared Top Bar Extraction**: Do you approve consolidating the headers of `/`, `/compare`, and `/city/[id]` into a single shared component?
  - *Recommendation*: Yes, mandatory for consistency and maintainability.

---

## 14. Sign-Off Checklist

Before proceeding to Milestone M23 (UI Shell Implementation), the project owner must verify and sign off on:

- [ ] Goals and non-goals approved.
- [ ] Key journeys and tap reductions approved.
- [ ] Wireframes and bottom sheet 3-state physics approved.
- [ ] Trust presentation and "weakest status" provenance rule approved.
- [ ] Copy changes and removal of "verified geospatial" claims approved.
- [ ] Performance budget (+15 kB max First Load JS) approved.
- [ ] Owner decisions on Q1–Q8 recorded.
