# Delhi Pink Line Phase 4 Alignment & Opt-In Trimming Report (v5)

**Date**: 2026-10-18  
**Branch**: `data/delhi-pink-phase4-v2`  
**Base Commit**: `3e607d7`  
**HEAD Commit**: `2856471`  

---

## Deviations
- **Port 3000 Occupied (E2E marked NOT RUN)**: As mandated by step 5 instructions, ports 3000 and 3001 were inspected before running Playwright e2e tests. Port 3000 is occupied in `Listen` state by PID `27452` (`node.exe`). Consequently, E2E tests were marked **NOT RUN**.
- **Test File Import Cleanup (`2856471`)**: `__tests__/endpoint-trim.test.ts` was initially written with `import type { OverpassResponse } from "@/types/overpass"`. Running `npm run typecheck` failed because `@/types/overpass` does not exist as an independent module file in the codebase. An additional clean commit (`2856471`) was made without amending history to remove this invalid import and use the structural object directly, allowing `typecheck` to exit 0.

---

## 1. Explanation of Uncommitted Changes Before Touching Them

### (a) `git diff --stat data/segments.geojson data/stations.geojson` (at HEAD `b2ab868`)

```text
 data/segments.geojson | 15713 ++++++++++++++++++++++++------------------------
 data/stations.geojson |   506 +-
 2 files changed, 8121 insertions(+), 8098 deletions(-)
```

### (b) Semantic Per-Feature Diff Script and Output

#### Complete Diff Script Executed:
```javascript
const fs = require('fs');
const execSync = require('child_process').execSync;

function loadGitJson(commit, file) {
  const content = execSync('git show ' + commit + ':' + file, { maxBuffer: 100 * 1024 * 1024 }).toString('utf8');
  return JSON.parse(content);
}

function normalizeKey(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(normalizeKey);
  const sorted = {};
  for (const k of Object.keys(obj).sort()) {
    sorted[k] = normalizeKey(obj[k]);
  }
  return sorted;
}

function compareObjects(a, b) {
  return JSON.stringify(normalizeKey(a)) === JSON.stringify(normalizeKey(b));
}

function runDiff(fileA, fileB, idKey, labelA, labelB) {
  const mapA = new Map();
  const mapB = new Map();
  for (const f of fileA.features || fileA) {
    const id = f.properties ? f.properties[idKey] : f.id;
    mapA.set(id, f);
  }
  for (const f of fileB.features || fileB) {
    const id = f.properties ? f.properties[idKey] : f.id;
    mapB.set(id, f);
  }
  const allIds = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort();
  const results = [];
  for (const id of allIds) {
    const fa = mapA.get(id);
    const fb = mapB.get(id);
    if (!fa) {
      results.push({ id, city: fb.properties?.city_id || fb.city, status: 'added_in_' + labelB });
      continue;
    }
    if (!fb) {
      results.push({ id, city: fa.properties?.city_id || fa.city, status: 'removed_in_' + labelB });
      continue;
    }
    const geomSame = compareObjects(fa.geometry, fb.geometry);
    const propsA = fa.properties || fa;
    const propsB = fb.properties || fb;
    const allProps = Array.from(new Set([...Object.keys(propsA), ...Object.keys(propsB)])).sort();
    const propDiffs = [];
    for (const p of allProps) {
      if (p === 'geometry') continue;
      if (!compareObjects(propsA[p], propsB[p])) {
        propDiffs.push({ prop: p, valA: propsA[p], valB: propsB[p] });
      }
    }
    const rawDiff = JSON.stringify(fa) !== JSON.stringify(fb);
    const semanticSame = (geomSame !== undefined ? geomSame : true) && propDiffs.length === 0;
    if (!semanticSame || rawDiff) {
      results.push({
        id,
        city: fa.properties?.city_id || fb.properties?.city_id || fa.city || fb.city || 'unknown',
        geomSame,
        propDiffs,
        semanticSame,
        onlyFormattingOrKeyOrder: semanticSame && rawDiff
      });
    }
  }
  return results;
}

const workSegs = JSON.parse(fs.readFileSync('data/segments.geojson', 'utf8'));
const headSegs = loadGitJson('HEAD', 'data/segments.geojson');
const baseSegs = loadGitJson('3e607d7', 'data/segments.geojson');

const workStns = JSON.parse(fs.readFileSync('data/stations.geojson', 'utf8'));
const headStns = loadGitJson('HEAD', 'data/stations.geojson');
const baseStns = loadGitJson('3e607d7', 'data/stations.geojson');

const workLines = JSON.parse(fs.readFileSync('data/lines.json', 'utf8'));
const headLines = loadGitJson('HEAD', 'data/lines.json');
const baseLines = loadGitJson('3e607d7', 'data/lines.json');

console.log('=== 1. WORKING TREE vs HEAD ===');
console.log('--- Segments (keyed on properties.segment_id) ---');
console.log(JSON.stringify(runDiff(headSegs, workSegs, 'segment_id', 'HEAD', 'WORK'), null, 2));

console.log('--- Stations (keyed on properties.station_id) ---');
console.log(JSON.stringify(runDiff(headStns, workStns, 'station_id', 'HEAD', 'WORK'), null, 2));

console.log('--- Lines (keyed on id) ---');
console.log(JSON.stringify(runDiff(headLines, workLines, 'id', 'HEAD', 'WORK'), null, 2));

console.log('=== 2. WORKING TREE vs 3e607d7 ===');
console.log('--- Segments (keyed on properties.segment_id) ---');
console.log(JSON.stringify(runDiff(baseSegs, workSegs, 'segment_id', '3e607d7', 'WORK'), null, 2));

console.log('--- Stations (keyed on properties.station_id) ---');
console.log(JSON.stringify(runDiff(baseStns, workStns, 'station_id', '3e607d7', 'WORK'), null, 2));

console.log('--- Lines (keyed on id) ---');
console.log(JSON.stringify(runDiff(baseLines, workLines, 'id', '3e607d7', 'WORK'), null, 2));
```

