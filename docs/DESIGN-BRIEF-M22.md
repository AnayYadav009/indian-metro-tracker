# M22 UI Design Brief: Public Usability & Mobile-First Shell

- **Author**: Antigravity (Pair Programming Agent)
- **Status**: Brief drafted, awaiting owner sign-off (M22 / M22.1)
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
5. **Thumb-Friendly Touch Targets**: Ensure minimum 44×44 px touch targets for all primary mobile actions. (Currently 64 of 65 interactive elements on mobile fail this threshold).
6. **Zero Regression for Routing & Geo Features**: Fully reserve layouts for M24 (Route Finder v2 with distance-band fares and first/last trains) and M25 (Nearest station geolocation and walking directions).

### Non-Goals
1. **No Live Vehicle Tracking / Real-Time Arrivals**: Static site cannot stream live telemetry.
2. **No User Accounts / Bookmarks / Auth**: No database, no cookies, no tracking.
3. **No Dynamic Backend or Paid APIs**: No Google Maps API, no Mapbox API, no routing engines requiring server compute. All routing and geocoding run client-side in pure TypeScript / WebAssembly.
4. **No New Geometry or Unverified Cities**: Data remains strictly within the current 21-city scope validated in M21c.
5. **No Multilingual Localization in M23**: Hindi and regional language support are parked for later milestones (UI text stays clean, plain English with transit conventions).

---

## 2. Key User Journeys

Comparison of user steps and tap counts between today's Playwright-measured UI (Part 1b) and the proposed M23/M24 design:

| Journey | Today's Measured Path (Playwright Log) | Today Actions (Clicks / Selects / Typing) | Proposed Path (M23/M24) | Proposed Actions |
| :--- | :--- | :---: | :--- | :---: |
| **(a) Route from A to B in my city** | 1. Load `/`<br>2. Click `[data-testid='find-route-btn']` (1 click)<br>3. Select `delhi` in `[data-testid='route-city-select']` (1 select)<br>4. Click `[data-testid='route-origin-input']` (1 click)<br>5. Type "Kashmere Gate" (1 typing)<br>6. Click "Kashmere Gate" in `[data-testid='origin-suggestions-list']` (1 click)<br>7. Click `[data-testid='route-destination-input']` (1 click)<br>8. Type "Rajiv Chowk" (1 typing)<br>9. Click "Rajiv Chowk" in `[data-testid='dest-suggestions-list']` (1 click) | **8 actions** (5 clicks + 1 select + 2 typing) | 1. Tap Search box on bottom sheet<br>2. Type station name (or select "Route")<br>3. Pick destination from sheet | **3 actions** |
| **(b) Nearest station to me** | 1. Load `/`<br>2. Click `[data-testid='find-nearest-btn']` in header (1 click) | **1 action** (1 click) | 1. Tap "Nearby" shortcut button on sheet | **1 action** |
| **(c) Check station details** | 1. Load `/`<br>2. Click `[data-testid='city-select-delhi']` (1 click)<br>3. Click station marker on canvas (coordinates of Kashmere Gate) (1 click) | **2 actions** (2 clicks) | 1. Type station name in universal search box<br>2. Tap result (auto-centers map & opens Half sheet) | **2 actions** |
| **(d) Fare estimate & first/last train** | *Not available in UI yet* (Model verified in M21c). Today: route results explicitly display *"Fares not included"*. | N/A | Calculated automatically in Journey (a) route result card. For Delhi, shows band estimate (e.g. ₹43); for unverified cities, row is completely hidden. | **0 extra actions** |
| **(e) Report an error** | 1. Load `/`<br>2. Click `[data-testid='city-select-delhi']` (1 click)<br>3. Click station marker (Kashmere Gate) to open panel (1 click)<br>4. Click `[data-testid='report-issue-button']` (1 click) | **3 actions** (3 clicks) | 1. Open station or route card (1–2)<br>2. Tap persistent flag icon "Report error" at bottom of sheet (1) | **2 actions** |
| **(f) Seeing a provenance footer** | 1. Load `/`<br>2. Click `[data-testid='city-select-delhi']` (1 click)<br>3. Click station marker (Kashmere Gate) to open panel (1 click)<br>4. Scroll station panel to bottom to bring `[data-testid='provenance-footer']` into view (1 scroll) | **3 actions** (2 clicks + 1 scroll) | 1. Open station or route card (1–2)<br>2. Tap "About this data" disclosure at bottom of sheet | **2 actions** |
| **(g) Compare cities (secondary)** | 1. Load `/`<br>2. Click `[data-testid='nav-to-compare']` in top header nav pill (1 click) | **1 action** (1 click) | 1. Tap "Layers / More" icon<br>2. Tap "Compare Networks" | **2 actions** (demoted to secondary) |

---

## 3. Information Architecture & Feature Map

### Measured Default States on Mobile (Pixel 7 / 412 × 915)
From DOM measurement of components on first load and with a station selected (height = 915 px):
- **Filter Panel (`[data-testid="filter-panel"]`)**:
  - *First Load*: **Expanded** by default (covers **44.7%** of viewport height, `top: 72px`, `height: 409px` out of 915px). Center point `(206, 277)` is topmost element.
  - *Station Selected*: **Collapsed** automatically via `useEffect` in `components/filters/filter-panel.tsx:26` (`top: 72px`, `height: 59px`, **6.4%** viewport height). Center point `(206, 102)` is topmost element.
- **Metadata Panel (`[data-testid="metadata-panel"]`)**:
  - *First Load*: Absent from DOM (`null`).
  - *Station Selected*: **Visible**, fixed bottom overlay (`top: 223px`, `height: 692px`, covering **75.6%** of viewport height). Center point `(206, 569)` is topmost element.
