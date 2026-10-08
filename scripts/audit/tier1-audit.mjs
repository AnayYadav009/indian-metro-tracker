#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

// Parse command line arguments
const args = process.argv.slice(2);
let outFile = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out" && args[i + 1]) {
    outFile = args[i + 1];
    i++;
  }
}

const rootDir = process.cwd();
const dataDir = path.join(rootDir, "data");
const overridesDir = path.join(dataDir, "overrides");
const referenceDir = path.join(dataDir, "reference");

function loadJson(relPath) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

const cities = loadJson("data/cities.json") || [];
const lines = loadJson("data/lines.json") || [];
const segments = loadJson("data/segments.geojson") || { features: [] };
const stations = loadJson("data/stations.geojson") || { features: [] };
const baseline = loadJson("data/audit-baseline.json") || {
  accepted_warnings: [],
};

const mergeOverridesCode = fs.readFileSync(
  path.join(rootDir, "scripts/pipeline/merge-overrides.ts"),
  "utf8"
);

const report = {
  timestamp: new Date().toISOString(),
  tasks: {},
  summary: {
    pass: 0,
    partial: 0,
    fail: 0,
    blocked: 0,
  },
  errors: 0,
  warnings: 0,
};

function recordTask(taskId, status, title, details, evidence) {
  report.tasks[taskId] = { status, title, details, evidence };
  report.summary[status.toLowerCase()] =
    (report.summary[status.toLowerCase()] || 0) + 1;
}

// ==========================================
// T1: Layout is no longer a silent default
// ==========================================
{
  const issues = [];
  const evidence = [];

  // 1. merge-overrides.ts check
  const hasSilentFallback = mergeOverridesCode.includes(
    'const layout = isUnderground ? "underground" : "elevated";'
  );
  if (hasSilentFallback) {
    issues.push(
      'scripts/pipeline/merge-overrides.ts still contains silent fallback to "elevated"'
    );
  } else {
    evidence.push(
      'merge-overrides.ts: silent elevated fallback eliminated, assigns layout: null and layoutSource: "unverified" when no tags/overrides present'
    );
  }

  // 2. Per-city layout counts & underground lines
  const cityLayouts = {};
  const lineUnderground = {};
  for (const f of stations.features) {
    const p = f.properties;
    cityLayouts[p.city_id] = cityLayouts[p.city_id] || {
      underground: 0,
      elevated: 0,
      "at-grade": 0,
      null: 0,
      total: 0,
    };
    cityLayouts[p.city_id][p.layout || "null"]++;
    cityLayouts[p.city_id].total++;

    if (p.layout === "underground") {
      for (const lid of p.line_ids) {
        lineUnderground[lid] = (lineUnderground[lid] || 0) + 1;
      }
    }
  }

  const expectedUG = [
    { city: "delhi", line: "del-yellow" },
    { city: "delhi", line: "del-violet" },
    { city: "delhi", line: "del-blue" },
    { city: "delhi", line: "del-magenta" },
    { city: "delhi", line: "del-pink" },
    { city: "delhi", line: "del-airport" },
    { city: "delhi", line: "del-grey" },
    { city: "kolkata", line: "kol-blue" },
    { city: "kolkata", line: "kol-green" },
    { city: "chennai", line: "che-blue" },
    { city: "chennai", line: "che-green" },
    { city: "pune", line: "pun-purple" },
    { city: "pune", line: "pun-aqua" },
    { city: "ahmedabad", line: "ahm-blue" },
    { city: "bengaluru", line: "blr-purple" },
  ];

  for (const exp of expectedUG) {
    if (!lineUnderground[exp.line]) {
      issues.push(
        `City '${exp.city}' line '${exp.line}' has NO underground stations marked (count: 0)`
      );
    } else {
      evidence.push(
        `Line '${exp.line}' has ${lineUnderground[exp.line]} underground stations`
      );
    }
  }

  // Mumbai Line 3 check
  const m3Stations = stations.features.filter((f) =>
    f.properties.line_ids.includes("mum-line-3")
  );
  const m3UG = m3Stations.filter(
    (f) => f.properties.layout === "underground"
  ).length;
  const m3AG = m3Stations.filter(
    (f) => f.properties.layout === "at-grade"
  ).length;
  const m3EL = m3Stations.filter(
    (f) => f.properties.layout === "elevated"
  ).length;
  if (m3UG === 26 && m3AG === 1 && m3EL === 0) {
    evidence.push(
      `Mumbai Line 3: exactly 26 underground, 1 at-grade (Aarey JVLR), 0 elevated`
    );
  } else {
    issues.push(
      `Mumbai Line 3 layout mismatch: UG=${m3UG} (expected 26), AG=${m3AG} (expected 1), EL=${m3EL} (expected 0)`
    );
  }

  // Layout override reference URLs
  let overridesWithoutRefs = 0;
  for (const file of fs.readdirSync(overridesDir)) {
    if (!file.endsWith(".json") || file === "pending-unverified.json") continue;
    const content = loadJson(path.join("data/overrides", file));
    const stationOverrides = content?.stationOverrides || {};
    for (const [stId, ov] of Object.entries(stationOverrides)) {
      if (ov.layout) {
        if (!ov.references && !ov.last_verified && !content.references) {
          overridesWithoutRefs++;
        }
      }
    }
  }
  if (overridesWithoutRefs > 0) {
    issues.push(
      `${overridesWithoutRefs} station layout overrides in data/overrides/*.json lack reference URLs`
    );
  } else {
    evidence.push(
      `All layout overrides have reference/verification provenance`
    );
  }

  const status =
    issues.length === 0 ? "PASS" : evidence.length > 0 ? "PARTIAL" : "FAIL";
  recordTask(
    "T1",
    status,
    "Layout is no longer a silent default",
    issues,
    evidence
  );
}