#### Complete Output:
```text
=== 1. WORKING TREE vs HEAD ===
--- Segments (keyed on properties.segment_id) ---
[
  {
    "id": "blr-green-seg-01",
    "city": "bengaluru",
    "geomSame": false,
    "propDiffs": [
      {
        "prop": "length_km",
        "valA": 33.1,
        "valB": 30
      },
      {
        "prop": "stations_count",
        "valA": 32,
        "valB": 29
      }
    ],
    "semanticSame": false,
    "onlyFormattingOrKeyOrder": false
  },
  {
    "id": "del-pink-seg-01",
    "city": "delhi",
    "geomSame": false,
    "propDiffs": [
      {
        "prop": "length_km",
        "valA": 57.8,
        "valB": 57.3
      }
    ],
    "semanticSame": false,
    "onlyFormattingOrKeyOrder": false
  },
  {
    "id": "del-pink-seg-02",
    "city": "delhi",
    "geomSame": false,
    "propDiffs": [
      {
        "prop": "length_km",
        "valA": 13.3,
        "valB": 13.4
      },
      {
        "prop": "references",
        "valA": [
          "https://delhimetrorail.com/pages/about-us/present-network",
          "https://www.openstreetmap.org/way/1181394345"
        ],
        "valB": [
          "https://delhimetrorail.com/pages/about-us/present-network",
          "https://www.openstreetmap.org/way/1183304781",
          "https://www.openstreetmap.org/way/364876209",
          "https://www.openstreetmap.org/way/1181394345",
          "https://www.openstreetmap.org/way/1181485297",
          "https://www.openstreetmap.org/way/538930434",
          "https://www.openstreetmap.org/way/1184476784"
        ]
      }
    ],
    "semanticSame": false,
    "onlyFormattingOrKeyOrder": false
  }
]
--- Stations (keyed on properties.station_id) ---
[
  {
    "id": "hyderabad-jbs-parade-ground",
    "city": "hyderabad",
    "geomSame": true,
    "propDiffs": [
      {
        "prop": "interchange_id",
        "valB": "int-hyderabad-parade-ground"
      },
      {
        "prop": "is_interchange",
        "valA": false,
        "valB": true
      }
    ],
    "semanticSame": false,
    "onlyFormattingOrKeyOrder": false
  },
  {
    "id": "hyderabad-parade-ground",
    "city": "hyderabad",
    "geomSame": true,
    "propDiffs": [
      {
        "prop": "interchange_id",
        "valB": "int-hyderabad-parade-ground"
      },
      {
        "prop": "is_interchange",
        "valA": false,
        "valB": true
      }
    ],
    "semanticSame": false,
    "onlyFormattingOrKeyOrder": false
  },
  {
    "id": "mum-andheri-west",
    "city": "mumbai",
    "geomSame": true,
    "propDiffs": [
      {
        "prop": "interchange_id",
        "valB": "int-mumbai-dn-nagar-andheri-west"
      },
      {
        "prop": "is_interchange",
        "valA": false,
        "valB": true
      }
    ],
    "semanticSame": false,
    "onlyFormattingOrKeyOrder": false
  },
  {
    "id": "mum-d-n-nagar",
    "city": "mumbai",
    "geomSame": true,
    "propDiffs": [
      {
        "prop": "interchange_id",
        "valB": "int-mumbai-dn-nagar-andheri-west"
      },
      {
        "prop": "is_interchange",
        "valA": false,
        "valB": true
      }
    ],
    "semanticSame": false,
    "onlyFormattingOrKeyOrder": false
  },
  {
    "id": "mum-gundavali",
    "city": "mumbai",
    "geomSame": true,
    "propDiffs": [
      {
        "prop": "interchange_id",
        "valB": "int-mumbai-weh-gundavali"
      },
      {
        "prop": "is_interchange",
        "valA": false,
        "valB": true
      }
    ],
    "semanticSame": false,
    "onlyFormattingOrKeyOrder": false
  },
  {
    "id": "mum-western-express-highway",
    "city": "mumbai",
    "geomSame": true,
    "propDiffs": [
      {
        "prop": "interchange_id",
        "valB": "int-mumbai-weh-gundavali"
      },
      {
        "prop": "is_interchange",
        "valA": false,
        "valB": true
      }
    ],
    "semanticSame": false,
    "onlyFormattingOrKeyOrder": false
  }
]
--- Lines (keyed on id) ---
[]
=== 2. WORKING TREE vs 3e607d7 ===
--- Segments (keyed on properties.segment_id) ---
[
  {
    "id": "blr-green-seg-01",
    "city": "bengaluru",
    "geomSame": false,
    "propDiffs": [
      {
        "prop": "length_km",
        "valA": 33.1,
        "valB": 30
      },
      {
        "prop": "stations_count",
        "valA": 32,
        "valB": 29
      }
    ],
    "semanticSame": false,
    "onlyFormattingOrKeyOrder": false
  },
  {
    "id": "del-pink-seg-02",
    "city": "delhi",
    "status": "added_in_WORK"
  }
]
--- Stations (keyed on properties.station_id) ---
[
  {
    "id": "del-bhajanpura",
    "city": "delhi",
    "status": "added_in_WORK"
  },
  {
    "id": "del-burari",
    "city": "delhi",
    "status": "added_in_WORK"
  },
  {
    "id": "del-jagatpur-village",
    "city": "delhi",
    "status": "added_in_WORK"
  },
  {
    "id": "del-jharoda-majra",
    "city": "delhi",
    "status": "added_in_WORK"
  },
  {
    "id": "del-khajuri-khas",
    "city": "delhi",
    "status": "added_in_WORK"
  },
  {
    "id": "del-soorghat",
    "city": "delhi",
    "status": "added_in_WORK"
  },
  {
    "id": "del-yamuna-vihar",
    "city": "delhi",
    "status": "added_in_WORK"
  },
  {
    "id": "hyderabad-jbs-parade-ground",
    "city": "hyderabad",
    "geomSame": true,
    "propDiffs": [
      {
        "prop": "interchange_id",
        "valB": "int-hyderabad-parade-ground"
      },
      {
        "prop": "is_interchange",
        "valA": false,
        "valB": true
      }
    ],
    "semanticSame": false,
    "onlyFormattingOrKeyOrder": false
  },
  {
    "id": "hyderabad-parade-ground",
    "city": "hyderabad",
    "geomSame": true,
    "propDiffs": [
      {
        "prop": "interchange_id",
        "valB": "int-hyderabad-parade-ground"
      },
      {
        "prop": "is_interchange",
        "valA": false,
        "valB": true
      }
    ],
    "semanticSame": false,
    "onlyFormattingOrKeyOrder": false
  },
  {
    "id": "mum-andheri-west",
    "city": "mumbai",
    "geomSame": true,
    "propDiffs": [
      {
        "prop": "interchange_id",
        "valB": "int-mumbai-dn-nagar-andheri-west"
      },
      {
        "prop": "is_interchange",
        "valA": false,
        "valB": true
      }
    ],
    "semanticSame": false,
    "onlyFormattingOrKeyOrder": false
  },
  {
    "id": "mum-d-n-nagar",
    "city": "mumbai",
    "geomSame": true,
    "propDiffs": [
      {
        "prop": "interchange_id",
        "valB": "int-mumbai-dn-nagar-andheri-west"
      },
      {
        "prop": "is_interchange",
        "valA": false,
        "valB": true
      }
    ],
    "semanticSame": false,
    "onlyFormattingOrKeyOrder": false
  },
  {
    "id": "mum-gundavali",
    "city": "mumbai",
    "geomSame": true,
    "propDiffs": [
      {
        "prop": "interchange_id",
        "valB": "int-mumbai-weh-gundavali"
      },
      {
        "prop": "is_interchange",
        "valA": false,
        "valB": true
      }
    ],
    "semanticSame": false,
    "onlyFormattingOrKeyOrder": false
  },
  {
    "id": "mum-western-express-highway",
    "city": "mumbai",
    "geomSame": true,
    "propDiffs": [
      {
        "prop": "interchange_id",
        "valB": "int-mumbai-weh-gundavali"
      },
      {
        "prop": "is_interchange",
        "valA": false,
        "valB": true
      }
    ],
    "semanticSame": false,
    "onlyFormattingOrKeyOrder": false
  }
]
--- Lines (keyed on id) ---
[]
```

