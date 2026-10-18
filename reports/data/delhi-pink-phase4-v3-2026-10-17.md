# Delhi Metro Pink Line Phase 4 (v3) Fix & Investigation Report
Date: 2026-10-17
Branch: `data/delhi-pink-phase4-v2`
Base Commit: `3e607d7`

---

## 1. Deviations
none

---

## 2. Git State & Branch Commits

### `git log --oneline 3e607d7..HEAD`
```
5e5c197 docs(delhi): remove unsourced 58.43 km from Pink notes and cite Phase 4 opening
2e9e66b test(delhi): update city-seo expected station and opening counts
b07616d data(delhi): add Pink Line Phase 4 segment del-pink-seg-02 and 7 stations
```

### `git status --short`
```
 M reports/data-audit/2026-10-17.json
 M reports/data-audit/2026-10-17.md
 M reports/data-audit/agra-qa-screenshot.png
?? reports/data/
?? reports/verification/
```
*(Note: Per instruction 7, the regenerated reports/data-audit files are listed above and neither committed nor discarded).*

### `git diff --stat 3e607d7..HEAD`
```
 __tests__/city-seo.test.ts |   4 +-
 data/overrides/delhi.json  | 796 ++++++++++++++++++++++++++++++++++++++++++++-
 data/reference/delhi.json  |  20 +-
 data/segments.geojson      | 631 ++++++++++++++++++++++++++++++++++-
 data/stations.geojson      | 238 ++++++++++++++
 5 files changed, 1664 insertions(+), 25 deletions(-)
```

---

## 3. Real Git Diff: `data/reference/delhi.json` and `data/overrides/delhi.json`