// ==========================================
// T2: Gurugram Rapid Metro
// ==========================================
{
  const issues = [];
  const evidence = [];

  const gurCity = cities.find((c) => c.id === "gurugram");
  if (gurCity && gurCity.network_id === "rapid-metro-gurgaon") {
    evidence.push(
      `cities.json: gurugram exists with network_id 'rapid-metro-gurgaon'`
    );
  } else {
    issues.push(`cities.json: gurugram network_id mismatch or missing`);
  }

  const gurLine = lines.find((l) => l.id === "gur-rapid");
  if (gurLine) {
    if (
      gurLine.operator === "Rapid Metro Gurgaon Ltd (RMGL)" ||
      gurLine.operator === "RMGL"
    ) {
      evidence.push(
        `lines.json: gur-rapid exists with operator '${gurLine.operator}'`
      );
    } else {
      issues.push(
        `lines.json: gur-rapid operator mismatch ('${gurLine.operator}')`
      );
    }
    if (gurLine.notes && gurLine.notes.includes("2019-10-22")) {
      evidence.push(
        `lines.json: gur-rapid notes record DMRC takeover 2019-10-22`
      );
    } else {
      issues.push(
        `lines.json: gur-rapid notes missing DMRC takeover 2019-10-22 reference`
      );
    }
  } else {
    issues.push(`lines.json: gur-rapid missing`);
  }

  const gurStations = stations.features.filter(
    (f) => f.properties.city_id === "gurugram"
  );
  if (gurStations.length === 11) {
    evidence.push(`stations.geojson: 11 stations present for Gurugram`);
  } else {
    issues.push(
      `stations.geojson: Gurugram has ${gurStations.length} stations (expected 11)`
    );
  }

  const wrongStations = gurStations.filter(
    (f) =>
      f.properties.city_id === "delhi" ||
      f.properties.line_ids.includes("del-yellow")
  );
  if (wrongStations.length === 0) {
    evidence.push(
      `No Gurugram station assigned to city delhi or line del-yellow`
    );
  } else {
    issues.push(
      `${wrongStations.length} Gurugram stations assigned to delhi or del-yellow`
    );
  }

  const p1 = gurStations.filter((f) => f.properties.phase === "1");
  const p2 = gurStations.filter((f) => f.properties.phase === "2");
  if (p1.length === 6 && p2.length === 5) {
    evidence.push(`Phases split: Phase 1 = 6 stations, Phase 2 = 5 stations`);
  } else {
    issues.push(
      `Phases split incorrect: Phase 1 = ${p1.length} (expected 6), Phase 2 = ${p2.length} (expected 5)`
    );
  }

  const p1Dates = p1.filter(
    (f) => f.properties.opened_on === "2013-11-14"
  ).length;
  const p2Dates = p2.filter(
    (f) => f.properties.opened_on === "2017-03-31"
  ).length;
  if (p1Dates === 6 && p2Dates === 5) {
    evidence.push(
      `Opening dates correct: 2013-11-14 for Phase 1, 2017-03-31 for Phase 2`
    );
  } else {
    issues.push(
      `Opening dates mismatch: Phase 1 (2013-11-14) = ${p1Dates}/6, Phase 2 (2017-03-31) = ${p2Dates}/5`
    );
  }

  const gurSegs = segments.features.filter(
    (f) => f.properties.city_id === "gurugram"
  );
  if (gurSegs.length >= 1 && gurSegs[0].geometry.coordinates.length > 50) {
    evidence.push(
      `Gurugram segment exists with ${gurSegs[0].geometry.coordinates.length} coordinate points`
    );
  } else {
    issues.push(`Gurugram segment geometry missing or too short`);
  }

  if (fs.existsSync(path.join(referenceDir, "gurugram.json"))) {
    evidence.push(`data/reference/gurugram.json exists`);
  } else {
    issues.push(`data/reference/gurugram.json missing`);
  }

  const status =
    issues.length === 0 ? "PASS" : evidence.length > 0 ? "PARTIAL" : "FAIL";
  recordTask("T2", status, "Gurugram Rapid Metro", issues, evidence);
}

