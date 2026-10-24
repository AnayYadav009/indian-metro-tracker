# Sourcing Evidence Log

This log documents every official transit authority web page fetched to source fare structures, service hours, and operating rules for the Indian Metro Network Tracker. Per project rules, every value in data records must be traceable to the exact extracted text from an official source fetched in session.

---

## 1. DMRC Standard Network Fares (`del-fare-dmrc`)

- **Record ID**: `del-fare-dmrc`
- **Requested URL**: `https://delhimetrorail.com/fare`
- **Final URL**: `https://delhimetrorail.com/fare`
- **HTTP Status**: `200`
- **Content-Type**: `text/html; charset=utf-8`
- **Byte Length**: `6,117` bytes (raw HTML shell); `80,238` bytes (rendered DOM)
- **Fetched At (UTC)**: `2026-10-24T17:32:21.057Z`
- **SHA-256 (Raw HTML)**: `c0a12fdb67ae1265c4090299f7907386b257b7e565e0195bcbe5cf6fbae66864`
- **SHA-256 (Rendered DOM)**: `06000530d1b3207fb9249745c2e6313c89013339744d8d94522d27036d73a80b`
- **Method**: Playwright render (`@playwright/test` Chromium headless) because `delhimetrorail.com` is a client-rendered React SPA (`<div id="root"></div>`) backed by API `https://backend.delhimetrorail.com/api/v2/en/passenger/fare/`.

### Exact Extracted Table Rows

```text
Distance (in KMs) | Monday to Saturday | Sunday & National Holidays | Time Limit (in Mins.)
0-2               | Rs 11/-            | Rs 11/-                    | 65
2-5               | Rs 21/-            | Rs. 11/-                   | 
5-12              | Rs 32/-            | Rs 21/-                    | 
12-21             | Rs. 43/-           | Rs. 32/-                   | 100
21-32             | Rs 54/-            | Rs 43/-                    | 180
More than 32      | Rs 64/-            | Rs 54/-                    | 
```

### Comparison Table

| Field | Value in Data (`del-fare-dmrc`) | Value on Page | Match (Yes/No) |
| :--- | :--- | :--- | :---: |
| `bands[0].min_km` | `0` | `0` | Yes |
| `bands[0].max_km` | `2` | `2` | Yes |
| `bands[0].fare_inr` | `11` | `Rs 11/-` (Monday to Saturday) | Yes |
| `bands[1].min_km` | `2` | `2` | Yes |
| `bands[1].max_km` | `5` | `5` | Yes |
| `bands[1].fare_inr` | `21` | `Rs 21/-` (Monday to Saturday) | Yes |
| `bands[2].min_km` | `5` | `5` | Yes |
| `bands[2].max_km` | `12` | `12` | Yes |
| `bands[2].fare_inr` | `32` | `Rs 32/-` (Monday to Saturday) | Yes |
| `bands[3].min_km` | `12` | `12` | Yes |
| `bands[3].max_km` | `21` | `21` | Yes |
| `bands[3].fare_inr` | `43` | `Rs. 43/-` (Monday to Saturday) | Yes |
| `bands[4].min_km` | `21` | `21` | Yes |
| `bands[4].max_km` | `32` | `32` | Yes |
| `bands[4].fare_inr` | `54` | `Rs 54/-` (Monday to Saturday) | Yes |
| `bands[5].min_km` | `32` | `32` ("More than 32") | Yes |
| `bands[5].max_km` | `null` | `null` ("More than 32") | Yes |
| `bands[5].fare_inr` | `64` | `Rs 64/-` (Monday to Saturday) | Yes |
| `effective_from` | (omitted) | Not stated on page | Yes |
| `provenance.status` | `"unverified"` | n/a (unverified: page lacks effective date) | Yes |

---

## 2. DMRC Airport Express Line Fares (`fare-for-airport-express-line`)

- **Record ID**: None loaded (excluded from distance-band rules per owner specification)
- **Requested URL**: `https://delhimetrorail.com/fare-for-airport-express-line`
- **Final URL**: `https://delhimetrorail.com/fare-for-airport-express-line`
- **HTTP Status**: `200`
- **Content-Type**: `text/html; charset=utf-8`
- **Byte Length**: `6,117` bytes (raw HTML shell)
- **Fetched At (UTC)**: `2026-10-24T17:32:21.318Z`
- **SHA-256 (Raw HTML)**: `c0a12fdb67ae1265c4090299f7907386b257b7e565e0195bcbe5cf6fbae66864`
- **Method**: Playwright render (`@playwright/test` Chromium headless)

### Exact Extracted Station-to-Station Matrix

```text
Station                     | New Delhi | Shivaji Stadium | Dhaula Kuan | Delhi Aerocity | IGI Airport | Dwarka Sector 21 | Yashobhoomi Dwarka Sector 25
New Delhi                   | Rs. 11    | Rs. 21          | Rs. 43      | Rs. 54         | Rs. 64      | Rs. 64           | Rs. 75
Shivaji Stadium             | Rs. 21    | Rs. 11          | Rs. 21      | Rs. 32         | Rs. 54      | Rs. 64           | Rs. 75
Dhaula Kuan                 | Rs. 43    | Rs. 21          | Rs. 11      | Rs. 21         | Rs. 32      | Rs. 54           | Rs. 64
Delhi Aerocity              | Rs. 54    | Rs. 32          | Rs. 21      | Rs. 11         | Rs. 21      | Rs. 32           | Rs. 43
IGI Airport                 | Rs. 64    | Rs. 54          | Rs. 32      | Rs. 21         | Rs. 11      | Rs. 21           | Rs. 32
Dwarka Sector 21            | Rs. 64    | Rs. 64          | Rs. 54      | Rs. 32         | Rs. 21      | Rs. 11           | Rs. 21
Yashobhoomi Dwarka Sec - 25 | Rs. 75    | Rs. 75          | Rs. 64      | Rs. 43         | Rs. 32      | Rs. 21           | Rs. 11
```

### Note on Exclusion
Airport Express Line tariff is published as an origin-destination matrix between individual stations rather than standard distance bands. Per milestone rules: *"If the operator publishes station-to-station fares instead of distance bands, or the band model cannot represent the published structure, do NOT force it: load nothing for that line group, describe the published structure in the report, and stop for an owner decision."*

---

## 3. DMRC Train Timings (`#first-and-last` Modal)

- **Record ID**: None loaded in `data/timings.json` (`[]`)
- **Requested URL**: `https://delhimetrorail.com/` (interactive modal `#first-and-last`)
- **Reason Not Loaded**: DMRC does not publish static first/last train timetables for terminal stations. The website only offers an interactive query form with station dropdown selectors. Per milestone instructions: *"If official timings cannot be read reliably, load none and report."*

---

## Owner Spot-Check List

For manual owner verification by eye against the live official publication:

| Record ID | Official Source URL | Value 1 | Value 2 | Value 3 |
| :--- | :--- | :--- | :--- | :--- |
| `del-fare-dmrc` | [delhimetrorail.com/fare](https://delhimetrorail.com/fare) | **0–2 km**: Rs 11/- (Mon–Sat) | **5–12 km**: Rs 32/- (Mon–Sat) | **>32 km**: Rs 64/- (Mon–Sat) |