```diff
diff --git a/data/overrides/delhi.json b/data/overrides/delhi.json
index 54c34a2..dfc3384 100644
--- a/data/overrides/delhi.json
+++ b/data/overrides/delhi.json
@@ -363,6 +363,602 @@
         }
       ]
     },
+    {
+      "segment_id": "del-pink-seg-02",
+      "line_id": "del-pink",
+      "line_name": "Pink Line",
+      "phase": "IV",
+      "status": "operational",
+      "gauge": "standard",
+      "inaugurated_on": "2026-03-08",
+      "expected_completion": null,
+      "color": "#FC8EAC",
+      "city_id": "delhi",
+      "endpoint_station_ids": [
+        "del-majlis-park",
+        "del-maujpur-babarpur"
+      ],
+      "geometry_quality": "exact",
+      "last_verified": "2026-10-17",
+      "references": [
+        "https://delhimetrorail.com/pages/about-us/present-network",
+        "https://www.openstreetmap.org/way/1181394345"
+      ],
+      "coordinates": [
+        [
+          77.184133,
+          28.731106
+        ],
+        [
+          77.184439,
+          28.731197
+        ],
+        ... [139 intermediate coordinates] ...
+        [
+          77.279824,
+          28.692779
+        ],
+        [
+          77.279527,
+          28.692149
+        ]
+      ]
+    },
     {
       "osmId": 8385429,
       "segment_id": "del-magenta-seg-01",
@@ -536,7 +1132,8 @@
     "Dwarka - Kakrola": "Dwarka",
     "tughlkabad": "Tughlakabad",
     "Peera Garhi": "Peeragarhi",
-    "Badarpur border": "Badarpur Border"
+    "Badarpur border": "Badarpur Border",
+    "Jagatpur - Wazirabad": "Jagatpur Village"
   },
   "out_of_scope_line_ids": [],
   "out_of_scope_station_ids": [
@@ -561,15 +1158,8 @@
     "Sector 42-43",
     "Sector 53-54",
     "Sector 54 Chowk",
-    "Sector 55–56",
-    "del-burari",
-    "del-jagatpur-wazirabad",
-    "del-khajuri-khas",
-    "del-yamuna-vihar",
-    "del-bhajanpura",
-    "del-soorghat",
+    "Sector 55\u201356",
     "del-nanaksar-sonia-vihar",
-    "del-jharoda-majra",
     "del-krishna-park-extension",
     "del-noida-sector-143",
     "del-noida-sector-144",
@@ -1054,6 +1644,190 @@
         77.09278,
         28.48194
       ]
+    },
+    "del-burari": {
+      "line_ids": [
+        "del-pink"
+      ],
+      "phase": "IV",
+      "status": "operational",
+      "opened_on": "2026-03-08",
+      "expected_completion": null,
+      "layout": null,
+      "references": [
+        "https://www.openstreetmap.org/node/5215706767",
+        "https://www.delhimetrorail.com/pages/about-us/present-network"
+      ]
+    },
+    "del-jharoda-majra": {
+      "line_ids": [
+        "del-pink"
+      ],
+      "phase": "IV",
+      "status": "operational",
+      "opened_on": "2026-03-08",
+      "expected_completion": null,
+      "layout": null,
+      "references": [
+        "https://www.openstreetmap.org/node/13628489720",
+        "https://www.delhimetrorail.com/pages/about-us/present-network"
+      ]
+    },
+    "del-jagatpur-village": {
+      "line_ids": [
+        "del-pink"
+      ],
+      "phase": "IV",
+      "status": "operational",
+      "opened_on": "2026-03-08",
+      "expected_completion": null,
+      "layout": null,
+      "references": [
+        "https://www.openstreetmap.org/node/5215706768",
+        "https://www.delhimetrorail.com/pages/about-us/present-network"
+      ]
+    },
+    "del-soorghat": {
+      "line_ids": [
+        "del-pink"
+      ],
+      "phase": "IV",
+      "status": "operational",
+      "opened_on": "2026-03-08",
+      "expected_completion": null,
+      "layout": null,
+      "references": [
+        "https://www.openstreetmap.org/node/5215706793",
+        "https://www.delhimetrorail.com/pages/about-us/present-network"
+      ]
+    },
+    "del-khajuri-khas": {
+      "line_ids": [
+        "del-pink"
+      ],
+      "phase": "IV",
+      "status": "operational",
+      "opened_on": "2026-03-08",
+      "expected_completion": null,
+      "layout": null,
+      "references": [
+        "https://www.openstreetmap.org/node/5215706769",
+        "https://www.delhimetrorail.com/pages/about-us/present-network"
+      ]
+    },
+    "del-bhajanpura": {
+      "line_ids": [
+        "del-pink"
+      ],
+      "phase": "IV",
+      "status": "operational",
+      "opened_on": "2026-03-08",
+      "expected_completion": null,
+      "layout": null,
+      "references": [
+        "https://www.openstreetmap.org/node/5215706782",
+        "https://www.delhimetrorail.com/pages/about-us/present-network"
+      ]
+    },
+    "del-yamuna-vihar": {
+      "line_ids": [
+        "del-pink"
+      ],
+      "phase": "IV",
+      "status": "operational",
+      "opened_on": "2026-03-08",
+      "expected_completion": null,
+      "layout": null,
+      "references": [
+        "https://www.openstreetmap.org/node/5215706770",
+        "https://www.delhimetrorail.com/pages/about-us/present-network"
+      ]
+    }
+  },
+  "additionalStations": [
+    {
+      "osmId": 5215706767,
+      "name": "Burari",
+      "coordinates": [
+        77.19957,
+        28.729829
+      ],
+      "lineRefs": [
+        "8241298"
+      ],
+      "status": "operational"
+    },
+    {
+      "osmId": 13628489720,
+      "name": "Jharoda Majra",
+      "coordinates": [
+        77.213712,
+        28.724965
+      ],
+      "lineRefs": [
+        "8241298"
+      ],
+      "status": "operational"
+    },
+    {
+      "osmId": 5215706768,
+      "name": "Jagatpur Village",
+      "coordinates": [
+        77.223995,
+        28.721116
+      ],
+      "lineRefs": [
+        "8241298"
+      ],
+      "status": "operational"
+    },
+    {
+      "osmId": 5215706793,
+      "name": "Soorghat",
+      "coordinates": [
+        77.227453,
+        28.710222
+      ],
+      "lineRefs": [
+        "8241298"
+      ],
+      "status": "operational"
+    },
+    {
+      "osmId": 5215706769,
+      "name": "Khajuri Khas",
+      "coordinates": [
+        77.254499,
+        28.705261
+      ],
+      "lineRefs": [
+        "8241298"
+      ],
+      "status": "operational"
+    },
+    {
+      "osmId": 5215706782,
+      "name": "Bhajanpura",
+      "coordinates": [
+        77.262647,
+        28.703599
+      ],
+      "lineRefs": [
+        "8241298"
+      ],
+      "status": "operational"
+    },
+    {
+      "osmId": 5215706770,
+      "name": "Yamuna Vihar",
+      "coordinates": [
+        77.277311,
+        28.702376
+      ],
+      "lineRefs": [
+        "8241298"
+      ],
+      "status": "operational"
     }
   ]
 }
diff --git a/data/reference/delhi.json b/data/reference/delhi.json
index 6924f97..5a4b121 100644
--- a/data/reference/delhi.json
+++ b/data/reference/delhi.json
@@ -479,8 +479,8 @@
       "official_name": "Pink Line (Line 7)",
       "operator": "DMRC",
       "topology": "linear",
-      "operational_stations": 38,
-      "operational_length_km": 58.43,
+      "operational_stations": 45,
+      "operational_length_km": 71.548,
       "planned_length_km": 71.55,
       "terminals": [
         "Majlis Park",
@@ -538,22 +538,20 @@
             "kind": "official",
             "url": "https://www.delhimetrorail.com/corporate"
           }
-        }
-      ],
-      "construction": [
+        },
         {
-          "stretch": "Phase 4 extension (Majlis Park - Maujpur-Babarpur)",
+          "stage": "Majlis Park - Maujpur-Babarpur",
           "phase": "4",
-          "expected_completion": "2026-03",
-          "stations": 7,
-          "notes": "12.3 km elevated extension corridor completing the ring loop between Majlis Park and Maujpur-Babarpur.",
+          "opened_on": "2026-03-08",
+          "stations_added": 7,
           "source": {
             "kind": "official",
             "url": "https://delhimetrorail.com/pages/about-us/present-network"
           }
         }
       ],
-      "notes": "58.43 km operational Phase 3 corridor with 38 stations from Majlis Park to Shiv Vihar. Phase 4 Maujpur-Babarpur extension (12.3 km, 7 stations) under final stages/inauguration."
+      "construction": [],
+      "notes": "Operational corridor with 38 Phase 3 stations from Majlis Park to Shiv Vihar. Phase 4 Maujpur-Babarpur stretch opened 2026-03-08 (DMRC present-network page)."
     },
     {
       "line_id": "del-magenta",
```