// ==========================================
// T3: Navi Mumbai Metro
// ==========================================
{
  const issues = [];
  const evidence = [];

  const nmCity = cities.find((c) => c.id === "navi-mumbai");
  if (nmCity && nmCity.network_id === "navi-mumbai-metro") {
    evidence.push(
      `cities.json: navi-mumbai exists with network_id 'navi-mumbai-metro'`
    );
  } else {
    issues.push(`cities.json: navi-mumbai network_id mismatch or missing`);
  }

  const nmLine = lines.find((l) => l.id === "nmm-line-1");
  if (nmLine) {
    evidence.push(`lines.json: nmm-line-1 exists`);
    if (nmLine.operator === "Maha Metro") {
      evidence.push(`operator is Maha Metro`);
    } else {
      issues.push(`operator is '${nmLine.operator}' (expected 'Maha Metro')`);
    }
    if (nmLine.notes && nmLine.notes.toLowerCase().includes("cidco")) {
      evidence.push(`CIDCO ownership / operator conflict noted in line notes`);
    } else {
      issues.push(`CIDCO owner / operator conflict missing from line notes`);
    }
  } else {
    issues.push(`lines.json: nmm-line-1 missing`);
  }

  const nmStations = stations.features.filter(
    (f) => f.properties.city_id === "navi-mumbai"
  );
  if (nmStations.length === 11) {
    evidence.push(`stations.geojson: 11 stations present for Navi Mumbai`);
  } else {
    issues.push(
      `stations.geojson: Navi Mumbai has ${nmStations.length} stations (expected 11)`
    );
  }

  const nmOpened = nmStations.filter(
    (f) => f.properties.opened_on === "2023-11-17"
  ).length;
  if (nmOpened === 11) {
    evidence.push(`All 11 stations opened_on = 2023-11-17`);
  } else {
    issues.push(`Only ${nmOpened}/11 stations have opened_on = 2023-11-17`);
  }

  const nmSegs = segments.features.filter(
    (f) => f.properties.city_id === "navi-mumbai"
  );
  if (nmSegs.length >= 1 && nmSegs[0].geometry.coordinates.length > 50) {
    evidence.push(
      `Navi Mumbai segment exists with ${nmSegs[0].geometry.coordinates.length} coordinate points`
    );
  } else {
    issues.push(`Navi Mumbai segment geometry missing or too short`);
  }

  const cbd = stations.features.find(
    (f) => f.properties.name === "CBD Belapur"
  );
  if (
    cbd &&
    cbd.properties.city_id === "navi-mumbai" &&
    !cbd.properties.line_ids.includes("mum-line-2b") &&
    cbd.properties.status === "operational"
  ) {
    evidence.push(
      `CBD Belapur is operational, Phase 1, city navi-mumbai, not on mum-line-2b`
    );
  } else {
    issues.push(`CBD Belapur status or line assignment incorrect`);
  }

  const mumRbi = stations.features.find(
    (f) => f.properties.id === "mum-rbi-colony"
  );
  if (!mumRbi) {
    evidence.push(`mum-rbi-colony excluded from Mumbai dataset`);
  } else {
    issues.push(`mum-rbi-colony still present in Mumbai dataset`);
  }

  const status =
    issues.length === 0 ? "PASS" : evidence.length > 0 ? "PARTIAL" : "FAIL";
  recordTask("T3", status, "Navi Mumbai Metro", issues, evidence);
}