### (c) Specific Feature Analysis
1. **`blr-green-seg-01`**:
   - In `3e607d7` and `HEAD`, `blr-green-seg-01` declared `endpoint_station_ids: ["blr-silk-institute", "blr-nagasandra"]`.
   - When endpoint trimming was un-gated (in commit `ee6d54c`), the pipeline automatically trimmed `blr-green-seg-01` between those two stations, shortening it from 33.1 km (32 stations, 458 coordinates) to 30.0 km (29 stations, 435 coordinates).
   - This proved that the trimming was not opt-in and modified Bengaluru without authorization.
2. **`mum-d-n-nagar` & `hyderabad-parade-ground`**:
   - In `3e607d7` (and HEAD), `data/stations.geojson` had not been rebuilt after commit `1014e30` added manual cross-corridor cluster entries to `data/overrides/interchanges.json`.
   - When the pipeline script ran, `mergeCityOverrides` applied `interchanges.json` and assigned `is_interchange: true` and `interchange_id` to these 6 stations (`mum-d-n-nagar`, `mum-andheri-west`, `mum-western-express-highway`, `mum-gundavali`, `hyderabad-parade-ground`, `hyderabad-jbs-parade-ground`).
   - The station coordinates (geometry) remained 100% identical.

---

## 2. Opt-In Endpoint Station Trimming Implementation

### (a) Changes Made
- In `scripts/pipeline/merge-overrides.ts`:
  - Updated `CityOverrideData` interface to include `trim_to_endpoints?: boolean`.
  - Replaced the trimming trigger with:
    ```typescript
    const endpointIds = iseg.segOverride.endpoint_station_ids;
    if (
      iseg.segOverride.trim_to_endpoints &&
      endpointIds &&
      endpointIds.length === 2
    ) {
      // Endpoint station projection trimming
    } else if (!isClosedLoop && first.position !== last.position) {
      // Pre-existing 3e607d7 lineSlice between first and last projected stations
      iseg.coords = lineSlice(first.point, last.point, coords);
    }
    ```
- In `data/overrides/delhi.json`:
  - Added `"trim_to_endpoints": true` solely to `del-pink-seg-01`.
- In `__tests__/endpoint-trim.test.ts`:
  - Asserted both cases:
    1. Flag ON (`trim_to_endpoints: true`): Trims polyline to declared endpoint stations Alpha (77.1) and Gamma (77.3).
    2. Flag OFF (`trim_to_endpoints` absent): Reverts to 3e607d7 behavior slicing between first and last projected line stations (Alpha 77.1 to Delta 77.4).
- Committed as clean commit `d6679f2` (with test typing fix in `2856471`).

### (b) Complete `__tests__/endpoint-trim.test.ts` File
```typescript
import { describe, it, expect } from "vitest";
import { mergeCityOverrides, type CityOverrideData } from "@/scripts/pipeline/merge-overrides";
import { normalizeOverpassCity } from "@/scripts/pipeline/normalize";

describe("Endpoint Station Trimming", () => {
  // Polyline running west to east: (77.0, 28.0) -> (77.1, 28.0) -> (77.2, 28.0) -> (77.3, 28.0) -> (77.4, 28.0)
  // Station Alpha at 77.1, Beta at 77.2, Gamma at 77.3, Delta at 77.4
  const rawOverpass = {
    version: 0.6,
    generator: "test",
    osm3s: { timestamp_osm_base: "2026-10-17T00:00:00Z" },
    elements: [
      {
        type: "relation",
        id: 999001,
        tags: {
          type: "route",
          route: "subway",
          name: "Test Subway Line",
          colour: "#FF00FF",
        },
        members: [
          {
            type: "way",
            ref: 101,
            role: "",
            geometry: [
              { lat: 28.0, lon: 77.0 },
              { lat: 28.0, lon: 77.1 },
              { lat: 28.0, lon: 77.2 },
              { lat: 28.0, lon: 77.3 },
              { lat: 28.0, lon: 77.4 },
            ],
          },
          { type: "node", ref: 201, role: "stop" },
          { type: "node", ref: 202, role: "stop" },
          { type: "node", ref: 203, role: "stop" },
          { type: "node", ref: 204, role: "stop" },
        ],
      },
      {
        type: "node",
        id: 201,
        lat: 28.0,
        lon: 77.1,
        tags: { name: "Station Alpha", railway: "station" },
      },
      {
        type: "node",
        id: 202,
        lat: 28.0,
        lon: 77.2,
        tags: { name: "Station Beta", railway: "station" },
      },
      {
        type: "node",
        id: 203,
        lat: 28.0,
        lon: 77.3,
        tags: { name: "Station Gamma", railway: "station" },
      },
      {
        type: "node",
        id: 204,
        lat: 28.0,
        lon: 77.4,
        tags: { name: "Station Delta", railway: "station" },
      },
    ],
  };

  it("trims coordinates between projections of two specified endpoint stations when trim_to_endpoints is true", () => {
    const normalized = normalizeOverpassCity("testcity", rawOverpass);

    const overrides: CityOverrideData = {
      city: {
        id: "testcity",
        name: "Test City",
        bbox: [76.9, 27.9, 77.5, 28.5],
        operator: "Test Operator",
        phases: ["Phase 1"],
      },
      lines: [
        {
          id: "test-line",
          name: "Test Line",
          city: "Test City",
          city_id: "testcity",
          color: "#FF00FF",
          operator: "Test Operator",
          source: "osm",
        },
      ],
      segments: [
        {
          osmId: 999001,
          segment_id: "test-seg-01",
          line_id: "test-line",
          line_name: "Test Line",
          phase: "Phase 1",
          status: "operational",
          gauge: "standard",
          inaugurated_on: "2024-01-01",
          expected_completion: null,
          color: "#FF00FF",
          // Opt-in flag ON: endpoints specify Alpha (77.1) and Gamma (77.3)
          trim_to_endpoints: true,
          endpoint_station_ids: ["testcity-station-alpha", "testcity-station-gamma"],
        },
      ],
    };

    const merged = mergeCityOverrides(normalized, overrides);
    const seg = merged.segments.find((s) => s.properties.segment_id === "test-seg-01");
    expect(seg).toBeDefined();

    // The coords should start near Alpha (77.1, 28.0) and end near Gamma (77.3, 28.0)
    // rather than extending to Delta (77.4)
    const coords = seg!.geometry.coordinates;
    expect(coords[0][0]).toBeCloseTo(77.1, 4);
    expect(coords[0][1]).toBeCloseTo(28.0, 4);
    expect(coords[coords.length - 1][0]).toBeCloseTo(77.3, 4);
    expect(coords[coords.length - 1][1]).toBeCloseTo(28.0, 4);
  });

  it("leaves coordinates untrimmed by endpoint stations when trim_to_endpoints is absent or false", () => {
    const normalized = normalizeOverpassCity("testcity", rawOverpass);

    const overrides: CityOverrideData = {
      city: {
        id: "testcity",
        name: "Test City",
        bbox: [76.9, 27.9, 77.5, 28.5],
        operator: "Test Operator",
        phases: ["Phase 1"],
      },
      lines: [
        {
          id: "test-line",
          name: "Test Line",
          city: "Test City",
          city_id: "testcity",
          color: "#FF00FF",
          operator: "Test Operator",
          source: "osm",
        },
      ],
      segments: [
        {
          osmId: 999001,
          segment_id: "test-seg-01",
          line_id: "test-line",
          line_name: "Test Line",
          phase: "Phase 1",
          status: "operational",
          gauge: "standard",
          inaugurated_on: "2024-01-01",
          expected_completion: null,
          color: "#FF00FF",
          // Opt-in flag OFF (absent)
          endpoint_station_ids: ["testcity-station-alpha", "testcity-station-gamma"],
        },
      ],
    };

    const merged = mergeCityOverrides(normalized, overrides);
    const seg = merged.segments.find((s) => s.properties.segment_id === "test-seg-01");
    expect(seg).toBeDefined();

    // Default 3e607d7 behavior: slices between first and last projected line stations (Alpha 77.1 to Delta 77.4)
    // endpoint_station_ids are NOT used to trim when trim_to_endpoints is absent.
    const coords = seg!.geometry.coordinates;
    expect(coords[0][0]).toBeCloseTo(77.1, 4);
    expect(coords[0][1]).toBeCloseTo(28.0, 4);
    expect(coords[coords.length - 1][0]).toBeCloseTo(77.4, 4);
    expect(coords[coords.length - 1][1]).toBeCloseTo(28.0, 4);
  });
});
```