---

## 4. Item 1: Majlis Park Connection & OSM Tags

### Full OSM Tags

#### Way 364876209
- **Version**: 10
- **Timestamp**: `2024-01-30T14:33:00Z`
- **User**: `Heinz_V`
- **Nodes Count**: 27 (First: `6539977413`, Last: `3689041493`)
- **Tags**:
  ```json
  {
    "bridge": "yes",
    "electrified": "contact_line",
    "frequency": "50",
    "gauge": "1435",
    "layer": "2",
    "name": "Delhi Metro Pink Line",
    "network": "Delhi Metro",
    "note": "Contributors are requested to not edit the \"network\" and the \"operator\" tags. (2023/06/22)",
    "operator": "Delhi Metro Rail Corporation Limited",
    "railway": "subway",
    "service": "spur",
    "voltage": "25000"
  }
  ```
- **Relation 8241298 Membership**: **Yes**, Way 364876209 is a member of relation 8241298 with role `""`.

#### Way 1183304781
- **Version**: 7
- **Timestamp**: `2026-03-08T19:39:40Z`
- **User**: `Vonter`
- **Nodes Count**: 7 (First: `3689041493`, Last: `6196100474`)
- **Tags**:
  ```json
  {
    "bridge": "yes",
    "electrified": "contact_line",
    "frequency": "50",
    "gauge": "1435",
    "layer": "2",
    "name": "Delhi Metro Pink Line",
    "network": "Delhi Metro",
    "note": "Contributors are requested to not edit the \"network\" and the \"operator\" tags. (2026/03/08)",
    "operator": "Delhi Metro Rail Corporation Limited",
    "railway": "subway",
    "service": "spur",
    "voltage": "25000"
  }
  ```