- **Map Legend (`[data-testid="map-legend"]`)**:
  - *First Load*: **Collapsed** button (`top: 739px`, `height: 34px`, covering **3.7%** of viewport height). Center point `(329, 756)` is topmost element.
  - *Station Selected*: Present in DOM at `top: 739px`, but covered by `<div testid="station-detail">` of MetadataPanel.
- **Timeline Slider (`[data-testid="timeline-slider-container"]`)**:
  - *First Load*: **Expanded** by default at bottom overlay (`top: 770px`, `height: 66px`, covering **7.2%** of viewport height). Center point `(206, 802)` is topmost element.
  - *Station Selected*: Present in DOM at `top: 770px`, but covered by `<div testid="provenance-item-1">` of MetadataPanel.
- **Data Badge (`[data-testid="data-last-updated"]`)**:
  - *First Load*: Rendered at `top: 784px`, `height: 14px` (**1.5%** of viewport height) inside `bottom-right-container`. Covered at center `(221, 791)` by sibling text `<span class="whitespace-nowrap text-[10px] font-medium text-slate-400">`.
  - *Station Selected*: Present in DOM, but covered by `<span testid="provenance-last-verified">` of MetadataPanel.
- **Attribution (`[data-testid="osm-attribution"]`)**:
  - *First Load*: Rendered at `top: 809px`, `height: 27px` (**3.0%** of viewport height). Covered at center `(250, 822)` by sibling text `<span class="font-mono text-[9px] text-slate-500">`.
  - *Station Selected*: Present in DOM, but covered by MetadataPanel.

#### Visual Inspection of Pixel 7 Screenshots
- **`home-first-load-pixel-7.png`**: The expanded Filter Panel (`top: 72px`, `height: 409px`) covers the upper 45% of the viewport. In the lower 25% of the screen, the Map Legend toggle button (`Map Legend ^`) sits directly above the Timeline Slider (`Year: 2026`). The map canvas is visible only through a narrow ~250px band across the middle of the screen.
- **`station-panel-pixel-7.png`**: When Kashmere Gate is selected, the Metadata Panel covers the entire bottom 75.6% of the screen (`top: 223px` to bottom). The Filter Panel auto-collapses to a single header row at the top (`top: 72px`, `height: 59px`). Between the collapsed filter panel and the metadata sheet, only a narrow slit of the map canvas (~90px high) is visible. The Timeline Slider and Map Legend remain rendered in the DOM beneath the metadata sheet (`z-30` vs `z-40`), but are 100% occluded visually by the metadata panel. This reconciles why the timeline was reported absent in visual walkthroughs: it was never unmounted, but completely covered.

---

### Feature Map Table (Current vs Proposed)

| Feature | Component File | Desktop Position | Mobile Position | Measured Taps from Load | Default Mobile State | Proposed Location in M23 Shell |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **Map Canvas** | `components/map/map-canvas.tsx` | Full background | Full background | **0** | Visible | Edge-to-edge background canvas |
| **City Select** | `components/filters/city-select.tsx` | Filter panel (left) | Filter panel (top-left) | **1** | Expanded (48.7% vh) | Searchable Combobox in Top Bar & Sheet |
| **Filter Panel Search** | `components/filters/filter-panel.tsx` (`filter-search-input`) | Inside FilterPanel | Inside FilterPanel | **0** | Visible in panel | Replaced by Universal Station Search; interim fix clarifies line/phase scope |
| **Filters Panel** | `components/filters/filter-panel.tsx` | Top-left (`w-96`) | Top-left | **0** (desktop) / **1** (mobile) | Expanded on load, collapses on city select | "Layers / More" drawer |
| **Timeline Scrubber** | `components/timeline/timeline-slider.tsx` | Bottom center (`bottom-4`) | Bottom center (`bottom-20`) | **0** | Expanded (7.8% vh) | "Layers / More" drawer (or toggleable overlay) |
| **Map Legend** | `components/legend/map-legend.tsx` | Bottom-right box | Bottom-right button | **0** (desktop) / **1** (mobile) | Collapsed (4.1% vh) | Collapsible button in bottom-right / Layers |
| **Route Finder** | `components/routing/route-finder-panel.tsx` | Top header pill | Top header pill | **1** | Hidden | Full Bottom Sheet card |
| **Nearest Station** | `components/panels/nearest-station-panel.tsx` | Top header pill | Top header pill | **1** | Hidden | Dedicated tab / shortcut in Bottom Sheet |
| **Station Panel** | `components/panels/metadata-panel.tsx` | Left overlay (`top-4`) | Bottom overlay (`top: 168`) | **2** (city -> station) | Hidden | Half / Full Bottom Sheet |
| **Segment Panel** | `components/panels/metadata-panel.tsx` | Left overlay (`top-4`) | Bottom overlay (`top: 168`) | **2** (city -> segment) | Hidden | Half / Full Bottom Sheet |
| **Compare Link** | `app/page.tsx` (`nav-to-compare`) | Header nav pill | Header nav pill | **1** | Visible | Top bar secondary action / Layers drawer |
| **City Pages** | `app/page.tsx` (`city-directory-btn`) | Header nav pill | Header nav pill | **2** | Hidden | City Switcher directory / Layers drawer |
| **Report an Issue** | `components/panels/report-issue-button.tsx` | Inside station/route card | Inside station/route card | **3** | Hidden | Persistent action at bottom of sheet |
| **Provenance Footers** | `components/panels/provenance-footer.tsx` | Bottom of station/segment | Bottom of station/segment | **3** (2 clicks + scroll) | Hidden | "About this data" disclosure in sheet |
| **Data Badge** | `app/page.tsx:192` (`data-last-updated`) | Bottom-right container | Bottom-right container | **0** | Visible (1.6% vh) | Footer of "Layers / More" menu & subpages |

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