### (c) Full Commit Diff of `d6679f2`
```diff
diff --git a/__tests__/endpoint-trim.test.ts b/__tests__/endpoint-trim.test.ts
index 1717530..ffcce53 100644
--- a/__tests__/endpoint-trim.test.ts
+++ b/__tests__/endpoint-trim.test.ts
@@ -2,10 +2,12 @@ import { describe, it, expect } from "vitest";
 import { mergeCityOverrides, type CityOverrideData } from "@/scripts/pipeline/merge-overrides";
 import { normalizeOverpassCity } from "@/scripts/pipeline/normalize";
 
 describe("Endpoint Station Trimming", () => {
-  it("trims coordinates between projections of two specified endpoint stations", () => {
-    // Polyline running west to east: (77.0, 28.0) -> (77.1, 28.0) -> (77.2, 28.0) -> (77.3, 28.0) -> (77.4, 28.0)
-    const rawOverpass = {
+  // Polyline running west to east: (77.0, 28.0) -> (77.1, 28.0) -> (77.2, 28.0) -> (77.3, 28.0) -> (77.4, 28.0)
+  // Station Alpha at 77.1, Beta at 77.2, Gamma at 77.3, Delta at 77.4
+  const rawOverpass = {
       version: 0.6,
       generator: "test",
       osm3s: { timestamp_osm_base: "2026-10-17T00:00:00Z" },
@@ -35,6 +37,7 @@ describe("Endpoint Station Trimming", () => {
             { type: "node", ref: 201, role: "stop" },
             { type: "node", ref: 202, role: "stop" },
             { type: "node", ref: 203, role: "stop" },
+            { type: "node", ref: 204, role: "stop" },
           ],
         },
         // Stations: Node 201 at 77.1, Node 202 at 77.2, Node 203 at 77.3
@@ -60,6 +63,13 @@ describe("Endpoint Station Trimming", () => {
           lon: 77.3,
           tags: { name: "Station Gamma", railway: "station" },
         },
+        {
+          type: "node",
+          id: 204,
+          lat: 28.0,
+          lon: 77.4,
+          tags: { name: "Station Delta", railway: "station" },
+        },
       ],
     };
 
+  it("trims coordinates between projections of two specified endpoint stations when trim_to_endpoints is true", () => {
     const normalized = normalizeOverpassCity("testcity", rawOverpass);
 
     const overrides: CityOverrideData = {
@@ -95,6 +105,7 @@ describe("Endpoint Station Trimming", () => {
           inaugurated_on: "2024-01-01",
           expected_completion: null,
           color: "#FF00FF",
-          // Exactly two endpoint stations: Station Alpha and Station Gamma
+          // Opt-in flag ON: endpoints specify Alpha (77.1) and Gamma (77.3)
+          trim_to_endpoints: true,
           endpoint_station_ids: ["testcity-station-alpha", "testcity-station-gamma"],
         },
       ],
@@ -108,6 +119,56 @@ describe("Endpoint Station Trimming", () => {
     expect(coords[0][0]).toBeCloseTo(77.1, 4);
     expect(coords[0][1]).toBeCloseTo(28.0, 4);
     expect(coords[coords.length - 1][0]).toBeCloseTo(77.3, 4);
     expect(coords[coords.length - 1][1]).toBeCloseTo(28.0, 4);
   });
+
+  it("leaves coordinates untrimmed by endpoint stations when trim_to_endpoints is absent or false", () => {
+    const normalized = normalizeOverpassCity("testcity", rawOverpass);
+
+    const overrides: CityOverrideData = {
+      city: {
+        id: "testcity",
+        name: "Test City",
+        bbox: [76.9, 27.9, 77.5, 28.5],
+        operator: "Test Operator",
+        phases: ["Phase 1"],
+      },
+      lines: [
+        {
+          id: "test-line",
+          name: "Test Line",
+          city: "Test City",
+          city_id: "testcity",
+          color: "#FF00FF",
+          operator: "Test Operator",
+          source: "osm",
+        },
+      ],
+      segments: [
+        {
+          osmId: 999001,
+          segment_id: "test-seg-01",
+          line_id: "test-line",
+          line_name: "Test Line",
+          phase: "Phase 1",
+          status: "operational",
+          gauge: "standard",
+          inaugurated_on: "2024-01-01",
+          expected_completion: null,
+          color: "#FF00FF",
+          // Opt-in flag OFF (absent)
+          endpoint_station_ids: ["testcity-station-alpha", "testcity-station-gamma"],
+        },
+      ],
+    };
+
+    const merged = mergeCityOverrides(normalized, overrides);
+    const seg = merged.segments.find((s) => s.properties.segment_id === "test-seg-01");
+    expect(seg).toBeDefined();
+
+    // Default 3e607d7 behavior: slices between first and last projected line stations (Alpha 77.1 to Delta 77.4)
+    // endpoint_station_ids are NOT used to trim when trim_to_endpoints is absent.
+    const coords = seg!.geometry.coordinates;
+    expect(coords[0][0]).toBeCloseTo(77.1, 4);
+    expect(coords[0][1]).toBeCloseTo(28.0, 4);
+    expect(coords[coords.length - 1][0]).toBeCloseTo(77.4, 4);
+    expect(coords[coords.length - 1][1]).toBeCloseTo(28.0, 4);
+  });
 });
diff --git a/data/overrides/delhi.json b/data/overrides/delhi.json
index 5808bc4..b0be768 100644
--- a/data/overrides/delhi.json
+++ b/data/overrides/delhi.json
@@ -232,6 +232,7 @@
       "expected_completion": null,
       "color": "#FC8EAC",
       "city_id": "delhi",
+      "trim_to_endpoints": true,
       "endpoint_station_ids": [
         "del-shiv-vihar",
         "del-majlis-park"
diff --git a/scripts/pipeline/merge-overrides.ts b/scripts/pipeline/merge-overrides.ts
index 4457c15..543a0d8 100644
--- a/scripts/pipeline/merge-overrides.ts
+++ b/scripts/pipeline/merge-overrides.ts
@@ -107,6 +107,7 @@ export interface CityOverrideData {
     geometry_quality?: "exact" | "schematic";
     shared_corridor?: SharedCorridor;
     endpoint_station_ids?: string[];
+    trim_to_endpoints?: boolean;
     stations_not_published?: boolean;
   }>;
   interchangeStationNames?: string[];
@@ -555,7 +556,11 @@ export function mergeCityOverrides(
       haversineDistanceM(coords[0], coords[coords.length - 1]) <= 50;
 
     const endpointIds = iseg.segOverride.endpoint_station_ids;
-    if (endpointIds && endpointIds.length === 2) {
+    if (
+      iseg.segOverride.trim_to_endpoints &&
+      endpointIds &&
+      endpointIds.length === 2
+    ) {
       const st1 = stationsWithLines.find((sw) => sw.st.id === endpointIds[0]);
       const st2 = stationsWithLines.find((sw) => sw.st.id === endpointIds[1]);
       if (st1 && st2) {
```