- **Relation 8241298 Membership**: **Yes**, Way 1183304781 is a member of relation 8241298 with role `""`. (It is the final way of `del-pink-seg-01`).

#### Way 1181394345
- **Version**: 6
- **Timestamp**: `2026-03-08T19:39:40Z`
- **User**: `Vonter`
- **Nodes Count**: 64 (First: `6539977413`, Last: `10972123609`)
- **Tags**:
  ```json
  {
    "bridge": "yes",
    "electrified": "yes",
    "layer": "2",
    "name": "Delhi Metro Pink Line",
    "note": "Yamuna Vihar to Mukundpur (Phase-4)",
    "railway": "subway",
    "tracks": "1",
    "type": "elevated",
    "usage": "main",
    "voltage": "750"
  }
  ```
- **Relation 8241298 Membership**: **Yes**, Way 1181394345 is a member of relation 8241298 with role `""`.

### Continuity from Majlis Park Stop Position to Node 6539977413
- **Majlis Park Stop Position**: OSM Node `6196100474` (`lat: 28.724605, lon: 77.1818165`).
- **Path**:
  1. Node `6196100474` is the end node of Way `1183304781`.
  2. Following Way `1183304781` in reverse leads directly to Node `3689041493`.
  3. Node `3689041493` is the end node of Way `364876209`.
  4. Following Way `364876209` in reverse leads directly to Node `6539977413`.
  5. Node `6539977413` is the start node of Way `1181394345`.
- **Verdict**: There **is** a continuous physical way path in OSM from Majlis Park stop position (`6196100474`) through Ways `1183304781` and `364876209` to Node `6539977413`.
- **Length of non-OSM snapped geometry in `del-pink-seg-02`**:  
  When `del-pink-seg-02` begins at Node `6539977413` (`[77.184133, 28.731106]`) and is snapped by `merge-overrides.ts` straight to Majlis Park station node (`[77.18211, 28.72409]`), the non-OSM snap segment is **804.7 meters (0.805 km)**.

---

## 5. Item 2: `seg-01` Byte-Identity & Candidate Testing

### Test Script
```js
const fs = require('fs');
const { execSync } = require('child_process');

const oldSegs = JSON.parse(execSync('git show 3e607d7:data/segments.geojson', { maxBuffer: 50 * 1024 * 1024 })).features;
const curSegs = JSON.parse(fs.readFileSync('data/segments.geojson')).features;

const oldPink = oldSegs.find(s => s.properties.segment_id === 'del-pink-seg-01');
const curPink = curSegs.find(s => s.properties.segment_id === 'del-pink-seg-01');

console.log('Byte-identical:', JSON.stringify(oldPink.geometry.coordinates) === JSON.stringify(curPink.geometry.coordinates));
console.log('Old coordinate count:', oldPink.geometry.coordinates.length);
console.log('Cur coordinate count:', curPink.geometry.coordinates.length);
```

### Output:
```
Byte-identical: false
Old coordinate count: 734
Cur coordinate count: 740
```

### Candidate Testing Results in Scratch Worktree