#### Mobile Station Selected (Half Sheet, ~45% Screen)
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
|  > About this data (Status: Unverified)  |
|  [!] Report an issue with this station   |
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
|  [!] Report an issue on this route       |
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

## 5. Station Search Specification

### Problem
Today's input in `components/filters/filter-panel.tsx` features the placeholder `"Search lines, phases, stations..."`. However, `lib/filter-utils.ts:138` checks only `[props.line_name, props.city, props.phase, ...lineAliases]`. Stations are completely unindexed. A user searching for "Kashmere Gate" gets 0 matching segments and an empty map.

### Proposed Specification
1. **Index Source**:
   - Primary: `data/stations.geojson` (915 stations, loaded once via existing fetch/import).
   - Aliases: Station aliases declared in `data/overrides/<city>.json` (e.g. "VT" for CSMT, "Hauz Khas" alternate spellings).
2. **Client-Side Matching & Ranking**:
   - Normalization: Lowercase + NFD diacritic stripping (`name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")`).
   - Scoring order:
     1. Exact name match in active selected city.
     2. Prefix match on station name in active city.
     3. Substring match on station name or alias in active city.
     4. Prefix match on station name in any other city (grouped by city).
3. **Result Count**:
   - Maximum 6 items displayed on mobile (to fit comfortably above the virtual keyboard).
   - Maximum 10 items displayed on desktop.
4. **ARIA Combobox Pattern & Keyboard Navigation**:
   - Input: `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded={isOpen}`, `aria-controls="station-search-results"`, `aria-activedescendant={activeOptionId}`.
   - Dropdown: `<ul id="station-search-results" role="listbox">`.
   - Items: `<li id="stn-opt-{id}" role="option" aria-selected={isActive}>`.
   - Keyboard: `ArrowDown`/`ArrowUp` cycles through options; `Enter` commits selection (pans map to station coordinates, snaps sheet to Half, selects station); `Escape` closes dropdown and restores previous focus.
5. **Performance & Bundle Impact**:
   - Zero additional network requests. Reuses the 588 KB uncompressed `stations.geojson` already fetched by MapLibre.
   - Fast linear scan + trie or filter index runs in <5ms for 915 items on mid-range Android.
   - Bundle size impact < 3 kB (pure TypeScript search helper in `lib/station-search.ts`), well within the +15 kB First Load JS budget.
6. **Interim Placeholder Fix (M23.1)**:
   - Until the dedicated station search index is wired in M23.5, the placeholder in `components/filters/filter-panel.tsx:90` MUST be updated from `"Search lines, phases, stations..."` to `"Search lines, phases..."` to stop misleading users.

---

## 6. City Chips & Searchable Picker Specification

### Problem
Today, the filter panel renders 22 raw city chips (`All Cities` + 21 cities) directly in the DOM.
- **Arbitrary Array Order**: Cities appear in whatever order they were added to `data/cities.json` (Gurugram 1st, Navi Mumbai 2nd, Chennai 3rd, Delhi 11th, Patna 22nd).
- **Cluttered Labels**: Chips include verbose technical operator acronyms: `Gurugram RAPID METRO GURGAON LTD (RMGL)`, `Navi Mumbai CIDCO`, `Kolkata METRO RAILWAY, KOLKATA`.
- **Vertical Sprawl**: On Pixel 7 mobile devices, scrolling through 22 chips consumes >300px of vertical space, pushing operational status toggles and phase filters below the fold.

### Proposed Specification
1. **Searchable Combobox / Modal Sheet**:
   - Replaces the 22 static chips in the top bar and sheet header with a clean trigger button: `[ Delhi Metro (DMRC) v ]`.
   - Tapping opens a quick-filter combobox with a search input: `Search 21 metro networks...`.
2. **Proposed Ordering (Owner Decision)**:
   - **Tier 1 Major Networks First** (strictly aligned with `TIER_1_CITY_IDS` in `lib/compare-stats.ts` and `docs/MILESTONES-v2.md`):
     1. Delhi (DMRC)
     2. Mumbai (MMRDA)
     3. Bengaluru (Namma Metro / BMRCL)
     4. Chennai (CMRL)
     5. Kolkata (Metro Railway)
     6. Hyderabad (L&T Metro)
   - **Tier 2 Networks Alphabetical**:
     Agra, Ahmedabad (GMRC), Bhopal, Gurugram (Rapid Metro), Indore, Jaipur, Kanpur, Kochi, Lucknow, Nagpur, Navi Mumbai (CIDCO), Noida (NMRC), Patna, Pune (Maha Metro), Surat.
   *(Note: Ahmedabad and Pune belong to Tier 2 in the project specification, not Tier 1).*
3. **Clean Transit Nomenclature**:
   - Remove raw legal operator entity strings (`RAPID METRO GURGAON LTD`, `METRO RAILWAY, KOLKATA`).
   - Use clean public branding: `City (Transit Name / Operator Abbr)`, e.g. `Delhi (Delhi Metro / DMRC)`, `Kolkata (Kolkata Metro)`, `Gurugram (Rapid Metro / RMGL)`.

---

## 7. Trust and Provenance Presentation

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
4. **Fare Scope & Dynamic Boundary Qualifier**:
   - Fares MUST carry day scope and estimate qualifier: e.g. `₹43 (Mon–Sat estimate)`.
   - Near-band warning driven dynamically by `alternative_fare_inr` from calculator (never hard-coded):
     *"Near a fare band boundary (11.8 km): estimated ₹32 or ₹43 depending on operator route calculation"*.