---

## 3. 21 Cities Rebuild and Semantic Diff vs `3e607d7`

Rebuilt all 21 cities with `npm run pipeline:all`.

### Semantic Comparison Results vs `3e607d7`:
- **Segments**:
  - `del-pink-seg-02`: Added in working tree (Phase 4).
  - **All other 76 segments**: Exactly identical to `3e607d7` in both geometry and properties. (`blr-green-seg-01` and `del-pink-seg-01` match `3e607d7` 100%).
- **Stations**:
  - Exactly 7 new stations added: `del-bhajanpura`, `del-burari`, `del-jagatpur-village`, `del-jharoda-majra`, `del-khajuri-khas`, `del-soorghat`, `del-yamuna-vihar`.
  - 6 stations have properties matching commit `1014e30` (`interchanges.json` cluster IDs) with 100% identical coordinates.
- **Lines**:
  - 0 differences vs `3e607d7`.
- **Cities**:
  - 0 differences vs `3e607d7`.

All differences are strictly within the allowed set. Step 3 **PASSED**.

---

## 4. Overlap Analysis (`del-pink-seg-01` and `del-pink-seg-02`)

### (a) Overlap Interval Coordinates, Index Ranges & Length
- **`del-pink-seg-02`**:
  - Index range: `[0, 174]` (full compiled segment length: 175 coordinates, 13411.64 m).
  - Overlap interval in `seg-02`: from node at index 160 (`[77.2813121, 28.6957428]`, near Yamuna Vihar/Maujpur approach) to index 174 (`[77.27969, 28.69209]`, Maujpur-Babarpur terminal).
  - Start coordinate: `[77.2813121, 28.6957428]`
  - End coordinate: `[77.27969, 28.69209]`
  - Measured parallel distance: **~1199 m** along twin tracks within 60 m.
- **`del-pink-seg-01`**:
  - Nearest vertex indices in `seg-01`: indices `[19, 28]` (near Maujpur-Babarpur).
  - Start coordinate: `[77.2817071, 28.6959929]`
  - End coordinate: `[77.2792351, 28.6912174]`

