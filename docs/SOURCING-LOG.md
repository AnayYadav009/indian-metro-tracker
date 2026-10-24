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

---

## 4. Re-capture: DMRC Evidence Re-Capture (Milestone M21c)

> **Notice**: This section supersedes the earlier M21b entries above for `del-fare-dmrc` and `fare-for-airport-express-line`. In M21b, the earlier hashes recorded were of the raw client app shell (`6,117` bytes) and of a DOM captured prior to switching the site language toggle to English. The re-capture below was performed in ONE unified Playwright session with language explicitly set to English, capturing the full rendered DOM, the backing API responses, and their cryptographic SHA-256 digests.

### 4.1 Standard Fare Page Render (`delhimetrorail.com/fare`)

- **Requested URL**: `https://delhimetrorail.com/fare`
- **Final URL**: `https://delhimetrorail.com/fare`
- **Render Timestamp (UTC)**: `2026-10-24T18:08:27.710Z`
- **Language Shown**: English (`"Distance (in KMs)"`, `"FARE"`, `"Time Limit (in Mins.)"`, `"Monday to Saturday"`, `"Sunday & National Holidays"`)
- **Saved Rendered DOM File**: `C:/Users/anayy/AppData/Local/Temp/dmrc-fare-rendered-english.html` (outside repo)
- **Rendered DOM Byte Length**: `76,249` bytes
- **Rendered DOM SHA-256**: `1dacc1cbb95679f08754d1a5816606ab1f0c7d74b61885934ee57cd1090737fb`

### 4.2 Network Response Carrying Fare Table Data

- **API URL**: `https://backend.delhimetrorail.com/api/v2/en/passenger/fare/`
- **HTTP Status**: `200 OK`
- **Content-Type**: `application/json`
- **Byte Length**: `1,533` bytes
- **Saved API JSON File**: `C:/Users/anayy/AppData/Local/Temp/dmrc-fare-api.json` (outside repo)
- **Saved API SHA-256**: `8838c5f2cba57fa1764c338ec67d5079677f7cebf4047da2872182542d4103ae`
- **Agreement**: Scripted comparison (`extract-and-compare.cjs`) verified that the rendered DOM table rows and the backend API JSON rows agree identically across all columns and distance bands.

### 4.3 Script-Extracted Fare Table Rows (All Columns)

| Distance Band (in KMs) | Monday to Saturday Fare | Sunday & National Holidays Fare | Time Limit (in Mins.) |
| :--- | :--- | :--- | :--- |
| `0-2` | Rs 11/- | Rs 11/- | 65 |
| `2-5` | Rs 21/- | Rs. 11/- | - |
| `5-12` | Rs 32/- | Rs 21/- | - |
| `12-21` | Rs. 43/- | Rs. 32/- | 100 |
| `21-32` | Rs 54/- | Rs 43/- | 180 |
| `More than 32` | Rs 64/- | Rs 54/- | - |

### 4.4 Scripted Comparison with `data/fares.json` (`del-fare-dmrc`)

Scripted comparison against `data/fares.json` (rule `del-fare-dmrc`, `city_id: "delhi"`, `day_scope: "mon_sat"`):

| Band Index | Published Wording | Min Km (Page vs Data) | Max Km (Page vs Data) | Base Fare INR (Page vs Data) | Result |
| :---: | :--- | :---: | :---: | :---: | :---: |
| 0 | `0-2` | `0` vs `0` | `2` vs `2` | `11` (Rs 11/-) vs `11` | MATCH |
| 1 | `2-5` | `2` vs `2` | `5` vs `5` | `21` (Rs 21/-) vs `21` | MATCH |
| 2 | `5-12` | `5` vs `5` | `12` vs `12` | `32` (Rs 32/-) vs `32` | MATCH |
| 3 | `12-21` | `12` vs `12` | `21` vs `21` | `43` (Rs. 43/-) vs `43` | MATCH |
| 4 | `21-32` | `21` vs `21` | `32` vs `32` | `54` (Rs 54/-) vs `54` | MATCH |
| 5 | `More than 32` | `32` vs `32` | `null` vs `null` | `64` (Rs 64/-) vs `64` | MATCH |

Overall match: **All bands match identically**.

### 4.5 Airport Express Page Re-capture (`fare-for-airport-express-line`)

- **Requested URL**: `https://delhimetrorail.com/fare-for-airport-express-line`
- **Final URL**: `https://delhimetrorail.com/fare-for-airport-express-line`
- **Render Timestamp (UTC)**: `2026-10-24T18:08:31.985Z`
- **Language Shown**: English
- **Saved Rendered DOM File**: `C:/Users/anayy/AppData/Local/Temp/dmrc-airport-rendered-english.html` (outside repo)
- **Rendered DOM Byte Length**: `81,573` bytes
- **Rendered DOM SHA-256**: `cc640aab0f2c6b97ab0b2fde7e8e806d6071ea33a21cbc74e5278782e00a0869`
- **Single Journey Token Matrix (7 Stations)**:
  - Stations: New Delhi, Shivaji Stadium, Dhaula Kuan, Delhi Aerocity, IGI Airport, Dwarka Sec 21, Yashobhoomi Dwarka Sector - 25.
  - New Delhi to Shivaji Stadium: Rs 21
  - New Delhi to Dhaula Kuan: Rs 43
  - New Delhi to Delhi Aerocity: Rs 54
  - New Delhi to IGI Airport: Rs 64
  - New Delhi to Dwarka Sec 21: Rs 64
  - New Delhi to Yashobhoomi Dwarka Sector 25: Rs 75
  - Minimum fare between adjacent stations: Rs 11 (e.g. Aerocity to IGI Airport).
- **Reason for Exclusion**: Origin-destination matrix tariff model; excluded per owner decision B.

### 4.6 Updated Owner Spot-Check List (M21c)

- **URL**: [https://delhimetrorail.com/fare](https://delhimetrorail.com/fare)
- **How to switch to English**:
  1. Open `https://delhimetrorail.com/fare` in a browser.
  2. If the interface loads in Hindi, click the language switch link in the top header (`English` / `हिन्दी`) or set `localStorage.setItem('lang', 'en')` and refresh.
  3. Verify the main table heading reads: `"Distance (in KMs) | FARE | Time Limit (in Mins.)"` with subheaders `"Monday to Saturday"` and `"Sunday & National Holidays"`.
- **Values to compare**:
  1. **2–5 km band**: Monday to Saturday fare is **Rs 21/-**, contrasted with Sunday & National Holidays fare of **Rs. 11/-** (Rs 10 discount on Sundays).
  2. **12–21 km band**: Monday to Saturday fare is **Rs. 43/-**, contrasted with Sunday & Holidays fare of **Rs. 32/-**.
  3. **More than 32 km band**: Monday to Saturday fare is **Rs 64/-**, contrasted with Sunday & Holidays fare of **Rs 54/-**.