5. **Zero-Data Gating**:
   - If a city has no verified fare rule (e.g. Mumbai, Bengaluru), the fare section is completely omitted. No `"N/A"`, no `"TBD"`, no estimate.
   - If service hours are 0 / unverified, the first/last train section is completely omitted.

---

## 8. Interchange Highlighting (M25 Spec)

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

## 9. Route Result Card (M24 Spec)

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
| [!] Report an issue on this route                         |
+-----------------------------------------------------------+
```

---

## 10. Copy Inventory (M23 Text Replacements)

Audit of all user-visible text requiring correction in M23:

| Location | Current Text | Proposed Wording | Reason |
| :--- | :--- | :--- | :--- |
| `app/page.tsx:192` (`data-last-updated`), `app/compare/page.tsx:154` | `Data: Oct 2026 (MANUAL, OSM)` / `(DMRC, BMRCL, OSM)` | `Data retrieved: Oct 2026` or `Data: Oct 2026` (Clicking opens Data Sources list) | Derived from dataset `retrieved_at: "2026-10-16"`. Replaces ambiguous agency tags with dataset fetch date; clicking opens popover listing OpenStreetMap (ODbL) and public operator data. |
| `app/compare/page.tsx:280` | `...comprehensive verified geospatial statistics...` | `...compiled transit statistics and geospatial alignment data...` | Violates hard rule: only a fraction of data is verified. |
| `lib/city-seo.ts:35` | `...verified track alignments and station counts...` | `...mapped track alignments and station counts...` | Removes false claim in meta descriptions. |
| `app/city/[id]/page.tsx:220` | `≥80% stations verified` | `≥80% stations opened for commercial service` | Conflates "opened" with "verified provenance". |
| `components/routing/route-finder-panel.tsx:14` | `verified lines` | `routable lines` | Refers to topological graph connectivity, not operator provenance verification. |
| `components/panels/station-detail.tsx`, `segment-detail.tsx` | `Feature data date: Oct 2026` | `Record retrieved: Oct 2026` | Clarifies machine scrape date (`retrieved_at`) vs official publication date (`last_verified`). |
| `components/filters/filter-panel.tsx:90` | Placeholder: `Search lines, phases, stations...` | Placeholder: `Search lines, phases...` | Interim fix: current search does NOT search stations at all. |

---

## 11. Accessibility (a11y) Specifications

### Measured Baseline (Part 1 Audit)
On first load, measured via Playwright DOM inspection (excluding 21 visually hidden `h-[1px]` crawler links in `crawlable-city-directory` and the MapLibre `<canvas>` background):
- **Desktop (1280 × 800)**: **43 visible interactive controls**, of which **39 (90.7%)** fail the 44px touch target requirement (`width < 44px` OR `height < 44px`).
  - *Reconciliation*: Total interactive elements in DOM = 65 (21 in crawler directory + 1 map canvas + 43 visible controls). Previous draft reported 65 failing out of 66 total because it included the hidden 1px crawler links and canvas; excluding them yields 43 visible controls, of which 39 fail < 44px.
- **Pixel 7 (412 × 915)**: **43 visible interactive controls**, of which **42 (97.7%)** fail the 44px touch target requirement.
- **Measured Control Dimensions**:
  - **Header Buttons**:
    - `find-route-btn`: `68.6 × 26 px` on desktop, `38 × 26 px` on Pixel 7
    - `find-nearest-btn`: `77.1 × 26 px` on desktop, `38 × 26 px` on Pixel 7
    - `city-directory-btn`: `66.1 × 26 px` on desktop, `38 × 26 px` on Pixel 7
    - `nav-to-compare`: `79.4 × 26 px` on desktop, `38 × 26 px` on Pixel 7
  - **City Chips**:
    - `city-select-*` (e.g. Delhi): `169.5 × 24 px` on desktop, `181.5 × 24 px` on Pixel 7 (height fails)
  - **Filter Collapse Button**:
    - `collapse-filter-btn`: `24 × 24 px` on both viewports
  - **Timeline Controls**:
    - `timeline-play-btn`: `28 × 28 px`
    - `toggle-stations-btn`: `77.9 × 18 px` on desktop, `26 × 18 px` on Pixel 7
    - `timeline-future-toggle`: `100.9 × 18 px` on desktop, `26 × 18 px` on Pixel 7
    - `timeline-reset-btn`: `54.4 × 16 px` on desktop, `24 × 16 px` on Pixel 7
    - `timeline-range-slider`: height `6 px`
  - **Status Toggles**:
    - `status-toggle-*`: `349 × 39.3 px` (height fails 44px threshold)
  - **Legend Toggle Button**:
    - `toggle-legend-btn`: `286 × 32 px` on desktop, `148 × 32 px` on Pixel 7
  - **Map Zoom Controls**:
    - `.maplibregl-ctrl-zoom-in`, `.maplibregl-ctrl-zoom-out`: `29 × 29 px`
  - **Attribution Links**:
    - OpenFreeMap: `69.4 × 15 px`
    - OSM contributors: `152.1 × 15 px`
    - ODbL: `154 × 16 px`
- **Accessible Names**: All 43 visible controls have an accessible name when falling back to `title` or `innerText`. However, on mobile, `<button data-testid="find-route-btn">`, `find-nearest-btn`, and `city-directory-btn` hide their inner text via `hidden sm:inline` and rely solely on the HTML `title` attribute. Explicit `aria-label` attributes must be enforced.

### M23 Accessibility Requirements
1. **Touch Targets**: All primary interactive touch targets (buttons, links, search triggers, city selector items) must be at least **44 × 44 CSS pixels** on mobile.
2. **Keyboard Navigation & Order**:
   - Logical tab flow: Top bar (Logo -> City Switcher -> Layers button) -> Search input -> Quick action buttons -> Bottom sheet content -> Map canvas controls.
   - Escape key: Closes open dropdowns, collapses Full sheet to Half/Peek, dismisses modals.
3. **Focus Management**:
   - When bottom sheet transitions to Full state via search click, focus automatically shifts to input.
   - Closing modals (City Directory, Layers) returns focus to triggering element.
4. **Screen Reader (ARIA) Labels**:
   - Bottom sheet has `role="region" aria-label="Transit station and route information"`.
   - Drag handle has `aria-label="Drag sheet to expand or collapse"`.
   - Explicit `aria-label` on all icon buttons (`Route`, `Nearby`, `Cities`, `Compare`, `Layers`, `Collapse`).
5. **Contrast & Color Independence**:
   - Statuses distinguished by line stroke styles (Solid = Operational, Dashed = Under Construction, Dotted = Planned) in addition to color.
   - Text contrast ratio ≥ 4.5:1 against `slate-900` / `slate-950` backgrounds.
6. **Reduced Motion**:
   - Respect `prefers-reduced-motion: reduce`: disable sheet spring transitions and map flyTo animations when enabled.

---

## 12. Performance Budgets (Relative to M21c Baseline)

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

## 13. Shared Top Bar Extraction Plan

Currently, `app/page.tsx`, `app/compare/page.tsx`, and `app/city/[id]/page.tsx` each duplicate header markup with divergent classes, logos, and badges.

### Extraction Plan for M23:
1. **Create `components/layout/app-header.tsx`**:
   - Single reusable header component.
   - Props:
     - `variant`: `"map"` | `"subpage"`
     - `title`: Optional custom title (defaults to "Indian Metro Network Tracker")
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

## 14. Blast Radius (Rebuilt Audit over `e2e/` and `__tests__/`)

### Grep Scope
Targeting testids and visible strings belonging to the features being restructured:
- Header controls: `find-route-btn`, `find-nearest-btn`, `city-directory-btn`, `nav-to-compare`, `nav-to-map`
- Filter panel & city select: `filter-panel`, `city-select-`, `status-toggle-`, `phase-filter-`, `collapse-filter-btn`, `filter-search-input`, `city-directory-modal`
- Metadata, station & segment panels: `metadata-panel`, `station-detail`, `segment-detail`, `close-metadata-panel`, `report-issue-button`, `Report an issue`
- Provenance footer: `provenance-footer`, `provenance-status-badge`, `provenance-disclaimer-notice`
- Route finder panel: `route-finder-panel`, `route-city-select`, `route-origin-input`, `route-destination-input`, `route-results-container`, `route-guard-notice`
- Nearest station panel: `nearest-station-panel`, `city-fallback-select`
- Timeline & Legend: `timeline-slider-container`, `timeline-range-slider`, `timeline-play-btn`, `timeline-reset-btn`, `timeline-future-toggle`, `toggle-stations-btn`, `map-legend`, `toggle-legend-btn`
- Data badge & Attribution: `data-last-updated`, `data-badge`, `osm-attribution`

### UI Component & E2E Test Files (219 matches across 31 files)

| File | Matching Assertions / Selectors Count | Key UI Selectors / Assertions |
|---|:---:|---|
| `e2e/route-finder.spec.ts` | **20** | `find-route-btn`, `route-finder-panel`, `route-city-select`, `route-guard-notice`, `route-origin-input`, `route-destination-input` |
| `__tests__/filter-panel.test.tsx` | **19** | `filter-panel`, `city-select-`, `status-toggle-`, `filter-search-input`, `collapse-filter-btn`, `phase-filter-` |
| `e2e/filters.spec.ts` | **17** | `filter-panel`, `city-select-`, `status-toggle-`, `phase-filter-`, `collapse-filter-btn` |
| `e2e/nearest-station.spec.ts` | **16** | `find-nearest-btn`, `nearest-station-panel`, `city-fallback-select` |
| `e2e/m13-1-ux.spec.ts` | **15** | `metadata-panel`, `segment-detail`, `city-select-`, `collapse-filter-btn`, `filter-search-input` |
| `e2e/report-issue.spec.ts` | **13** | `metadata-panel`, `report-issue-button`, `Report an issue`, `route-results-container` |
| `e2e/provenance.spec.ts` | **12** | `provenance-footer`, `provenance-disclaimer-notice`, `metadata-panel`, `segment-detail`, `station-detail` |
| `e2e/timeline.spec.ts` | **11** | `timeline-slider-container`, `timeline-range-slider`, `timeline-play-btn`, `timeline-reset-btn`, `timeline-future-toggle`, `toggle-stations-btn` |
| `__tests__/metadata-panel.test.tsx` | **9** | `metadata-panel`, `Report an issue`, `report-issue-button`, `close-metadata-panel` |
| `__tests__/station-detail-provenance.test.tsx` | **9** | `station-detail`, `provenance-footer`, `report-issue-button` |
| `e2e/interactions.spec.ts` | **7** | `data-last-updated`, `metadata-panel`, `close-metadata-panel`, `city-select-` |
| `e2e/attribution.spec.ts` | **6** | `osm-attribution`, `map-legend`, `toggle-legend-btn`, `metadata-panel` |
| `e2e/interchange.spec.ts` | **6** | `metadata-panel`, `station-detail`, `segment-detail` |
| `__tests__/report-issue-button.test.tsx` | **6** | `report-issue-button`, `Report an issue` |
| `e2e/agra-qa.spec.ts` | **5** | `filter-panel`, `city-select-`, `collapse-filter-btn`, `map-legend`, `metadata-panel` |
| `e2e/chennai-qa.spec.ts` | **5** | `filter-panel`, `city-select-`, `collapse-filter-btn`, `map-legend`, `metadata-panel` |
| `e2e/jaipur-qa.spec.ts` | **5** | `filter-panel`, `city-select-`, `collapse-filter-btn`, `map-legend`, `metadata-panel` |
| `e2e/kanpur-qa.spec.ts` | **5** | `filter-panel`, `city-select-`, `collapse-filter-btn`, `map-legend`, `metadata-panel` |
| `e2e/kochi-qa.spec.ts` | **5** | `filter-panel`, `city-select-`, `collapse-filter-btn`, `map-legend`, `metadata-panel` |
| `e2e/kolkata-qa.spec.ts` | **5** | `filter-panel`, `city-select-`, `collapse-filter-btn`, `map-legend`, `metadata-panel` |
| `e2e/lucknow-qa.spec.ts` | **5** | `filter-panel`, `city-select-`, `collapse-filter-btn`, `map-legend`, `metadata-panel` |
| `e2e/patna-qa.spec.ts` | **5** | `filter-panel`, `city-select-`, `collapse-filter-btn`, `map-legend`, `metadata-panel` |
| `e2e/compare.spec.ts` | **3** | `nav-to-map`, `nav-to-compare` |
| `e2e/home.spec.ts` | **3** | `data-last-updated`, `osm-attribution` |
| `__tests__/map-legend.test.tsx` | **3** | `map-legend`, `toggle-legend-btn` |
| `e2e/city-pages.spec.ts` | **2** | `city-directory-btn`, `city-directory-modal` |
| `e2e/legend.spec.ts` | **2** | `map-legend`, `toggle-legend-btn` |
| `__tests__/osm-attribution.test.tsx` | **2** | `osm-attribution` |
| `__tests__/provenance-footer.test.tsx` | **2** | `provenance-footer`, `provenance-disclaimer-notice` |
| `e2e/mobile-viewport.spec.ts` | **1** | `osm-attribution` |
| `__tests__/app-header.test.tsx` | **1** | `data-last-updated` |

### Excluded Pure Function Test Files (19 files)
Files testing mathematical, algorithmic, schema, or store logic without DOM component assertions are excluded from the UI blast radius:
- `__tests__/fares.test.ts`: Tests pure fare calculation algorithms, distance tier matching, and fare rule validation.
- `__tests__/route-finder.test.ts`: Tests Dijkstra routing graph construction and pathfinding algorithms.
- `__tests__/schema.test.ts`: Tests Zod schema data validation contracts on raw datasets.
- `__tests__/provenance-validator.test.ts`: Tests provenance rule verification and status checkers.
- `__tests__/data-loader.test.ts`: Tests geojson loader, city indexer, and data access functions.
- `__tests__/compare-stats.test.ts`: Tests mathematical aggregation and statistical computation for city comparisons.
- `__tests__/nearest-station.test.ts`: Tests Haversine distance math and coordinate sorting algorithms.
- `__tests__/timeline.test.ts`: Tests cumulative operational kilometer math and year scrubber ranges.
- `__tests__/city-seo.test.ts`: Tests SEO metadata generators and structured JSON-LD schemas.
- `__tests__/interchange-clusters.test.ts`: Tests spatial clustering algorithms for interchange nodes.
- `__tests__/line-status.test.ts`: Tests line operational status categorization rules.
- `__tests__/data-audit.test.ts`: Tests data audit validation pipeline rules.
- `__tests__/dedupe-regression.test.ts`: Tests pipeline segment and station deduplication functions.
- `__tests__/migrate-schema-v2.test.ts`: Tests database schema migration transformers.
- `__tests__/pipeline-step-c.test.ts`: Tests pipeline step C topological graph generation.
- `__tests__/pipeline-merge-validation.test.ts`: Tests pipeline merge integrity validator.
- `__tests__/fixtures/mock-tier1-acceptance.test.ts`: Tests acceptance criteria against mock data fixture.
- `__tests__/metro-store.test.ts`: Tests Zustand store actions and state transitions in memory.
- `__tests__/issue-url.test.ts`: Tests GitHub issue URL template query parameter builders.

---

## 15. Screenshots Inventory & Hash Verification

All 20 screenshots saved in `docs/design/m22/current/`. Every file is under **500,000 bytes** (decimal 500 kB) and under **512,000 bytes** (binary 500 KiB):

| Screen File | Size (Bytes) | Size (KB) | Limit (<500,000 B) | Limit (<512,000 B) | SHA-256 Hash | Notes |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `city-delhi-desktop.png` | 77,176 | 75.4 KB | **PASS** | **PASS** | `c55a8e12b40c1a756cc8b44b4bcc413292a6fd04f8eca84da34e889355cd66c0` | Full `/city/delhi` desktop view |
| `city-delhi-pixel-7.png` | 203,913 | 199.1 KB | **PASS** | **PASS** | `1eb2b02d28f1e568d5dbc866c87303ea8a573604d582ebc86c71d74a4540d568` | Mobile `/city/delhi` view |
| `compare-desktop.png` | 101,828 | 99.4 KB | **PASS** | **PASS** | `3ceba2303d1fac692d2cf26ed1a814283258f2082c941d8946bdbd2395fe00c1` | Desktop `/compare` table |
| `compare-pixel-7.png` | 209,422 | 204.5 KB | **PASS** | **PASS** | `a6f5c90cea2d06c6caf2959eda528e754234a79b04204a9e0d2d6802ac82c777` | Mobile `/compare` view |
| `filters-desktop.png` | 499,718 | 488.0 KB | **PASS** | **PASS** | `00301c597dbef873333494bcee8319411fdcee08d46472fc7a3243e4709b5a99` | **Distinct capture** (status filter toggled) |
| `filters-pixel-7.png` | 480,629 | 469.4 KB | **PASS** | **PASS** | `288dc279cc6603586cb677f295172cf2cfc08e5199b5257abd9470e2f271e3e3` | Mobile filter panel expanded |
| `home-city-selected-desktop.png` | 491,987 | 480.5 KB | **PASS** | **PASS** | `667d78b94d5d8bfa6efeac9b6759a1e5372cb23ade98c3783c08c3183f480a78` | Desktop with Delhi network |
| `home-city-selected-pixel-7.png` | 466,537 | 455.6 KB | **PASS** | **PASS** | `2929cdb1def2c3c8be9cd257697a9417ce22a31e6e3db7496af29f3b614de722` | **Standard scale** (cropped clip at 480px, not resampled) |
| `home-first-load-desktop.png` | 290,090 | 283.3 KB | **PASS** | **PASS** | `2467857e0412751dbc5a56db1d8ecc728e82f0c93b001f7cba8e628c8101ed3f` | Initial landing desktop |
| `home-first-load-pixel-7.png` | 440,457 | 430.1 KB | **PASS** | **PASS** | `b607a9b1d65a33576d4c693603d676ccbb2365bc2309e8dab6189e936ec25f29` | Initial landing Pixel 7 |
| `nearest-station-panel-desktop.png` | 434,351 | 424.2 KB | **PASS** | **PASS** | `323490f297ee614b3eece02e2a4a3ca5720d991a80a7e559410b81f6c436487e` | Desktop nearest station panel |
| `nearest-station-panel-pixel-7.png` | 486,487 | 475.1 KB | **PASS** | **PASS** | `883ebc0854dbfe8850e7c515bd6085443608f7c954f697f5e5ca6f824152b25d` | Mobile nearest station panel |
| `route-finder-desktop.png` | 427,108 | 417.1 KB | **PASS** | **PASS** | `08cc6f4e69e7189fbc955a8180f21f08a82eb8e3d18072c831eea3602c9ea35d` | Route result Kashmere -> Rajiv |
| `route-finder-pixel-7.png` | 316,551 | 309.1 KB | **PASS** | **PASS** | `c86ee36ac7b463b936419e43f986660e39a6923ff8a2f86a550331564a00bcd8` | Mobile route result card |
| `segment-panel-desktop.png` | 485,515 | 474.1 KB | **PASS** | **PASS** | `83c49762d1f7b39b4731f9cf15c7f6586fba8735b66a0953093a3ca4c3b4b1f3` | Desktop segment panel |
| `segment-panel-pixel-7.png` | 466,713 | 455.8 KB | **PASS** | **PASS** | `f2b43b238fd129f0966d8d5b9b72263fad6c3887a55abe4cd2e7b9e5c9186961` | Mobile segment panel |
| `station-panel-desktop.png` | 472,807 | 461.7 KB | **PASS** | **PASS** | `cc876a7bef7bd3b9ac257d58bafe3f9bb94352ae38062f7494c2e9f0f6f471de` | Desktop station panel |
| `station-panel-pixel-7.png` | 368,289 | 359.7 KB | **PASS** | **PASS** | `5cb3afe76bd0c6cd1442d21b23412f7166d91a8a5548cdc2e78016c7c92d35d2` | Mobile station panel |
| `timeline-desktop.png` | 290,036 | 283.2 KB | **PASS** | **PASS** | `47c165c9594f5db6f4fdaa2d9adea5fdac46b7f8b045f062273a5ea367ea421e` | Desktop timeline scrubber |
| `timeline-pixel-7.png` | 439,580 | 429.3 KB | **PASS** | **PASS** | `6a46711f192a6613ae8fd4b112a2e09bfecfcedea404c12ab8f7a6c7d9fedc82` | Mobile timeline scrubber |

Zero duplicate hashes remain. `filters-desktop.png` is visually and cryptographically distinct from `home-city-selected-desktop.png`.

---

## 16. M23 Implementation Plan

Ordered, independently mergeable steps:

| Step | Scope | Files Touched | Tests Added / Updated |
| :---: | :--- | :--- | :--- |
| **M23.1** | Extract shared `AppHeader` component across all 3 pages; apply interim placeholder fix | `components/layout/app-header.tsx`, `components/filters/filter-panel.tsx`, `app/page.tsx`, `app/compare/page.tsx`, `app/city/[id]/page.tsx` | Unit tests for `AppHeader`. Verify existing `home.spec.ts` and `compare.spec.ts`. |
| **M23.2** | Implement searchable City Picker dropdown (replacing 22 chips; Tier 1 first) | `components/filters/city-select.tsx`, `components/filters/city-picker-combobox.tsx` | Unit test for search filtering & ordering. E2E test for city selection on desktop & mobile. |
| **M23.3** | Build responsive 3-state `BottomSheet` container | `components/sheet/bottom-sheet.tsx` | Component test for Peek/Half/Full states and touch gestures. |
| **M23.4** | Extract "Layers & Timeline" into secondary drawer | `components/layers/layers-drawer.tsx`, `components/timeline/timeline-slider.tsx` | Verify timeline tests pass in new drawer container. |
| **M23.5** | Integrate universal station search into bottom sheet & top bar | `components/search/station-search-input.tsx`, `lib/station-search.ts` | Unit tests for station fuzzy search & ranking. E2E test for selecting station from sheet. |
| **M23.6** | Re-mount Station & Segment details into bottom sheet | `components/panels/station-detail.tsx`, `components/panels/segment-detail.tsx` | Mobile viewport E2E test verifying zero overlap with map. |
| **M23.7** | Copy cleanup & provenance disclosure polish | All affected files from Section 10 | Update snapshot and text assertion tests. |

---

## 17. Options and Open Questions (Owner Checklist)

### Design Options
- **Option A (Recommended)**: Clean Map + Mobile Bottom Sheet. Landing shows map with searchable city picker in top bar and Peek bottom sheet with station search. All heavy secondary controls (timeline, filters, compare) move into "Layers". Maximum map visibility, instant station search, zero mobile panel stacking.
- **Option B (Alternative)**: Floating Card Interface (similar to Google Maps desktop). Floats a search and filter widget over top-left of map on both desktop and mobile.
  - *Trade-offs of Option B*: Clutters mobile screen; leaves less than 40% of viewport for map on 360px phones; causes keyboard resize bugs on mobile Android.

---

### Open Questions for Owner Decision (Checklist)

- [ ] **Q1: City Selection Default & `localStorage`**: Should the app remember the user's last selected city across sessions, or stay 100% stateless (defaulting to Nationwide overview on each fresh visit)?  
  *Context*: Per project rules in `.agents/rules/project.md:33` (*"No `localStorage` or `sessionStorage` use unless the owner approves it for a specific feature"*) and `docs/MILESTONES-v2.md:272` (*"Constraints: no new dependency, no `localStorage`..."*), client storage is forbidden without explicit owner sign-off.  
  *Recommendation*: Stay stateless unless `?city=` query param is present in the URL; do NOT use `localStorage`.

- [ ] **Q2: Timeline Scrubber Placement**: Should the historical timeline scrubber live entirely inside the "Layers / More" menu, or retain a floating icon button on the desktop map?  
  *Recommendation*: Move inside "Layers / More" on mobile; show a floating icon button on desktop.

- [ ] **Q3: Nationwide View vs Single City on First Load**: Should first load default to showing Delhi (the flagship network with verified fares), or the nationwide map with all 21 cities?  
  *Recommendation*: Nationwide overview on first load with top cities highlighted, prompting user to pick a city.

- [ ] **Q4: Station Search Scope & Ranking**: Should the universal search box search across all cities simultaneously, or scope to the currently selected city?  
  *Recommendation*: If a city is active, rank that city's stations first, with other cities grouped below.

- [ ] **Q5: Station Search Placeholder Interim Fix**: In M23.1, before the full station search index is built in M23.5, should we update the misleading placeholder in `components/filters/filter-panel.tsx:90` from `"Search lines, phases, stations..."` to `"Search lines, phases..."`?  
  *Recommendation*: Yes. The current filter searches only line names, cities, phases, and aliases. Claiming stations search when typing stations yields 0 results is a major user defect.

- [ ] **Q6: City Picker Ordering (Owner Decision)**: How should the 21 cities be ordered in the searchable combobox (replacing the arbitrary array order Gurugram 1st, Navi Mumbai 2nd...)?  
  *Proposal*: Tier 1 major networks first (Delhi, Mumbai, Bengaluru, Chennai, Kolkata, Hyderabad — matching `TIER_1_CITY_IDS` in `lib/compare-stats.ts` and `docs/MILESTONES-v2.md`), followed by alphabetical for the remaining Tier 2 cities (Agra, Ahmedabad, Bhopal, Gurugram, Indore, Jaipur, Kanpur, Kochi, Lucknow, Nagpur, Navi Mumbai, Noida, Patna, Pune, Surat). Mark as owner decision.  
  *Recommendation*: Approve Tier 1 first, then alphabetical. Note: Ahmedabad and Pune are classified as Tier 2 in the project specification.

- [ ] **Q7: Fare Boundary Qualifier Wording**: For routes within 500m of a fare band edge, should the qualifier wording dynamically reference the calculator's `alternative_fare_inr` (e.g. *"Near a fare boundary: estimated ₹X or ₹Y"*), rather than a fixed rupee offset?  
  *Recommendation*: Yes, dynamic wording driven by `alternative_fare_inr` avoids hard-coding any rupee amounts in the design.

- [ ] **Q8: Mobile Bottom Sheet Snap Points**: Do you approve the 3 snap heights: Peek (64px), Half (45vh), Full (85vh)?  
  *Recommendation*: Yes, standard Android Material You snap ratios.

- [ ] **Q9: Shared Top Bar Extraction**: Do you approve consolidating the headers of `/`, `/compare`, and `/city/[id]` into a single shared `AppHeader` component?  
  *Recommendation*: Yes, eliminates duplicate markup and enforces consistent safe-area layout.

- [ ] **Q10: Phase Filter Retention**: Is the Phase filter (Phase I, II, III, IV) used frequently enough by the general public to keep in the "Layers" menu, or should it be removed from the primary UI?  
  *Recommendation*: Keep in "Layers" drawer under "Advanced Filters" for transit enthusiasts and researchers.

---

## 18. Sign-Off Checklist

Before proceeding to Milestone M23 (UI Shell Implementation), the project owner must verify and sign off on:

- [ ] Goals and non-goals approved.
- [ ] Key journeys and tap reductions approved.
- [ ] Wireframes and bottom sheet 3-state physics approved.
- [ ] Universal station search specification approved.
- [ ] City picker ordering and naming conventions approved.
- [ ] Trust presentation and "weakest status" provenance rule approved.
- [ ] Copy changes and removal of "verified geospatial" claims approved.
- [ ] Performance budget (+15 kB max First Load JS) approved.
- [ ] Owner decisions on Q1–Q10 recorded.
