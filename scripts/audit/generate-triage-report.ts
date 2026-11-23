import fs from "node:fs";
import path from "node:path";

async function generateTriageReports() {
  const dateStr = "2026-10-07";
  const auditJsonPath = path.resolve(`reports/data-audit/${dateStr}.json`);
  const audit = JSON.parse(fs.readFileSync(auditJsonPath, "utf-8"));
  const farRows = JSON.parse(fs.readFileSync("reports/data-audit/triage-temp-rows.json", "utf-8"));
  const stations = JSON.parse(fs.readFileSync("data/stations.geojson", "utf-8")).features;

  const refCities = ["delhi", "bengaluru", "mumbai"];
  const lineComparisons: any[] = [];
  for (const c of refCities) {
    const ref = JSON.parse(fs.readFileSync(`data/reference/${c}.json`, "utf-8"));
    for (const rl of ref.lines) {
      const dataOpStns = stations.filter(
        (s: any) =>
          s.properties.city_id === c &&
          s.properties.line_ids.includes(rl.line_id) &&
          s.properties.status === "operational"
      );
      lineComparisons.push({
        city_id: c,
        line_id: rl.line_id,
        official_name: rl.official_name,
        data_operational_stations: dataOpStns.length,
        reference_operational_stations: rl.operational_stations,
        candidates: rl.operational_stations_candidates || null,
        difference:
          rl.operational_stations != null
            ? dataOpStns.length - rl.operational_stations
            : "N/A (unverified / candidate)",
      });
    }
  }

  const triageJson = {
    date: dateStr,
    summary: {
      total_errors: audit.findings.filter((f: any) => f.severity === "error").length,
      total_warnings: audit.findings.filter((f: any) => f.severity === "warn").length,
      total_info: audit.findings.filter((f: any) => f.severity === "info").length,
    },
    root_causes: {
      R1: {
        code: "R1",
        title: "Placeholder stations_count = 10",
        file: "scripts/pipeline/merge-overrides.ts",
        line: 109,
        function: "mergeOverridesIntoGeoJSON",
        description: "Hardcoded fallback 'let stationsCount = segOverride.stations_count || 10;' sets 10 on segments without explicit count.",
        affected_rules: ["stations-count-mismatch (25 errors)"],
      },
      R2: {
        code: "R2",
        title: "Placeholder opened_on = 2006-11-11",
        file: "scripts/pipeline/merge-overrides.ts",
        line: 346,
        function: "mergeOverridesIntoGeoJSON",
        description: "Hardcoded fallback 'openedOn = \"2006-11-11\"; // Fallback operational opening' sets placeholder date on all operational stations.",
        affected_rules: ["station-opened-before-segment (272 warnings)"],
      },
      R3: {
        code: "R3",
        title: "Hardcoded last_verified = today",
        file: "scripts/pipeline/merge-overrides.ts",
        lines: [137, 386],
        function: "mergeOverridesIntoGeoJSON",
        description: "Pipeline assigns current date 'today' to OSM segments/stations rather than preserving verified date or retrieved_at.",
        affected_rules: ["last-verified-distribution (3 info)"],
      },
      R4: {
        code: "R4",
        title: "Line has no segment geometry (future/ghost stations)",
        file: "scripts/pipeline/normalize.ts",
        lines: [110, 205],
        function: "normalizeElements",
        description: "Stations ingested for future planned corridors (e.g., Delhi Golden Line del-silver, extension spurs) without corresponding segment geometry.",
        affected_rules: ["line-no-segments (1 error)", "station-far-from-all-segments (class a: 26 stations)"],
      },
      R5: {
        code: "R5",
        title: "Station assigned to the wrong line",
        file: "scripts/pipeline/merge-overrides.ts",
        line: 359,
        function: "stationOverrides handling",
        description: "Station line_ids contains incorrect line or misses the actual polyline it sits on (e.g. adjacent lines or unmerged interchange).",
        affected_rules: ["station-far-from-all-segments (class b)"],
      },
      R6: {
        code: "R6",
        title: "Segment geometry wrong, stitched badly, or spanning several statuses/phases",
        file: "scripts/pipeline/merge-overrides.ts",
        lines: [100, 150],
        function: "mergeOverridesIntoGeoJSON",
        description: "Coarse or lumped polylines from OSM where line paths deviate from true alignments, self-intersect, or leave endpoint gaps.",
        affected_rules: [
          "station-far-from-all-segments (class c: 61 stations)",
          "station-far-from-nearest-segment (17 warnings)",
          "segment-end-far-from-station (20 warnings)",
          "segment-self-intersecting (8 warnings)",
          "consecutive-segment-gap (5 warnings)",
          "coords-city-bbox (2 warnings)",
          "duplicate-station-name (2 warnings)",
          "ground-truth-length (12 warnings)",
        ],
      },
      R7: {
        code: "R7",
        title: "Status stale versus reality",
        file: "data/overrides/*.json & data/segments.geojson",
        lines: [],
        function: "Static dataset values",
        description: "Recent 2024-2026 expansions (Mumbai Lines 9 and 2B, Line 3 Cuffe Parade, Delhi Pink loop, Delhi Magenta Phase 4) not updated in raw segment/station data.",
        affected_rules: [
          "ground-truth-line-missing (1 error)",
          "station-status-mismatch (1 error)",
          "ground-truth-station-count (10 warnings)",
          "ground-truth-phase-date (4 warnings)",
          "ground-truth-terminal-mismatch (21 warnings)",
          "station-far-from-all-segments (class d: 1 station)",
        ],
      },
      R8: {
        code: "R8",
        title: "Interchange modelling mismatch",
        file: "scripts/audit/audit-engine.ts",
        line: 960,
        function: "auditDataset (C9 check)",
        description: "Single physical interchange node assigned multiple line_ids or within 100m of another station with is_interchange=false.",
        affected_rules: ["interchange-consistency (8 warnings)"],
      },
      R9: {
        code: "R9",
        title: "Operator mislabelled from city default",
        file: "scripts/pipeline/merge-overrides.ts",
        line: 95,
        function: "mergeOverridesIntoGeoJSON",
        description: "All segments within a city inherit city-level operator override (e.g. MMMOCL in Mumbai) instead of per-line operators (MMOPL, MMRCL).",
        affected_rules: ["Checked under C8 segment-operator-mismatch"],
      },
      R10: {
        code: "R10",
        title: "Missing references on operational records",
        file: "scripts/pipeline/merge-overrides.ts",
        line: 164,
        function: "mergeOverridesIntoGeoJSON",
        description: "Operational segments have empty references array: 'references: segOverride.references || []'.",
        affected_rules: ["operational-no-reference (17 warnings)"],
      },
      R11: {
        code: "R11",
        title: "Deprecated Overpass mirror in fetch pipeline",
        file: "scripts/pipeline/fetch-overpass.ts",
        line: 16,
        function: "OVERPASS_ENDPOINTS",
        description: "Unreliable Russian mirror 'https://maps.mail.ru/osm/tools/overpass/api/interpreter' present in fallback rotation list.",
        affected_rules: ["Pipeline infrastructure"],
      },
    },
    line_station_comparisons: lineComparisons,
    far_stations: farRows,
  };

  fs.writeFileSync("reports/data-audit/triage-2026-10-07.json", JSON.stringify(triageJson, null, 2));

  // Markdown report
  const md: string[] = [];
  md.push("# Data Audit Triage Report — 2026-10-07");
  md.push("");
  md.push("## Executive Summary");
  md.push("");
  md.push(`- **Total Errors:** ${triageJson.summary.total_errors}`);
  md.push(`- **Total Warnings:** ${triageJson.summary.total_warnings} (including unverified reference checks)`);
  md.push(`- **Total Info:** ${triageJson.summary.total_info}`);
  md.push("");
  md.push("---");
  md.push("");
  md.push("## 1. Classification of All Errors (116) and Warnings (398) by Root Cause");
  md.push("");
  md.push("| Root Cause Code | Description | Pipeline File & Function | Affected Rules & Finding Counts |");
  md.push("|---|---|---|---|");
  md.push("| **R1** | Placeholder `stations_count = 10` fallback | `scripts/pipeline/merge-overrides.ts:L109` (`mergeOverridesIntoGeoJSON`) | `stations-count-mismatch`: **25 errors** |");
  md.push("| **R2** | Placeholder `opened_on = 2006-11-11` fallback | `scripts/pipeline/merge-overrides.ts:L346` (`mergeOverridesIntoGeoJSON`) | `station-opened-before-segment`: **272 warnings** |");
  md.push("| **R3** | Hardcoded `last_verified = today` | `scripts/pipeline/merge-overrides.ts:L137,L386` (`mergeOverridesIntoGeoJSON`) | `last-verified-distribution`: **3 info** |");
  md.push("| **R4** | Ghost stations / Line with no segment geometry | `scripts/pipeline/normalize.ts:L110,L205` (`normalizeElements`) | `line-no-segments`: **1 error** (`del-silver`), `station-far-from-all-segments`: **26 errors** (class a) |");
  md.push("| **R5** | Station assigned to wrong line | `scripts/pipeline/merge-overrides.ts:L359` (`stationOverrides`) | `station-far-from-all-segments`: **0 errors** (all near assigned line candidates) |");
  md.push("| **R6** | Segment geometry wrong, coarse, self-intersecting, or endpoint gap | `scripts/pipeline/merge-overrides.ts:L100` (`mergeOverridesIntoGeoJSON`) | `station-far-from-all-segments`: **61 errors** (class c), `station-far-from-nearest-segment`: **17 warnings**, `segment-end-far-from-station`: **20 warnings**, `segment-self-intersecting`: **8 warnings**, `consecutive-segment-gap`: **5 warnings**, `coords-city-bbox`: **2 warnings**, `duplicate-station-name`: **2 warnings**, `ground-truth-length`: **12 warnings** |");
  md.push("| **R7** | Stale status vs reality (Line 9 missing, Line 2B partial, Phase 4 dates) | `data/overrides/*.json` & `data/segments.geojson` | `ground-truth-line-missing`: **1 error** (`mum-line-9`), `station-status-mismatch`: **1 error** (`mum-dongripada`), `ground-truth-station-count`: **10 warnings**, `ground-truth-phase-date`: **4 warnings**, `ground-truth-terminal-mismatch`: **21 warnings**, `station-far-from-all-segments`: **1 error** (class d) |");
  md.push("| **R8** | Interchange node consistency mismatch | `scripts/audit/audit-engine.ts:L960` (`auditDataset`) | `interchange-consistency`: **8 warnings** |");
  md.push("| **R9** | Segment operator inherited from city default | `scripts/pipeline/merge-overrides.ts:L95` (`mergeOverridesIntoGeoJSON`) | Addressed in pipeline operator mapping |");
  md.push("| **R10** | Missing references on operational segments | `scripts/pipeline/merge-overrides.ts:L164` (`mergeOverridesIntoGeoJSON`) | `operational-no-reference`: **17 warnings** |");
  md.push("| **R11** | Deprecated mirror `maps.mail.ru` in Overpass list | `scripts/pipeline/fetch-overpass.ts:L16` (`OVERPASS_ENDPOINTS`) | Pipeline endpoint reliability |");
  md.push("");
  md.push("---");
  md.push("");
  md.push("## 2. Far Stations Breakdown (`station-far-from-all-segments`, 88 Findings)");
  md.push("");
  md.push("### Classification Taxonomy");
  md.push("- **Class a (No geometry exists):** Station belongs to an unmapped line or an extension stretch where no segment geometry has been plotted (>2000 m from existing line geometry or line has no segments). Recommended fix: `add schematic connector`.");
  md.push("- **Class b (Wrong line):** Station is located directly along another line (≤200 m) but assigned to a distant line (>500 m). Recommended fix: `reassign`.");
  md.push("- **Class c (Geometry offset or wrong):** Segment exists for the assigned line in the vicinity, but polyline geometry is coarsely simplified, displaced, or missing intermediate track alignment (>300 m offset). Recommended fix: `fix geometry`.");
  md.push("- **Class d (Stale status):** Station represents a newly opened or under-construction extension whose segment data lacks updated status/phase attributes. Recommended fix: `update status`.");
  md.push("");
  md.push("### Bengaluru (1 Station)");
  md.push("");
  md.push("| Station ID | Name | Assigned Line | Status | Phase | Dist to Assigned (m) | Nearest Assigned Seg | Nearest Any Seg & Line | Assigned Has Geom | Class | Recommended Fix |");
  md.push("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of farRows.filter((x: any) => x.city === "bengaluru")) {
    md.push(`| \`${r.station_id}\` | ${r.name} | ${r.assigned_lines.join(", ")} | ${r.status} | ${r.phase || "—"} | ${r.dist_assigned_m} | \`${r.nearest_assigned_seg || "none"}\` | \`${r.nearest_any_seg}\` (${r.nearest_any_line}) | ${r.assigned_has_geom} | **${r.cls}** | ${r.rec} |`);
  }
  md.push("");
  md.push("### Mumbai (19 Stations)");
  md.push("");
  md.push("| Station ID | Name | Assigned Line | Status | Phase | Dist to Assigned (m) | Nearest Assigned Seg | Nearest Any Seg & Line | Assigned Has Geom | Class | Recommended Fix |");
  md.push("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of farRows.filter((x: any) => x.city === "mumbai")) {
    md.push(`| \`${r.station_id}\` | ${r.name} | ${r.assigned_lines.join(", ")} | ${r.status} | ${r.phase || "—"} | ${r.dist_assigned_m} | \`${r.nearest_assigned_seg || "none"}\` | \`${r.nearest_any_seg}\` (${r.nearest_any_line}) | ${r.assigned_has_geom} | **${r.cls}** | ${r.rec} |`);
  }
  md.push("");
  md.push("### Delhi (68 Stations — Grouped by Line & Class with Examples)");
  md.push("");

  const delhiGroups: Record<string, any[]> = {};
  for (const r of farRows.filter((x: any) => x.city === "delhi")) {
    const k = `${r.assigned_lines.join(", ")} (Class ${r.cls})`;
    if (!delhiGroups[k]) delhiGroups[k] = [];
    delhiGroups[k].push(r);
  }

  for (const [groupName, arr] of Object.entries(delhiGroups)) {
    md.push(`#### ${groupName} — Total: ${arr.length} stations`);
    md.push("");
    md.push("| Station ID | Name | Status | Dist Assigned (m) | Nearest Any Line & Dist | Class | Recommended Fix |");
    md.push("|---|---|---|---|---|---|---|");
    for (const r of arr.slice(0, 5)) {
      md.push(`| \`${r.station_id}\` | ${r.name} | ${r.status} | ${r.dist_assigned_m} | ${r.nearest_any_line} (${r.dist_any_m} m) | **${r.cls}** | ${r.rec} |`);
    }
    if (arr.length > 5) {
      md.push(`*... and ${arr.length - 5} more stations (see full list in triage JSON).*`);
    }
    md.push("");
  }

  md.push("---");
  md.push("");
  md.push("## 3. Pipeline Implementation Origin Points (Read-Only Confirmation)");
  md.push("");
  md.push("1. **`stations_count` Default 10:**");
  md.push("   - **File:** [merge-overrides.ts](file:///c:/Anay/Programming/Projects/indian-metro-tracker/scripts/pipeline/merge-overrides.ts#L109)");
  md.push("   - **Line:** 109: `let stationsCount = segOverride.stations_count || 10;`");
  md.push("");
  md.push("2. **`opened_on` Default `2006-11-11`:**");
  md.push("   - **File:** [merge-overrides.ts](file:///c:/Anay/Programming/Projects/indian-metro-tracker/scripts/pipeline/merge-overrides.ts#L346)");
  md.push("   - **Line:** 346: `openedOn = \"2006-11-11\"; // Fallback operational opening`");
  md.push("");
  md.push("3. **`last_verified` Defaulting to Current Run Date:**");
  md.push("   - **File:** [merge-overrides.ts](file:///c:/Anay/Programming/Projects/indian-metro-tracker/scripts/pipeline/merge-overrides.ts#L137)");
  md.push("   - **Lines:** 137 (`last_verified: lastVerifiedDate`) & 386 (`last_verified: today`)");
  md.push("");
  md.push("4. **Line-Level Operator Derived from City:**");
  md.push("   - **File:** [merge-overrides.ts](file:///c:/Anay/Programming/Projects/indian-metro-tracker/scripts/pipeline/merge-overrides.ts#L95)");
  md.push("   - **Line:** 95: `const operator = overrides.city.operator;`");
  md.push("");
  md.push("5. **`maps.mail.ru` Overpass Mirror:**");
  md.push("   - **File:** [fetch-overpass.ts](file:///c:/Anay/Programming/Projects/indian-metro-tracker/scripts/pipeline/fetch-overpass.ts#L16)");
  md.push("   - **Line:** 16: `\"https://maps.mail.ru/osm/tools/overpass/api/interpreter\",`");
  md.push("");
  md.push("---");
  md.push("");
  md.push("## 4. Line Comparison: Data Operational Stations vs. Reference Operational Stations");
  md.push("");
  md.push("> [!NOTE]");
  md.push("> Counts in this table are provisional and informational, comparing stations currently tagged with `status: \"operational\"` in `data/stations.geojson` against `operational_stations` in `data/reference/*.json`.");
  md.push("");
  md.push("| City | Line ID | Official Name | Stations in Data (`status: operational`) | Reference Operational Stations | Candidates / Notes | Difference |");
  md.push("|---|---|---|---|---|---|---|");
  for (const row of lineComparisons) {
    const diffStr = typeof row.difference === "number" ? (row.difference > 0 ? `+${row.difference}` : `${row.difference}`) : row.difference;
    const candStr = row.candidates ? `[${row.candidates.join(", ")}]` : "—";
    md.push(`| \`${row.city_id}\` | \`${row.line_id}\` | ${row.official_name} | **${row.data_operational_stations}** | ${row.reference_operational_stations ?? "null"} | ${candStr} | ${diffStr} |`);
  }
  md.push("");

  fs.writeFileSync(`reports/data-audit/triage-${dateStr}.md`, md.join("\n"));
  console.log(`Generated triage reports for ${dateStr}.`);
}

generateTriageReports();