| Candidate | Description | `seg-01` Byte-Identical? | Effect on Audit Errors | Feasibility & Rules Compliance |
|---|---|---|---|---|
| **Candidate A** | Current branch data (`del-pink-seg-02` + 7 un-scoped stations + `additionalStations` with `lineRefs: ["8241298"]`) | **False** (740 coords) | 2 `segment-parallel-duplicate` errors remain | Complies with data rules, but triggers parallel-duplicate due to pipeline trimming. |
| **Candidate B** | Remove `lineRefs` from `additionalStations` | **False** (740 coords) | 2 `segment-parallel-duplicate` errors remain | Fails because raw OSM stop position nodes `13238880328` and `13628489721` in `data/raw/delhi.json` inherit relation 8241298 directly. |
| **Candidate C** | Keep `del-burari` and `del-jharoda-majra` in `out_of_scope_station_ids` | **True** (734 coords) | Clears duplicate errors, but causes station count mismatch | **Fails rules**: Delhi drops to 43 stations (fails `ground-truth-station-count` 43 != 45) and omits 2 DMRC Phase 4 stations. |
| **Candidate D** | Set `dedupeRadiusM = 10` | **False** (734 coords, but different coordinates) | Clears folded track, but creates duplicate station nodes | Fails because stop positions become orphaned stations with missing metadata. |

### Conclusion on Step 2
There is **no data-only change under `data/`** (within the constraints of keeping `del-pink-seg-01` unedited and including all 7 Phase 4 stations) that can prevent the pipeline from projecting Burari and Jharoda Majra onto Way `1183304781` while they remain members of OSM relation 8241298.
Per prompt safety rules (*"Apply one only if it fully works within the rules; otherwise STOP and write the options up. Do not apply any pipeline change; propose it in the report."*), we stop on this item and propose the pipeline fix below.

### Proposed Pipeline Fix
In `scripts/pipeline/merge-overrides.ts` (lines 538–560), when trimming a segment between its first and last station projection:
If `iseg.segOverride.endpoint_station_ids` is provided (e.g. `["del-shiv-vihar", "del-majlis-park"]`), slice between the projections of those two specific endpoint stations:
```ts
if (iseg.segOverride.endpoint_station_ids && iseg.segOverride.endpoint_station_ids.length === 2) {
  const st1 = stationsWithLines.find(sw => sw.st.id === iseg.segOverride.endpoint_station_ids![0]);
  const st2 = stationsWithLines.find(sw => sw.st.id === iseg.segOverride.endpoint_station_ids![1]);
  if (st1 && st2) {
    const p1 = nearestPointOnPolyline(st1.st.coords, coords);
    const p2 = nearestPointOnPolyline(st2.st.coords, coords);
    iseg.coords = lineSlice(p1.point, p2.point, coords);
  }
}
```
This guarantees that `del-pink-seg-01` terminates cleanly at Majlis Park (734 points), byte-identical to `3e607d7`, without being stretched by unrelated Phase 4 stop nodes that happen to be tagged in OSM relation 8241298.

---

## 6. Item 3: `seg-02` Geometry Quality & Length with/without Snap

- **Connector Track Evaluation**:
  Ways `1183304781` and `364876209` carry OSM tag `service: "spur"`. Because they represent depot leads rather than dedicated passenger revenue tracks, `del-pink-seg-02` was started from the surveyed Phase 4 elevated viaduct Way `1181394345` (`usage: "main"`), with the initial 804.7 m terminal link to Majlis Park station provided via endpoint snapping.
- **`geometry_quality`**: `"exact"`
  - Allowed values in schema: `"exact"` or `"schematic"`.
  - Justification: Over 94% (12.523 km of 13.345 km) of the alignment is surveyed, constructed OSM LineString geometry across four continuous ways. Using `"schematic"` would falsely designate surveyed geometry as schematic.
- **Pink Line Length Comparison**:
  - `del-pink-seg-01` Length: 57.806 km
  - `del-pink-seg-02` Length (with 805 m snap): **13.345 km**
  - `del-pink-seg-02` Length (without snap): **12.523 km**
  - **Total Pink Length with snap**: **71.152 km** (Variance: **-0.55%** vs DMRC 71.548 km)
  - **Total Pink Length without snap**: **70.329 km** (Variance: **-1.70%** vs DMRC 71.548 km)
  - Both values pass the 3.0% threshold of `ground-truth-length`.

---

## 7. Item 5: Audit Data Console Reconciliation (Official Command)