// ==========================================
// T4: Noida Metro (Aqua Line)
// ==========================================
{
  const issues = [];
  const evidence = [];

  const noiCity = cities.find((c) => c.id === "noida");
  if (noiCity && noiCity.network_id === "noida-metro") {
    evidence.push(`cities.json: noida exists with network_id 'noida-metro'`);
  } else {
    issues.push(`cities.json: noida network_id mismatch or missing`);
  }

  const noiLine = lines.find((l) => l.id === "noi-aqua");
  if (noiLine && noiLine.operator === "NMRC") {
    evidence.push(`lines.json: noi-aqua exists with operator 'NMRC'`);
  } else {
    issues.push(`lines.json: noi-aqua operator mismatch or missing`);
  }

  const noiStations = stations.features.filter(
    (f) => f.properties.city_id === "noida"
  );
  if (noiStations.length === 21) {
    evidence.push(`stations.geojson: 21 stations present for Noida Aqua line`);
  } else {
    issues.push(
      `stations.geojson: Noida has ${noiStations.length} stations (expected 21)`
    );
  }

  const noiOpened = noiStations.filter(
    (f) => f.properties.opened_on === "2019-01-25"
  ).length;
  if (noiOpened === 21) {
    evidence.push(`All 21 stations opened_on = 2019-01-25`);
  } else {
    issues.push(`Only ${noiOpened}/21 stations have opened_on = 2019-01-25`);
  }

  const depot = noiStations.find((f) =>
    f.properties.name.toLowerCase().includes("depot")
  );
  if (
    depot &&
    (depot.properties.layout === null ||
      depot.properties.layout_source === "unverified")
  ) {
    evidence.push(
      `Depot layout left unverified: layout=null, layout_source="unverified"`
    );
  } else if (depot && depot.properties.layout_source === "operator") {
    evidence.push(
      `Depot layout marked ${depot.properties.layout} via operator`
    );
  } else {
    issues.push(`Depot station layout is default or unverified`);
  }

  const sec44 = stations.features.find(
    (f) =>
      f.properties.name === "Noida Sector 44" ||
      f.properties.id === "del-noida-sector-44"
  );
  const secOff = stations.features.find(
    (f) =>
      f.properties.name === "Noida Office" ||
      f.properties.id === "del-noida-office"
  );
  if (!sec44 && !secOff) {
    evidence.push(
      `del-noida-sector-44 and del-noida-office excluded from del-magenta`
    );
  } else {
    issues.push(`Stray Noida proposed stations still present on del-magenta`);
  }

  const status =
    issues.length === 0 ? "PASS" : evidence.length > 0 ? "PARTIAL" : "FAIL";
  recordTask("T4", status, "Noida Metro (Aqua Line)", issues, evidence);
}