### (b) OSM Way IDs Used in That Interval
- **Ways in `seg-02`**: Way `1184476784` (reversed, sliced from Maujpur-Babarpur stop `13628489705` northward to way `538930434` at Yamuna Vihar).
- **Ways in `seg-01`**: Way `642636563` (the first way in `seg-01`'s `orderedWayIds`, running south from Gokulpuri through Maujpur towards Jaffrabad) alongside short connecting ways `1184476776`, `1184476788`, and `1184476778`.
- **Why `642636563` was named**: In Phase 3 (`seg-01`), relation `8241298` starts at Shiv Vihar and reaches Maujpur via way `642636563`. When Phase 4 extension (`seg-02`) loops in from Majlis Park via Yamuna Vihar into Maujpur-Babarpur, OSM relation `8241298` uses way `1184476784` for the northbound/loop connection.
- **Twin Tracks**: Yes, ways `1184476784` and `642636563` represent the separate directional tracks (twin tracks) of the elevated viaduct corridor between Maujpur-Babarpur and the Yamuna Vihar junction.
- **Nearest Stations at Both Ends**:
  - Northern end of overlap: **Yamuna Vihar** (`del-yamuna-vihar`, ~836 m north) and **Gokulpuri** (`del-gokulpuri`, ~880 m north-east).
  - Southern end of overlap: **Maujpur-Babarpur** (`del-maujpur-babarpur`, 0 m / 17 m at station point).

### (c) Audit Rule Analysis & `overlapMatchesSharedCorridor`

#### Quoted Audit Rule (`scripts/audit/audit-engine.ts:591-599` & `1939-1951`):
```typescript
  function overlapMatchesSharedCorridor(
    segA: SegmentFeature,
    segB: SegmentFeature,
    measuredM: number
  ): boolean {
    const declaredM = declaredSharedCorridorLengthM(segA, segB);
    return Boolean(
      declaredM && Math.abs(measuredM - declaredM) / declaredM <= 0.15
    );
  }

  // Lines 1939-1951:
  if (
    sharedParallelM >= cfg.parallelDuplicateMinSharedM &&
    !isBranchJunctionApproach &&
    !overlapMatchesSharedCorridor(segA, segB, sharedParallelM)
  ) {
    add(
      cityId,
      "segment-parallel-duplicate",
      "error",
      `${segA.properties.segment_id}|${segB.properties.segment_id}`,
      `Segments run parallel within ${cfg.parallelDuplicateMaxDistM} m for ~${Math.round(sharedParallelM)} m (twin tracks)`
    );
  }
```

#### Shared Corridor Verification Logic (`declaredSharedCorridorLengthM`, lines 523-534):
```typescript
    const sharedStations = declaration.shared_station_ids.map((id) => stationById.get(id));
    if (
      sharedStations.length < 2 ||
      sharedStations.some(
        (station) =>
          !station ||
          !station.properties.line_ids.includes(segA.properties.line_id) ||
          !station.properties.line_ids.includes(segB.properties.line_id)
      )
    ) {
      return undefined;
    }
```
- **Can a shared corridor declaration legitimately mark a shared corridor between two segments of the same line?**
  - **No**. Look at line 525: `sharedStations.length < 2`. The overlap between `del-pink-seg-01` and `del-pink-seg-02` only touches **one** station: `del-maujpur-babarpur` (the merge point). To satisfy `shared_corridor`, two or more sequential stations must be shared on both segments. Here, the corridor only merges at Maujpur; the other stations on `seg-02` (Yamuna Vihar, Bhajanpura, etc.) are Phase 4 stations not on `seg-01`. Therefore, `declaredSharedCorridorLengthM` returns `undefined`.
  - Furthermore, project rules state: *"One line is one centreline. Twin-track (per-direction) geometry is merged in the pipeline and each line's length is counted once in every total."*

### (d) Pink Line Computed Length and Variance
- **`del-pink-seg-01` compiled length**: 57.286 km (57.3 km compiled)
- **`del-pink-seg-02` compiled length**: 13.412 km (13.4 km compiled)
- **Raw Sum of Segments**: 70.698 km (70.7 km compiled)
- **With Overlapped Stretch (1.199 km) Counted Once**:
  $$57.286\text{ km} + 13.412\text{ km} - 1.199\text{ km} = 69.499\text{ km}$$
- **Official Ground Truth Reference** (`data/reference/delhi.json`): 71.548 km.
- **Ground-Truth Variance**:
  $$\frac{69.499 - 71.548}{71.548} \times 100\% = -2.86\%$$
  (Well within the 5% audit threshold).

### (e) Proposed Options (Proposals only; none applied)
1. **Option A: End `seg-02` at the merge point near Maujpur / use single centreline way**:
   - Trim the duplicated 1199 m tail of way `1184476784` that runs parallel to `seg-01`'s way `642636563`, terminating `seg-02` where the tracks merge into Maujpur-Babarpur platform/junction.
   - **Audit Error**: Resolves `segment-parallel-duplicate` completely.
   - **Length**: Reduces `seg-02` by ~1.2 km (from 13.4 km to ~12.2 km), making total Pink length ~69.5 km (-2.86% variance).
   - **Station Order & Routing**: Retains Maujpur-Babarpur as endpoint. Routing graph continues to connect at Maujpur-Babarpur.
2. **Option B: Classify Pink Line topology as branched/loop junction approach in reference**:
   - In `data/reference/delhi.json`, `del-pink` is currently declared with `topology: "linear"` and 2 terminals (`Majlis Park`, `Shiv Vihar`).
   - Maujpur-Babarpur is a junction station where Phase 4 forms a Ring/Loop junction with the Phase 3 line.
   - If declared with `topology: "branched"` or loop junction with Maujpur-Babarpur as a junction terminal, check if `isBranchJunctionApproach` applies (lines 1931-1937 in `audit-engine.ts` currently requires `sharedParallelM < 600`, whereas this overlap is ~1199 m).
3. **Option C: Align single-way track for Phase 4 entry**:
   - Select OSM ways for `seg-02` that diverge immediately at Yamuna Vihar onto the physical single track alignment rather than the twin track approach way.

---

## 5. Verification Suite Results (HEAD `2856471`)

Committed regenerated data files in `cc4b134` and test typing fix in `2856471`.

### HEAD Hash Used:
`285647138d9e8f99f636fd2375865d3734ce9dde`

### Suite Results:
- **`npm run validate:data`**: **PASS**
  ```text
  🔍 Validating Indian Metro Network Tracker datasets...
  ✅ Validation Successful!
     • Cities loaded: 21
     • Lines loaded: 58
     • Segments loaded: 77
     • Stations loaded: 917
  All schema and relational integrity checks passed.
  ```
- **`npm run lint`**: **PASS** (exit code 0).
- **`npm run typecheck`**: **PASS** (exit code 0, `tsc --noEmit`).
- **`npm test`**: **PASS** (36 test files passed, 325 tests passed).
- **`npm run build`**: **PASS** (Next.js static export succeeded; 28 static pages generated).
- **`npm run audit:data`**: Complete console output below.
- **`e2e`**: **NOT RUN** (Port 3000 occupied by PID `27452`).

### Complete `npm run audit:data` Console Output:
```text
> indian-metro-tracker@0.1.0 audit:data
> tsx scripts/audit/consistency-report.ts

🔍 Running data audit...

   • [error] delhi | segment-parallel-duplicate | del-pink-seg-01|del-pink-seg-02 | Segments run parallel within 60 m for ~1199 m (twin tracks)
   • [warn] delhi | layout/suspect-default-elevated | del-bhajanpura | Station has unverified layout (requires operator station list verification)
   • [warn] delhi | layout/suspect-default-elevated | del-burari | Station has unverified layout (requires operator station list verification)
   • [warn] delhi | layout/suspect-default-elevated | del-jagatpur-village | Station has unverified layout (requires operator station list verification)
   • [warn] delhi | layout/suspect-default-elevated | del-jharoda-majra | Station has unverified layout (requires operator station list verification)
   • [warn] delhi | layout/suspect-default-elevated | del-khajuri-khas | Station has unverified layout (requires operator station list verification)
   • [warn] delhi | layout/suspect-default-elevated | del-soorghat | Station has unverified layout (requires operator station list verification)
   • [warn] delhi | layout/suspect-default-elevated | del-yamuna-vihar | Station has unverified layout (requires operator station list verification)
   • [info] delhi | last-verified-distribution | delhi | last_verified distribution: 2026-10-08: 38; 2026-10-10: 2; 2026-10-13: 1; 2026-10-17: 1; missing: 222
   • [info] gurugram | last-verified-distribution | gurugram | last_verified distribution: 2026-10-08: 13
   • [info] gurugram | segment-self-intersecting | gur-rapid-seg-01 | Segment is self-intersecting (exempted — loop line)
   • [warn] hyderabad | interchange-consistency | hyderabad-jbs-parade-ground | is_interchange is true but station is on only 1 line(s)
   • [warn] hyderabad | interchange-consistency | hyderabad-parade-ground | is_interchange is true but station is on only 1 line(s)
   • [info] hyderabad | last-verified-distribution | hyderabad | last_verified distribution: 2026-10-07: 1; 2026-10-08: 57; missing: 3
   • [info] indore | last-verified-distribution | indore | last_verified distribution: 2026-10-15: 34
   • [warn] jaipur | ground-truth-length | jai-pink | Operational length: computed 10.91 km vs reference 11.4 km (4.3%)
   • [info] jaipur | last-verified-distribution | jaipur | last_verified distribution: 2026-10-16: 12
   • [info] kanpur | last-verified-distribution | kanpur | last_verified distribution: 2026-10-16: 15
   • [info] kochi | last-verified-distribution | kochi | last_verified distribution: 2026-10-16: 26
   • [warn] kolkata | coverage-gap | kol-pink-seg-01 | Declared under construction stretch is tracked as a coverage gap: PIB reports the balance 12.5 km Baranagar–Barrackpore work is held up pending utility shifting/NOC; the override declaration has no matching compiled geometry.
   • [warn] kolkata | coverage-gap | kol-yellow|Jai Hind (Airport) - Michael Nagar | Declared under construction stretch is tracked as a coverage gap: PIB reports work is in progress, but the refreshed Kolkata cache has no Michael Nagar station node or coordinate for a sourced schematic segment.
   • [warn] kolkata | coverage-gap | kol-yellow|New Barrackpore - Barasat | Declared planned stretch is tracked as a coverage gap: PIB states this 7.5 km stretch is held up by land acquisition and encroachment issues; no verified terminal coordinates or alignment are present in the refreshed cache.
   • [warn] kolkata | ground-truth-length | kol-green | Operational length: computed 15.06 km vs reference 16.55 km (9.0%)
   • [info] kolkata | last-verified-distribution | kolkata | last_verified distribution: 2026-10-08: 21; 2026-10-13: 2; missing: 41
   • [info] lucknow | last-verified-distribution | lucknow | last_verified distribution: 2026-10-16: 22
   • [warn] mumbai | coverage-gap | mum-line-2b|Phase 2 (Chembur - DN Nagar) | Declared under construction stretch is tracked as a coverage gap: MMRDA identifies the remaining Chembur–DN Nagar phase as under construction; no matching route geometry is available in the current compiled data.
   • [warn] mumbai | interchange-consistency | mum-andheri-west | is_interchange is true but station is on only 1 line(s)
   • [warn] mumbai | interchange-consistency | mum-d-n-nagar | is_interchange is true but station is on only 1 line(s)
   • [warn] mumbai | interchange-consistency | mum-gundavali | is_interchange is true but station is on only 1 line(s)
   • [warn] mumbai | interchange-consistency | mum-western-express-highway | is_interchange is true but station is on only 1 line(s)
   • [info] mumbai | last-verified-distribution | mumbai | last_verified distribution: 2026-08-31: 7; 2026-10-06: 1; 2026-10-08: 33; 2026-10-10: 1; 2026-10-13: 1; missing: 56
   • [info] mumbai | station-outside-bbox-on-segment | mum-planned-seg-01 | Segment has geometry outside the city bbox
   • [warn] nagpur | coverage-gap | nag-aqua|Lokmanya Nagar to Hingna (Reach 3A extension) | Declared under construction stretch is tracked as a coverage gap: Maha Metro Phase 2 Reach 3A civil packages are awarded, but alignment geometry and station coordinates are not yet available in the compiled dataset.
   • [warn] nagpur | coverage-gap | nag-aqua|Prajapati Nagar to Transport Nagar (Reach 4A extension) | Declared under construction stretch is tracked as a coverage gap: Maha Metro Phase 2 Reach 4A civil packages are awarded, but alignment geometry and station coordinates are not yet available in the compiled dataset.
   • [warn] nagpur | coverage-gap | nag-orange|Automotive Square to Kanhan River (Reach 2B extension) | Declared under construction stretch is tracked as a coverage gap: Maha Metro Phase 2 Reach 2B civil packages are awarded, but alignment geometry and station coordinates are not yet available in the compiled dataset.
   • [warn] nagpur | coverage-gap | nag-orange|Khapri to Butibori MIDC ESR (Reach 1A extension) | Declared under construction stretch is tracked as a coverage gap: Maha Metro Phase 2 Reach 1A civil packages are awarded, but alignment geometry and station coordinates are not yet available in the compiled dataset.
   • [info] nagpur | last-verified-distribution | nagpur | last_verified distribution: 2026-10-15: 39
   • [info] navi-mumbai | last-verified-distribution | navi-mumbai | last_verified distribution: 2026-10-08: 11; missing: 1
   • [warn] noida | coverage-gap | noi-aqua|Sector 142 to Botanical Garden | Declared planned stretch is tracked as a coverage gap: NMRC lists this approved 11.56 km, 8-station corridor as an upcoming project. OSM way 538930428 is tagged railway=proposed and usage=branch, so it is not part of the operational Aqua Line and its partial proposed geometry is not compiled.
   • [info] noida | last-verified-distribution | noida | last_verified distribution: 2026-10-08: 20; 2026-10-10: 1; missing: 1
   • [info] patna | last-verified-distribution | patna | last_verified distribution: 2026-10-16: 6
   • [warn] pune | coverage-gap | pun-purple|PCMC - Nigdi (Bhakti Shakti) | Declared under construction stretch is tracked as a coverage gap: Maha Metro Phase 1A northern extension (4.41 km) is under construction; alignment geometry is not yet present in the compiled dataset.
   • [warn] pune | coverage-gap | pun-purple|Range Hill station infill | Declared under construction stretch is tracked as a coverage gap: Maha Metro infill station on operational corridor delayed by defence land clearance; station node and track alignment are not separately compiled.
   • [warn] pune | coverage-gap | pun-purple|Swargate - Katraj | Declared under construction stretch is tracked as a coverage gap: Maha Metro Phase 1B southern underground extension (5.46 km) approved/tendered; alignment geometry is not yet present in the compiled dataset.
   • [info] pune | last-verified-distribution | pune | last_verified distribution: 2026-10-08: 30; missing: 2
   • [info] pune | station-outside-bbox-on-segment | pun-line-3-seg-01 | Segment has geometry outside the city bbox
   • [info] surat | last-verified-distribution | surat | last_verified distribution: 2026-10-15: 38

❌ 1 errors and 13 un-baselined warnings remain:
   • [error] delhi | segment-parallel-duplicate | del-pink-seg-01|del-pink-seg-02 | Segments run parallel within 60 m for ~1199 m (twin tracks)
   • [warn] delhi | layout/suspect-default-elevated | del-bhajanpura | Station has unverified layout (requires operator station list verification)
   • [warn] delhi | layout/suspect-default-elevated | del-burari | Station has unverified layout (requires operator station list verification)
   • [warn] delhi | layout/suspect-default-elevated | del-jagatpur-village | Station has unverified layout (requires operator station list verification)
   • [warn] delhi | layout/suspect-default-elevated | del-jharoda-majra | Station has unverified layout (requires operator station list verification)
   • [warn] delhi | layout/suspect-default-elevated | del-khajuri-khas | Station has unverified layout (requires operator station list verification)
   • [warn] delhi | layout/suspect-default-elevated | del-soorghat | Station has unverified layout (requires operator station list verification)
   • [warn] delhi | layout/suspect-default-elevated | del-yamuna-vihar | Station has unverified layout (requires operator station list verification)
   • [warn] hyderabad | interchange-consistency | hyderabad-jbs-parade-ground | is_interchange is true but station is on only 1 line(s)
   • [warn] hyderabad | interchange-consistency | hyderabad-parade-ground | is_interchange is true but station is on only 1 line(s)
   • [warn] mumbai | interchange-consistency | mum-andheri-west | is_interchange is true but station is on only 1 line(s)
   • [warn] mumbai | interchange-consistency | mum-d-n-nagar | is_interchange is true but station is on only 1 line(s)
   • [warn] mumbai | interchange-consistency | mum-gundavali | is_interchange is true but station is on only 1 line(s)
   • [warn] mumbai | interchange-consistency | mum-western-express-highway | is_interchange is true but station is on only 1 line(s)
```

---

## 6. Specific Questions Answered

### (a) How many segment overrides declare `endpoint_station_ids`?
- **Answer**: There are exactly **7 segment overrides** declaring `endpoint_station_ids` across 4 city files:
  1. `data/overrides/bengaluru.json`: `blr-purple-seg-01` (`["blr-whitefield-kadugodi"]`)
  2. `data/overrides/bengaluru.json`: `blr-green-seg-01` (`["blr-silk-institute", "blr-nagasandra"]`)
  3. `data/overrides/chennai.json`: `che-green-seg-01` (`["chennai-chennai-central"]`)
  4. `data/overrides/delhi.json`: `del-yellow-seg-01` (`["del-samaypur-badli"]`)
  5. `data/overrides/delhi.json`: `del-pink-seg-01` (`["del-shiv-vihar", "del-majlis-park"]`)
  6. `data/overrides/delhi.json`: `del-pink-seg-02` (`["del-majlis-park", "del-maujpur-babarpur"]`)
  7. `data/overrides/indore.json`: `ind-yellow-seg-02` (`["ind-radisson-square", "ind-indore-railway"]`)
- *Why the previous report said "5 but listed 7"*: The previous report erroneously referred to "5 segment overrides" due to a counting typo while listing 7 items.

### (b) Decomposition of `seg-02`'s length (13.431 sum of parts vs 13.412 compiled)
- **Sum of Parts**:
  - The literal OSM coordinates array extracted from the 6 Overpass ways and written to `data/overrides/delhi.json` has a polyline length of **13,350.31 m** (13.350 km).
  - The straight-line distance from `del-majlis-park` station coordinates to the first OSM coordinate is **64.02 m**.
  - The straight-line distance from the last OSM coordinate to `del-maujpur-babarpur` station coordinates is **17.16 m**.
  - Sum of parts:
    $$13,350.31\text{ m} + 64.02\text{ m} + 17.16\text{ m} = 13,431.49\text{ m} = \mathbf{13.431\text{ km}}$$
- **Compiled Length**:
  - During pipeline execution, `lineSlice` projects the terminal station coordinates orthogonally onto the candidate polyline and slices it strictly between those projections (or snaps the endpoint vertices if within 1000 m).
  - Slicing and snapping to the projection points produces the finalized coordinate string of 175 vertices measuring exactly **13,411.64 m** = **13.412 km** (rounded in GeoJSON properties to `13.4 km`).

### (c) `git show --stat ee6d54c`
```text
commit ee6d54c5e18882d1887430a421e1d53e65eaf37e
Author: Anay <anayyadav009@gmail.com>
Date:   Sat Oct 17 23:35:21 2026 +0530

    feat(pipeline): trim segment coordinates between declared endpoint stations

 __tests__/endpoint-trim.test.ts     | 118 ++++++++++++++++++++++++++++++++++++
 scripts/pipeline/merge-overrides.ts |  17 +++++-
 2 files changed, 134 insertions(+), 1 deletion(-)
```

### (d) `git show --stat b2ab868`
```text
commit b2ab86830392abd993672f10ae22834987977eb5
Author: Anay <anayyadav009@gmail.com>
Date:   Sat Oct 17 23:36:06 2026 +0530

    data(delhi): rebuild del-pink-seg-02 with OSM ways from Overpass relation 8241298

 __tests__/endpoint-trim.test.ts |   4 +-
 data/overrides/delhi.json       | 657 ++++++++++++++++++++++++----------------
 2 files changed, 396 insertions(+), 265 deletions(-)
```

### (e) `git reflog -n 20`
```text
2856471 HEAD@{0}: commit: fix(test): remove non-existent OverpassResponse type import in endpoint-trim.test.ts
cc4b134 HEAD@{1}: commit: data(delhi): regenerate compiled datasets with opt-in endpoint trimming and Pink Phase 4
d6679f2 HEAD@{2}: commit: feat(pipeline): make endpoint station trimming opt-in with trim_to_endpoints flag
b2ab868 HEAD@{3}: commit (amend): data(delhi): rebuild del-pink-seg-02 with OSM ways from Overpass relation 8241298
094b2cf HEAD@{4}: commit: data(delhi): rebuild del-pink-seg-02 with OSM ways from Overpass relation 8241298
ee6d54c HEAD@{5}: commit: feat(pipeline): trim segment coordinates between declared endpoint stations
5e5c197 HEAD@{6}: commit: docs(delhi): remove unsourced 58.43 km from Pink notes and cite Phase 4 opening
2e9e66b HEAD@{7}: commit: test(delhi): update city-seo expected station and opening counts
b07616d HEAD@{8}: commit: data(delhi): add Pink Line Phase 4 segment del-pink-seg-02 and 7 stations
3e607d7 HEAD@{9}: checkout: moving from data/delhi-pink-phase4 to data/delhi-pink-phase4-v2
3e607d7 HEAD@{10}: checkout: moving from master to data/delhi-pink-phase4
3e607d7 HEAD@{11}: merge feat/m18-route-finder: Merge made by the 'ort' strategy.
2ef19d9 HEAD@{12}: checkout: moving from feat/m18-route-finder to master
3e042d7 HEAD@{13}: commit: feat(routing): enable Patna routing on Blue Line, fix lines pluralisation, and update milestone progress
3d1f8c2 HEAD@{14}: commit: feat(routing): exclude guarded lines from graph, calibrate 5m transfer penalty, and update interchange audit notes
35d13ad HEAD@{15}: commit: feat(routing): implement distance-aware transfer penalties, verify Tier 1 interchange sources, and update regression tests
1014e30 HEAD@{16}: commit: feat(routing): optimize time-first routing, add Tier 1 interchange overrides, and fix transfer counts
66534b6 HEAD@{17}: commit: feat(routing): audit operational lines, derive network guards, and verify multi-transfer routes (M18)
8d201bd HEAD@{18}: commit: feat(routing): implement client-side route finder with multi-criteria dijkstra and network guard (M18)
2ef19d9 HEAD@{19}: checkout: moving from master to feat/m18-route-finder
```

---

## 7. Git Status & Log

### `git status --short`:
```text
 M reports/data-audit/2026-10-17.json
 M reports/data-audit/2026-10-17.md
 M reports/data-audit/agra-qa-screenshot.png
 M reports/data-audit/chennai-qa-screenshot.png
 M reports/data-audit/jaipur-qa-screenshot.png
 M reports/data-audit/kanpur-qa-screenshot.png
 M reports/data-audit/kochi-qa-screenshot.png
 M reports/data-audit/kolkata-qa-screenshot.png
 M reports/data-audit/lucknow-qa-screenshot.png
 M reports/data-audit/patna-qa-screenshot.png
?? reports/data-audit/2026-10-18.json
?? reports/data-audit/2026-10-18.md
?? reports/data/
?? reports/verification/
```

### `git log -n 10 --oneline`:
```text
2856471 fix(test): remove non-existent OverpassResponse type import in endpoint-trim.test.ts
cc4b134 data(delhi): regenerate compiled datasets with opt-in endpoint trimming and Pink Phase 4
d6679f2 feat(pipeline): make endpoint station trimming opt-in with trim_to_endpoints flag
b2ab868 data(delhi): rebuild del-pink-seg-02 with OSM ways from Overpass relation 8241298
ee6d54c feat(pipeline): trim segment coordinates between declared endpoint stations
5e5c197 docs(delhi): remove unsourced 58.43 km from Pink notes and cite Phase 4 opening
2e9e66b test(delhi): update city-seo expected station and opening counts
b07616d data(delhi): add Pink Line Phase 4 segment del-pink-seg-02 and 7 stations
3e607d7 merge: feat/m18-route-finder into master
3e042d7 feat(routing): enable Patna routing on Blue Line, fix lines pluralisation, and update milestone progress
```