### Master (`3e607d7`) Console Output:
```
🔴 Errors: 2
🟡 Warnings: 1222
🔵 Info: 25
✅ Accepted warnings (reviewed): 1076
📋 Unreviewed warnings (awaiting city review): 88
🚨 Known walkthrough defects tracked: 0
⏳ Pending rules (report-only): 42
🗺️ Coverage gaps: 15
⚠️ Warning: Found 14 stale baseline entry/entries that match no active finding
❌ 0 errors and 18 un-baselined warnings remain
```

### Current Branch (`data/delhi-pink-phase4-v2`) Console Output:
```
🔴 Errors: 4
🟡 Warnings: 1229
🔵 Info: 25
✅ Accepted warnings (reviewed): 1076
📋 Unreviewed warnings (awaiting city review): 88
🚨 Known walkthrough defects tracked: 0
⏳ Pending rules (report-only): 42
🗺️ Coverage gaps: 14
⚠️ Warning: Found 14 stale baseline entry/entries that match no active finding
❌ 2 errors and 25 un-baselined warnings remain
```

### Reconciliation of Numbers:
1. **Errors**:
   - Master: 2 errors (both pending-rule errors under test: `gur-rapid|gur-cyber-city` and `bho-orange` terminal missing; 0 enforced errors).
   - Branch: 4 errors (2 pending-rule errors + 2 new `segment-parallel-duplicate` errors).
2. **Coverage Gaps**:
   - Master: 15 coverage gaps.
   - Branch: 14 coverage gaps (-1 coverage gap: `del-pink` Phase 4 extension opened and removed from construction).
   - *Previous report discrepancy*: In the previous session, a scratch script (`run_audit_comparison.ts`) filtered results before all cities were aggregated, yielding 13. The official command `npm run audit:data` yields 15 on master and 14 on branch.
3. **Warnings**:
   - Master: 1222 warnings (1076 accepted + 88 unreviewed + 40 pending rules + 18 unbaselined).
   - Branch: 1229 warnings (+7 unverified layout warnings for the 7 new stations).

---

## 8. Item 6: Process List & e2e Investigation

### Process & Port Inspection Before e2e:
- **Port 3000**: In use (`:::3000`, PID 41964: `next dev` launched under `npm run dev` by the user).
- **Port 3001**: Free.
- **Node Processes**: PID 40396 (`npm run dev`), PID 39112 (`next dev`), PID 41964 (`next-server`), and language-server/IDE sidecars. No orphaned Playwright processes.
- **Process Rule**: Per safety rule *"Stop only processes you started"*, PID 41964 was left running.

### e2e Run Result on Branch:
- **Summary**: `playwright test` exited with code 1.
- **Error Output**:
  ```
  [WebServer]  ⨯ Failed to start server
  [WebServer] Error: listen EADDRINUSE: address already in use :::3000
      at <unknown> (Error: listen EADDRINUSE: address already in use :::3000)
  Error: Process from config.webServer exited early.
  ```

### e2e Run Result on Clean `3e607d7` Worktree:
- **Summary**: `playwright test` exited with code 1.
- **Error Output**:
  ```
  [WebServer]  ⨯ Failed to start server
  [WebServer] Error: listen EADDRINUSE: address already in use :::3000
      at <unknown> (Error: listen EADDRINUSE: address already in use :::3000)
  Error: Process from config.webServer exited early.
  ```
- **Conclusion**: The e2e failure is 100% caused by port 3000 contention with the pre-existing user `npm run dev` session, occurring identically on master `3e607d7` and on the branch.

---

## 9. Comprehensive Suite Status Table

| Suite | Status | Exit Code | Notes |
|---|---|---|---|
| `validate:data` | **PASS** | 0 | 21 cities, 58 lines, 77 segments, 917 stations |
| `lint` | **PASS** | 0 | 0 errors, 0 warnings |
| `typecheck` | **PASS** | 0 | 0 errors |
| `unit` | **PASS** | 0 | 35 files passed, 323 tests passed |
| `e2e` | **FAIL** | 1 | `EADDRINUSE: :::3000` (port in use by pre-existing background process) |
| `build` | **PASS** | 0 | 28/28 static pages generated and exported |