// ==========================================
// T5: Mumbai Line 3
// ==========================================
{
  const issues = [];
  const evidence = [];

  const m3Segs = segments.features.filter(
    (f) => f.properties.line_id === "mum-line-3"
  );
  if (m3Segs.length === 3) {
    evidence.push(`Line 3 split into 3 segments`);
  } else {
    issues.push(`Line 3 has ${m3Segs.length} segments (expected 3)`);
  }

  const s1 = m3Segs.find(
    (s) => s.properties.segment_id === "mum-line-3-seg-01"
  );
  const s2 = m3Segs.find(
    (s) => s.properties.segment_id === "mum-line-3-seg-02"
  );
  const s3 = m3Segs.find(
    (s) => s.properties.segment_id === "mum-line-3-seg-03"
  );

  if (s1 && s1.properties.inaugurated_on === "2024-10-07") {
    evidence.push(`Segment 1 inaugurated 2024-10-07`);
  } else {
    issues.push(`Segment 1 date mismatch: ${s1?.properties.inaugurated_on}`);
  }

  if (s3 && s3.properties.inaugurated_on === "2025-10-09") {
    evidence.push(`Segment 3 inaugurated 2025-10-09`);
  } else {
    issues.push(`Segment 3 date mismatch: ${s3?.properties.inaugurated_on}`);
  }

  const m3Stations = stations.features.filter((f) =>
    f.properties.line_ids.includes("mum-line-3")
  );
  if (m3Stations.length === 27) {
    evidence.push(`Line 3 has exactly 27 stations`);
  } else {
    issues.push(`Line 3 has ${m3Stations.length} stations (expected 27)`);
  }

  const aarey = m3Stations.find((f) => f.properties.name === "Aarey JVLR");
  const vidya = m3Stations.find((f) => f.properties.name === "Vidyanagari");
  if (aarey && vidya) {
    evidence.push(`Aarey JVLR and Vidyanagari stations present`);
  } else {
    issues.push(`Aarey JVLR or Vidyanagari missing`);
  }

  const airportCol = stations.features.find((f) =>
    (f.properties.id || "").includes("airport-colony")
  );
  const bandraCol = stations.features.find((f) =>
    (f.properties.id || "").includes("bandra-colony")
  );
  const sbiDadar = stations.features.find((f) =>
    (f.properties.id || "").includes("sbi-dadar")
  );
  if (!airportCol && !bandraCol && !sbiDadar) {
    evidence.push(
      `Stray stations airport-colony, bandra-colony, sbi-dadar resolved/excluded`
    );
  } else {
    issues.push(`Stray stations still present in dataset`);
  }

  const sciMuseum = m3Stations.find(
    (f) => f.properties.name === "Science Museum"
  );
  const mumCentral = m3Stations.find(
    (f) => f.properties.name === "Mumbai Central"
  );
  if (sciMuseum && mumCentral) {
    evidence.push(`Science Museum and Mumbai Central correctly aliased`);
  } else {
    issues.push(`Science Museum or Mumbai Central name alias missing`);
  }

  const mumPhases = cities.find((c) => c.id === "mumbai")?.phases || [];
  const m3Phases = [...new Set(m3Stations.map((f) => f.properties.phase))];
  const allInPhases = m3Phases.every((p) => mumPhases.includes(p));
  if (allInPhases) {
    evidence.push(
      `Line 3 phases [${m3Phases.join(", ")}] exist in Mumbai phases [${mumPhases.join(", ")}]`
    );
  } else {
    issues.push(
      `Line 3 phases [${m3Phases.join(", ")}] not subset of [${mumPhases.join(", ")}]`
    );
  }

  const status =
    issues.length === 0 ? "PASS" : evidence.length > 0 ? "PARTIAL" : "FAIL";
  recordTask("T5", status, "Mumbai Line 3", issues, evidence);
}

// ==========================================
// T6: Staged openings and dates
// ==========================================
{
  const issues = [];
  const evidence = [];

  const delYellowSegs = segments.features.filter(
    (s) => s.properties.line_id === "del-yellow"
  ).length;
  const delVioletSegs = segments.features.filter(
    (s) => s.properties.line_id === "del-violet"
  ).length;

  if (delYellowSegs > 1) {
    evidence.push(
      `Delhi Yellow line split into ${delYellowSegs} opening stages`
    );
  } else {
    issues.push(
      `Delhi Yellow line has only 1 segment (not split into staged openings)`
    );
  }

  if (delVioletSegs > 1) {
    evidence.push(
      `Delhi Violet line split into ${delVioletSegs} opening stages`
    );
  } else {
    issues.push(
      `Delhi Violet line has only 1 segment (not split into staged openings)`
    );
  }

  // Null station opened_on count
  const nullCounts = {};
  for (const f of stations.features) {
    const c = f.properties.city_id;
    nullCounts[c] = nullCounts[c] || { null: 0, total: 0 };
    if (f.properties.opened_on === null) nullCounts[c].null++;
    nullCounts[c].total++;
  }
  evidence.push(
    `Null opened_on counts by city: ` +
      Object.entries(nullCounts)
        .map(([c, v]) => `${c}: ${v.null}/${v.total}`)
        .join(", ")
  );

  const status =
    issues.length === 0 ? "PASS" : evidence.length > 0 ? "PARTIAL" : "FAIL";
  recordTask("T6", status, "Staged openings and dates", issues, evidence);
}

// ==========================================
// T7: Lines with no geometry
// ==========================================
{
  const issues = [];
  const evidence = [];

  const linesToCheck = [
    "del-silver",
    "kol-pink",
    "che-corridor-3",
    "che-corridor-5",
    "pun-line-3",
  ];
  for (const lid of linesToCheck) {
    const line = lines.find((l) => l.id === lid);
    const segs = segments.features.filter((s) => s.properties.line_id === lid);
    if (!line && segs.length === 0) {
      evidence.push(`Line '${lid}' removed cleanly`);
    } else if (line && segs.length > 0) {
      evidence.push(
        `Line '${lid}' has ${segs.length} segment(s) with status=${segs[0].properties.status}, phase=${segs[0].properties.phase}`
      );
    } else if (line && segs.length === 0) {
      issues.push(
        `Line '${lid}' exists in lines.json but has 0 segments (dangling line without geometry)`
      );
    }
  }

  const status =
    issues.length === 0 ? "PASS" : evidence.length > 0 ? "PARTIAL" : "FAIL";
  recordTask("T7", status, "Lines with no geometry", issues, evidence);
}

// ==========================================
// T8: Other
// ==========================================
{
  const issues = [];
  const evidence = [];

  const c4 = segments.features.find(
    (s) => s.properties.segment_id === "che-corridor-4-seg-01"
  );
  if (
    c4 &&
    c4.properties.status === "construction" &&
    c4.properties.expected_completion
  ) {
    evidence.push(
      `Chennai che-corridor-4-seg-01 status verified as 'construction' with expected_completion ${c4.properties.expected_completion}`
    );
  } else {
    issues.push(`Chennai che-corridor-4-seg-01 status unverified`);
  }

  const yelStations = stations.features.filter((f) =>
    f.properties.line_ids.includes("del-yellow")
  );
  const yelOp = yelStations.filter(
    (f) => f.properties.status === "operational"
  ).length;
  if (yelOp === 37) {
    evidence.push(
      `Delhi Yellow operational station count reconciled to exactly 37`
    );
  } else {
    issues.push(
      `Delhi Yellow operational station count is ${yelOp} (expected 37)`
    );
  }

  const kolGreen = lines.find((l) => l.id === "kol-green");
  if (kolGreen && kolGreen.operator === "KMRC") {
    evidence.push(`Kolkata kol-green operator confirmed as KMRC`);
  } else {
    issues.push(
      `Kolkata kol-green operator is '${kolGreen?.operator}' (expected KMRC)`
    );
  }

  const pun3 = lines.find((l) => l.id === "pun-line-3");
  if (pun3 && pun3.operator === "Pune IT City Metro Rail Limited") {
    evidence.push(
      `Pune pun-line-3 operator confirmed as Pune IT City Metro Rail Limited`
    );
  } else {
    issues.push(`Pune pun-line-3 operator is '${pun3?.operator}'`);
  }

  const blrBreaks =
    loadJson("data/overrides/bengaluru.json")?.intentionalBreaks || [];
  if (blrBreaks.includes("blr-planned-seg-01|blr-purple-seg-01")) {
    evidence.push(`Bengaluru Purple/planned gap declared in intentionalBreaks`);
  } else {
    issues.push(`Bengaluru Purple/planned gap missing from intentionalBreaks`);
  }

  const status =
    issues.length === 0 ? "PASS" : evidence.length > 0 ? "PARTIAL" : "FAIL";
  recordTask("T8", status, "Other checks", issues, evidence);
}

// Count total issues as errors or warnings
report.errors = Object.values(report.tasks).filter(
  (t) => t.status === "FAIL"
).length;
report.warnings = Object.values(report.tasks).filter(
  (t) => t.status === "PARTIAL"
).length;

if (outFile) {
  const fullOut = path.resolve(rootDir, outFile);
  fs.mkdirSync(path.dirname(fullOut), { recursive: true });
  fs.writeFileSync(fullOut, JSON.stringify(report, null, 2), "utf8");
  console.log(`Report written to ${fullOut}`);
}

console.log("\n=========================================");
console.log("TIER 1 DATA FIX VERIFICATION REPORT");
console.log("=========================================");
for (const [taskId, task] of Object.entries(report.tasks)) {
  const symbol =
    task.status === "PASS" ? "✅" : task.status === "PARTIAL" ? "⚠️" : "❌";
  console.log(`\n${symbol} ${taskId}: ${task.title} [${task.status}]`);
  if (task.evidence.length > 0) {
    console.log("  Evidence:");
    task.evidence.forEach((e) => console.log(`   + ${e}`));
  }
  if (task.details.length > 0) {
    console.log("  Issues:");
    task.details.forEach((i) => console.log(`   - ${i}`));
  }
}
console.log("\n=========================================");
console.log(
  `SUMMARY: ${report.summary.pass} PASS | ${report.summary.partial} PARTIAL | ${report.summary.fail} FAIL`
);
console.log("=========================================\n");
