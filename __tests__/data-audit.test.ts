import { describe, it, expect } from "vitest";
import {
  runAudit,
  applyBaseline,
  formatMarkdownReport,
  formatJsonReport,
} from "../scripts/audit/audit-engine";
import type { Finding, BaselineFile, AuditResult } from "../scripts/audit/audit-engine";

// ─── Minimal valid fixtures ─────────────────────────────────────────────────

function makeCity(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "test-city",
    name: "Test City",
    bbox: [77.0, 12.0, 78.0, 13.0],
    operator: "TCRL",
    phases: ["1", "2"],
    ...overrides,
  };
}

function makeLine(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "tc-red",
    name: "Red Line",
    city_id: "test-city",
    city: "Test City",
    color: "#FF0000",
    operator: "TCRL",
    source: "osm",
    ...overrides,
  };
}

function makeSegment(overrides?: Partial<Record<string, unknown>>) {
  const base: Record<string, unknown> = {
    segment_id: "tc-red-seg-01",
    line_id: "tc-red",
    line_name: "Red Line",
    city_id: "test-city",
    city: "Test City",
    operator: "TCRL",
    status: "operational",
    phase: "1",
    length_km: 5.0,
    gauge: "standard",
    inaugurated_on: "2020-01-01",
    expected_completion: null,
    stations_count: 2,
    color: "#FF0000",
    source: "osm",
    references: ["https://tcrl.org/official"],
    last_verified: "2026-01-01",
    completion_unconfirmed: false,
    ...overrides,
  };
  const geometry = (overrides?.geometry as { type: "LineString"; coordinates: [number, number][] }) || {
    type: "LineString" as const,
    coordinates: [
      [77.5, 12.5],
      [77.6, 12.5],
    ] as [number, number][],
  };
  return {
    type: "Feature" as const,
    geometry,
    properties: base,
  };
}

function makeStation(overrides?: Partial<Record<string, unknown>>) {
  const base: Record<string, unknown> = {
    station_id: "tc-station-a",
    name: "Station A",
    city_id: "test-city",
    city: "Test City",
    line_ids: ["tc-red"],
    status: "operational",
    phase: "1",
    is_interchange: false,
    opened_on: "2020-01-01",
    expected_completion: null,
    layout: "elevated",
    source: "osm",
    references: ["https://tcrl.org/official"],
    last_verified: "2026-01-01",
    ...overrides,
  };
  const coords = (overrides?.coordinates as [number, number]) || [77.5, 12.5];
  return {
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: coords,
    },
    properties: base,
  };
}

function makeDataset(opts?: {
  cities?: unknown[];
  lines?: unknown[];
  segments?: unknown[];
  stations?: unknown[];
}) {
  return {
    cities: opts?.cities || [makeCity()],
    lines: opts?.lines || [makeLine()],
    segments: {
      type: "FeatureCollection",
      features: opts?.segments || [makeSegment()],
    },
    stations: {
      type: "FeatureCollection",
      features: opts?.stations || [
        makeStation(),
        makeStation({
          station_id: "tc-station-b",
          name: "Station B",
          opened_on: "2020-01-01",
        }),
      ],
    },
  };
}

const AUDIT_OPTIONS = { currentDate: "2026-10-07", referenceDir: "__nonexistent__" };

function findByRule(findings: Finding[], rule: string): Finding[] {
  return findings.filter((f) => f.rule === rule);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Audit Engine", () => {
  describe("A. Structural checks", () => {
    it("passes clean dataset with no errors", () => {
      const result = runAudit(makeDataset(), AUDIT_OPTIONS);
      const errors = result.findings.filter((f) => f.severity === "error");
      // The only non-structural findings should be stations_count mismatch and operational-no-reference
      // In our minimal fixture, stations_count=2 and there are 2 stations near the segment
      // No errors expected in a well-formed fixture
      expect(errors.length).toBe(0);
    });

    it("detects duplicate IDs across entity types", () => {
      const result = runAudit(
        makeDataset({
          lines: [makeLine({ id: "test-city" })], // same ID as city
        }),
        AUDIT_OPTIONS
      );
      const dupes = findByRule(result.findings, "id-unique");
      expect(dupes.length).toBeGreaterThan(0);
      expect(dupes[0].severity).toBe("error");
    });

    it("detects foreign key violations (segment → unknown line)", () => {
      const result = runAudit(
        makeDataset({
          segments: [makeSegment({ line_id: "nonexistent-line" })],
        }),
        AUDIT_OPTIONS
      );
      const fks = findByRule(result.findings, "fk-resolve");
      expect(fks.some((f) => f.message.includes("nonexistent-line"))).toBe(true);
    });

    it("detects coordinates outside India envelope", () => {
      const seg = makeSegment();
      (seg.geometry.coordinates as [number, number][]) = [[10.0, 50.0], [10.1, 50.1]]; // Europe
      const result = runAudit(
        makeDataset({ segments: [seg] }),
        AUDIT_OPTIONS
      );
      const envFindings = findByRule(result.findings, "coords-india-envelope");
      expect(envFindings.length).toBeGreaterThan(0);
      expect(envFindings[0].severity).toBe("error");
    });

    it("detects station coordinates outside city bbox", () => {
      const st = makeStation({ station_id: "tc-far-station" });
      st.geometry.coordinates = [80.0, 15.0] as [number, number]; // Inside India but outside test-city bbox
      const result = runAudit(
        makeDataset({ stations: [st, makeStation({ station_id: "tc-station-b", name: "Station B" })] }),
        AUDIT_OPTIONS
      );
      const bboxFindings = findByRule(result.findings, "coords-city-bbox");
      expect(bboxFindings.length).toBeGreaterThan(0);
      expect(bboxFindings[0].severity).toBe("warn");
    });

    it("detects line with no segments", () => {
      const result = runAudit(
        makeDataset({
          lines: [makeLine(), makeLine({ id: "tc-blue", name: "Blue Line", color: "#0000FF" })],
          segments: [makeSegment()], // only for tc-red, not tc-blue
        }),
        AUDIT_OPTIONS
      );
      const noSegs = findByRule(result.findings, "line-no-segments");
      expect(noSegs.length).toBe(1);
      expect(noSegs[0].subject).toBe("tc-blue");
    });
  });

  describe("B. Geometry checks", () => {
    it("detects station far from all segments (error at 200m)", () => {
      const farStation = makeStation({ station_id: "tc-far" });
      farStation.geometry.coordinates = [77.8, 12.8] as [number, number]; // far from segment
      const result = runAudit(
        makeDataset({
          stations: [farStation, makeStation({ station_id: "tc-near", name: "Near" })],
        }),
        AUDIT_OPTIONS
      );
      const farFindings = findByRule(result.findings, "station-far-from-all-segments");
      expect(farFindings.some((f) => f.subject === "tc-far")).toBe(true);
    });

    it("detects zero-length segment", () => {
      const seg = makeSegment({ segment_id: "tc-zero" });
      seg.geometry.coordinates = [[77.5, 12.5], [77.5, 12.5]] as [number, number][];
      const result = runAudit(
        makeDataset({ segments: [seg] }),
        AUDIT_OPTIONS
      );
      const zeroLen = findByRule(result.findings, "segment-zero-length");
      expect(zeroLen.length).toBe(1);
      expect(zeroLen[0].severity).toBe("error");
    });

    it("detects self-intersecting segment as warn", () => {
      const seg = makeSegment({ segment_id: "tc-loop" });
      // Create a figure-8 shape
      seg.geometry.coordinates = [
        [77.5, 12.5],
        [77.6, 12.6],
        [77.6, 12.5],
        [77.5, 12.6],
        [77.5, 12.5],
      ] as [number, number][];
      const result = runAudit(
        makeDataset({ segments: [seg] }),
        AUDIT_OPTIONS
      );
      const selfInt = findByRule(result.findings, "segment-self-intersecting");
      expect(selfInt.length).toBe(1);
      expect(selfInt[0].severity).toBe("warn");
    });

    it("exempts self-intersecting segment when in exemption list", () => {
      const seg = makeSegment({ segment_id: "tc-loop", line_id: "tc-red" });
      seg.geometry.coordinates = [
        [77.5, 12.5],
        [77.6, 12.6],
        [77.6, 12.5],
        [77.5, 12.6],
        [77.5, 12.5],
      ] as [number, number][];
      const result = runAudit(
        makeDataset({ segments: [seg] }),
        { ...AUDIT_OPTIONS, selfIntersectionExemptions: ["tc-loop"] }
      );
      const selfInt = findByRule(result.findings, "segment-self-intersecting");
      expect(selfInt.length).toBe(1);
      expect(selfInt[0].severity).toBe("info"); // downgraded
    });
  });

  describe("C. Semantic consistency", () => {
    it("detects operational segment with null inaugurated_on", () => {
      const result = runAudit(
        makeDataset({
          segments: [makeSegment({ inaugurated_on: null })],
        }),
        AUDIT_OPTIONS
      );
      // This will be caught by Zod schema validation since operational requires inaugurated_on
      const schemaFindings = findByRule(result.findings, "schema-invalid");
      expect(schemaFindings.length).toBeGreaterThan(0);
    });

    it("detects is_interchange true with only 1 line", () => {
      const result = runAudit(
        makeDataset({
          stations: [
            makeStation({ is_interchange: true, interchange_id: "tc-station-a" }),
            makeStation({ station_id: "tc-station-b", name: "Station B" }),
          ],
        }),
        AUDIT_OPTIONS
      );
      const interchangeFindings = findByRule(result.findings, "interchange-consistency");
      expect(interchangeFindings.some((f) => f.message.includes("only 1 line"))).toBe(true);
    });

    it("detects is_interchange false with multiple lines", () => {
      const result = runAudit(
        makeDataset({
          lines: [makeLine(), makeLine({ id: "tc-blue", name: "Blue Line", color: "#0000FF" })],
          stations: [
            makeStation({ line_ids: ["tc-red", "tc-blue"], is_interchange: false }),
            makeStation({ station_id: "tc-station-b", name: "Station B" }),
          ],
        }),
        AUDIT_OPTIONS
      );
      const interchangeFindings = findByRule(result.findings, "interchange-consistency");
      expect(interchangeFindings.some((f) => f.message.includes("2 lines"))).toBe(true);
    });

    it("detects interchange cluster inconsistency (is_interchange true without interchange_id)", () => {
      const result = runAudit(
        makeDataset({
          lines: [makeLine(), makeLine({ id: "tc-blue", name: "Blue Line", color: "#0000FF" })],
          stations: [
            makeStation({ line_ids: ["tc-red", "tc-blue"], is_interchange: true, interchange_id: undefined }),
            makeStation({ station_id: "tc-station-b", name: "Station B" }),
          ],
        }),
        AUDIT_OPTIONS
      );
      const clusterFindings = findByRule(result.findings, "interchange-cluster-consistency");
      expect(clusterFindings.length).toBe(1);
      expect(clusterFindings[0].severity).toBe("error");
      expect(clusterFindings[0].message).toContain("interchange_id cluster is missing");
    });

    it("detects interchange cluster inconsistency (is_interchange false with interchange_id defined)", () => {
      const result = runAudit(
        makeDataset({
          stations: [
            makeStation({ is_interchange: false, interchange_id: "tc-cluster-1" }),
            makeStation({ station_id: "tc-station-b", name: "Station B" }),
          ],
        }),
        AUDIT_OPTIONS
      );
      const clusterFindings = findByRule(result.findings, "interchange-cluster-consistency");
      expect(clusterFindings.length).toBe(1);
      expect(clusterFindings[0].severity).toBe("error");
      expect(clusterFindings[0].message).toContain("is_interchange is false");
    });

    it("detects segment operator mismatch with line operator", () => {
      const result = runAudit(
        makeDataset({
          segments: [makeSegment({ operator: "WRONG-OP" })],
        }),
        AUDIT_OPTIONS
      );
      const opFindings = findByRule(result.findings, "segment-operator-mismatch");
      expect(opFindings.length).toBe(1);
      expect(opFindings[0].severity).toBe("error");
    });

    it("detects phase label not in city phases", () => {
      const result = runAudit(
        makeDataset({
          segments: [makeSegment({ phase: "99" })],
        }),
        AUDIT_OPTIONS
      );
      // Zod schema will catch this if phase validation is in the superRefine
      // Otherwise our phase-invalid check catches it
      const phaseFindings = findByRule(result.findings, "phase-invalid");
      expect(phaseFindings.length).toBeGreaterThan(0);
    });

    it("detects duplicate station names in same city", () => {
      const result = runAudit(
        makeDataset({
          stations: [
            makeStation({ station_id: "tc-a1", name: "Central" }),
            makeStation({ station_id: "tc-a2", name: "Central" }),
          ],
        }),
        AUDIT_OPTIONS
      );
      const dupeNames = findByRule(result.findings, "duplicate-station-name");
      expect(dupeNames.length).toBe(1);
      expect(dupeNames[0].severity).toBe("warn");
    });

    it("detects station name with line qualifier", () => {
      const result = runAudit(
        makeDataset({
          stations: [
            makeStation({ station_id: "tc-q1", name: "Central (Blue Line)" }),
            makeStation({ station_id: "tc-station-b", name: "Station B" }),
          ],
        }),
        AUDIT_OPTIONS
      );
      const nameFindings = findByRule(result.findings, "station-name-quality");
      expect(nameFindings.some((f) => f.message.includes("line qualifier"))).toBe(true);
    });

    it("detects station name with Metro Station suffix", () => {
      const result = runAudit(
        makeDataset({
          stations: [
            makeStation({ station_id: "tc-ms", name: "Central Metro Station" }),
            makeStation({ station_id: "tc-station-b", name: "Station B" }),
          ],
        }),
        AUDIT_OPTIONS
      );
      const nameFindings = findByRule(result.findings, "station-name-quality");
      expect(nameFindings.some((f) => f.message.includes("Metro Station"))).toBe(true);
    });

    it("detects duplicate line colours in same city", () => {
      const result = runAudit(
        makeDataset({
          lines: [
            makeLine({ id: "tc-red", color: "#FF0000" }),
            makeLine({ id: "tc-red2", name: "Red2 Line", color: "#FF0000" }),
          ],
        }),
        AUDIT_OPTIONS
      );
      const colorFindings = findByRule(result.findings, "duplicate-line-color");
      expect(colorFindings.length).toBe(1);
      expect(colorFindings[0].severity).toBe("warn");
    });

    it("detects stale expected_completion", () => {
      const seg = makeSegment({
        segment_id: "tc-stale",
        status: "construction",
        inaugurated_on: null,
        expected_completion: "2025-01",
        completion_unconfirmed: false,
      });
      const result = runAudit(
        makeDataset({ segments: [seg] }),
        AUDIT_OPTIONS
      );
      const staleFindings = findByRule(result.findings, "stale-expected-completion");
      expect(staleFindings.length).toBe(1);
      expect(staleFindings[0].severity).toBe("warn");
    });

    it("detects operational segment with no references", () => {
      const result = runAudit(
        makeDataset({
          segments: [makeSegment({ references: [] })],
        }),
        AUDIT_OPTIONS
      );
      const refFindings = findByRule(result.findings, "operational-no-reference");
      expect(refFindings.length).toBe(1);
      expect(refFindings[0].severity).toBe("warn");
    });
  });

  describe("Info checks", () => {
    it("reports last_verified distribution", () => {
      const result = runAudit(makeDataset(), AUDIT_OPTIONS);
      const distFindings = findByRule(result.findings, "last-verified-distribution");
      expect(distFindings.length).toBe(1);
      expect(distFindings[0].severity).toBe("info");
    });
  });

  describe("Summaries", () => {
    it("reports per-city source counts", () => {
      const result = runAudit(makeDataset(), AUDIT_OPTIONS);
      expect(result.summaries.length).toBe(1);
      const s = result.summaries[0];
      expect(s.city_id).toBe("test-city");
      expect(s.lines).toBe(1);
      expect(s.segments).toBe(1);
      expect(s.stations).toBe(2);
      expect(s.segmentSources).toEqual({ osm: 1 });
      expect(s.stationSources).toEqual({ osm: 2 });
    });
  });

  describe("Baseline", () => {
    it("filters accepted, unreviewed, and known_defects warnings and tracks stale entries", () => {
      const findings: Finding[] = [
        { city_id: "a", rule: "r1", severity: "warn", subject: "s1", message: "m1" },
        { city_id: "a", rule: "r2", severity: "warn", subject: "s2", message: "m2" },
        { city_id: "a", rule: "r3", severity: "warn", subject: "s3", message: "m3" },
        { city_id: "a", rule: "r4", severity: "warn", subject: "s4", message: "m4" },
        { city_id: "a", rule: "r5", severity: "error", subject: "s5", message: "m5" },
      ];
      const baseline: BaselineFile = {
        accepted_warnings: [
          { city_id: "a", rule: "r1", subject: "s1", reason: "reviewed" },
          { city_id: "a", rule: "r_stale", subject: "s_stale", reason: "old accepted" },
        ],
        unreviewed_warnings: [
          { city_id: "a", rule: "r2", subject: "s2", reason: "not yet reviewed, triaged per city in M10.2" },
          { city_id: "a", rule: "r_stale_unreviewed", subject: "s_stale2", reason: "old unreviewed" },
        ],
        known_defects: [
          {
            finding_id: "F-01",
            target_milestone: "M10.2",
            city_id: "a",
            rule: "r3",
            subject: "s3",
            note: "Active defect",
          },
          {
            finding_id: "F-99",
            target_milestone: "M10.1",
            city_id: "a",
            rule: "r_stale_defect",
            subject: "s_stale3",
            note: "Resolved defect",
          },
        ],
      };

      const {
        unbaselined,
        accepted,
        unreviewed,
        knownDefects,
        staleAccepted,
        staleUnreviewed,
        staleKnownDefects,
      } = applyBaseline(findings, baseline);

      expect(accepted.length).toBe(1);
      expect(accepted[0].subject).toBe("s1");

      expect(unreviewed.length).toBe(1);
      expect(unreviewed[0].subject).toBe("s2");

      expect(knownDefects.length).toBe(1);
      expect(knownDefects[0].subject).toBe("s3");

      // r4 is unbaselined; r5 is an error and stays unbaselined
      expect(unbaselined.length).toBe(2);
      expect(unbaselined.some((f) => f.rule === "r4")).toBe(true);
      expect(unbaselined.some((f) => f.rule === "r5")).toBe(true);

      // Stale entries detection
      expect(staleAccepted.length).toBe(1);
      expect(staleAccepted[0].rule).toBe("r_stale");

      expect(staleUnreviewed.length).toBe(1);
      expect(staleUnreviewed[0].rule).toBe("r_stale_unreviewed");

      expect(staleKnownDefects.length).toBe(1);
      expect(staleKnownDefects[0].rule).toBe("r_stale_defect");
    });

    it("does not baseline errors even if registered in accepted or defect lists", () => {
      const findings: Finding[] = [
        { city_id: "a", rule: "r1", severity: "error", subject: "s1", message: "m1" },
      ];
      const baseline: BaselineFile = {
        accepted_warnings: [
          { city_id: "a", rule: "r1", subject: "s1", reason: "known" },
        ],
      };
      const { unbaselined, accepted } = applyBaseline(findings, baseline);
      expect(accepted.length).toBe(0);
      expect(unbaselined.length).toBe(1);
      expect(unbaselined[0].severity).toBe("error");
    });

    it("segregates pending rules into pending list without failing CI", () => {
      const findings: Finding[] = [
        { city_id: "a", rule: "future-segment-no-stations", severity: "warn", subject: "s1", message: "m1" },
      ];
      const baseline: BaselineFile = {
        accepted_warnings: [
          { city_id: "a", rule: "future-segment-no-stations", subject: "s1", reason: "awaiting M10.3 repair" },
        ],
        pending_rules: ["future-segment-no-stations"],
      };
      const { unbaselined, pending, staleAccepted } = applyBaseline(findings, baseline);
      expect(unbaselined.length).toBe(0);
      expect(pending.length).toBe(1);
      expect(pending[0].rule).toBe("future-segment-no-stations");
      expect(staleAccepted).toHaveLength(0);
    });

    it("tracks documented coverage gaps separately from warning baselines", () => {
      const findings: Finding[] = [
        { city_id: "a", rule: "coverage-gap", severity: "warn", subject: "line-x|north extension", message: "Geometry not available" },
      ];
      const { unbaselined, documentedCoverageGaps } = applyBaseline(findings, { accepted_warnings: [] });
      expect(unbaselined).toEqual([]);
      expect(documentedCoverageGaps).toEqual(findings);
    });
  });

  describe("Deterministic output", () => {
    it("produces identical findings on repeated runs", () => {
      const data = makeDataset();
      const r1 = runAudit(data, AUDIT_OPTIONS);
      const r2 = runAudit(data, AUDIT_OPTIONS);
      expect(r1.findings).toEqual(r2.findings);
      expect(r1.summaries).toEqual(r2.summaries);
    });
  });

  describe("Report formatters", () => {
    it("markdown report contains city name and severity counts", () => {
      const result = runAudit(makeDataset(), AUDIT_OPTIONS);
      const md = formatMarkdownReport(result);
      expect(md).toContain("Test City");
      expect(md).toContain("Errors");
      expect(md).toContain("Warnings");
    });

    it("JSON report is valid JSON", () => {
      const result = runAudit(makeDataset(), AUDIT_OPTIONS);
      const json = formatJsonReport(result);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it("JSON report contains all findings", () => {
      const result = runAudit(makeDataset(), AUDIT_OPTIONS);
      const json = formatJsonReport(result);
      const parsed = JSON.parse(json) as AuditResult;
      expect(parsed.findings.length).toBe(result.findings.length);
    });
  });

  describe("Write containment", () => {
    it("audit engine returns data only, does not write files", () => {
      // The runAudit function returns an AuditResult, it never writes files.
      // Only the CLI entry point writes to reports/.
      // This test confirms the function signature returns data.
      const result = runAudit(makeDataset(), AUDIT_OPTIONS);
      expect(result).toHaveProperty("date");
      expect(result).toHaveProperty("summaries");
      expect(result).toHaveProperty("findings");
      expect(Array.isArray(result.findings)).toBe(true);
    });
  });

  describe("D. Ground truth (skip when no reference)", () => {
    it("produces info finding when reference file is missing", () => {
      const result = runAudit(makeDataset(), {
        ...AUDIT_OPTIONS,
        referenceDir: "__nonexistent__",
      });
      const gtFindings = findByRule(result.findings, "ground-truth-missing");
      expect(gtFindings.length).toBe(1);
      expect(gtFindings[0].severity).toBe("info");
    });

    it("validates reference-self-check rule for station sum and chronological order", () => {
      const fs = require("node:fs");
      const path = require("node:path");
      const os = require("node:os");
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ref-test-"));
      
      const invalidRef = {
        city_id: "test-city",
        compiled_on: "2026-10-07",
        lines: [
          {
            line_id: "tc-red",
            official_name: "Test Line 1",
            operator: "Test Operator",
            operational_stations: 10,
            official_length_km: 15.0,
            terminals: ["Station 1", "Station 2"],
            openings: [
              {
                stage: "Stage 2",
                phase: "2",
                opened_on: "2024-01-01",
                stations_added: 4,
                source: { title: "Ref", url: "https://example.com", retrieved_at: "2026-10-07" },
              },
              {
                stage: "Stage 1",
                phase: "1",
                opened_on: "2022-01-01", // Not in chronological order!
                stations_added: 4, // 4 + 4 = 8 != 10
                source: { title: "Ref", url: "https://example.com", retrieved_at: "2026-10-07" },
              },
            ],
          },
        ],
      };

      fs.writeFileSync(path.join(tmpDir, "test-city.json"), JSON.stringify(invalidRef));

      const result = runAudit(makeDataset(), {
        ...AUDIT_OPTIONS,
        referenceDir: tmpDir,
      });

      const selfCheckFindings = findByRule(result.findings, "reference-self-check");
      expect(selfCheckFindings.length).toBe(2);
      expect(selfCheckFindings.some((f) => f.message.includes("chronological"))).toBe(true);
      expect(selfCheckFindings.some((f) => f.message.includes("sum of stations_added"))).toBe(true);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe("E. M10.3 Audit Rules", () => {
    it("future-segment-no-stations: flags future segment with 0 stations and no stations_not_published flag", () => {
      // Failing fixture: future segment with 0 stations
      const failingSeg = makeSegment({
        segment_id: "fail-future-seg",
        status: "construction",
        expected_completion: "2028-12",
        inaugurated_on: null,
        stations_count: 0,
      });
      const failingData = makeDataset({ segments: [failingSeg], stations: [] });
      const failResult = runAudit(failingData, AUDIT_OPTIONS);
      const failHits = findByRule(failResult.findings, "future-segment-no-stations");
      expect(failHits.length).toBe(1);
      expect(failHits[0].subject).toBe("fail-future-seg");

      // Passing fixture: future segment with stations_not_published
      const passingSeg = makeSegment({
        segment_id: "pass-future-seg",
        status: "construction",
        expected_completion: "2028-12",
        inaugurated_on: null,
        stations_count: 0,
        stations_not_published: true,
      });
      const passData = makeDataset({ segments: [passingSeg], stations: [] });
      const passResult = runAudit(passData, AUDIT_OPTIONS);
      const passHits = findByRule(passResult.findings, "future-segment-no-stations");
      expect(passHits.length).toBe(0);
    });

    it("cross-network-interchange: flags adjacent stations across networks without interchange_id", () => {
      // Failing fixture: Delhi and Gurugram stations 100m apart without interchange_id
      const lineDel = makeLine({ id: "del-yellow", city_id: "delhi", city: "Delhi" });
      const lineGur = makeLine({ id: "gur-rapid", city_id: "gurugram", city: "Gurugram" });
      const stDelhi = makeStation({
        station_id: "del-sikanderpur",
        city_id: "delhi",
        city: "Delhi",
        line_ids: ["del-yellow"],
        name: "Sikanderpur",
        coordinates: [77.092, 28.481],
        interchange_id: undefined,
      });
      const stGurugram = makeStation({
        station_id: "gur-sikanderpur",
        city_id: "gurugram",
        city: "Gurugram",
        line_ids: ["gur-rapid"],
        name: "Sikanderpur",
        coordinates: [77.0925, 28.481],
        interchange_id: undefined,
      });
      const failingData = makeDataset({
        cities: [
          makeCity({ id: "delhi", name: "Delhi", bbox: [76.5, 28.0, 77.5, 29.0] }),
          makeCity({ id: "gurugram", name: "Gurugram", bbox: [76.5, 28.0, 77.5, 29.0] }),
        ],
        lines: [lineDel, lineGur],
        stations: [stDelhi, stGurugram],
      });
      const failResult = runAudit(failingData, AUDIT_OPTIONS);
      const failHits = findByRule(failResult.findings, "cross-network-interchange");
      expect(failHits.length).toBe(1);

      // Passing fixture: stations share interchange_id
      const passDelhi = makeStation({
        station_id: "del-sikanderpur",
        city_id: "delhi",
        city: "Delhi",
        line_ids: ["del-yellow"],
        name: "Sikanderpur",
        coordinates: [77.092, 28.481],
        interchange_id: "sikanderpur-cluster",
      });
      const passGurugram = makeStation({
        station_id: "gur-sikanderpur",
        city_id: "gurugram",
        city: "Gurugram",
        line_ids: ["gur-rapid"],
        name: "Sikanderpur",
        coordinates: [77.0925, 28.481],
        interchange_id: "sikanderpur-cluster",
      });
      const passData = makeDataset({
        cities: [
          makeCity({ id: "delhi", name: "Delhi", bbox: [76.5, 28.0, 77.5, 29.0] }),
          makeCity({ id: "gurugram", name: "Gurugram", bbox: [76.5, 28.0, 77.5, 29.0] }),
        ],
        lines: [lineDel, lineGur],
        stations: [passDelhi, passGurugram],
      });
      const passResult = runAudit(passData, AUDIT_OPTIONS);
      const passHits = findByRule(passResult.findings, "cross-network-interchange");
      expect(passHits.length).toBe(0);
    });

    it("verified-without-official-source: flags records with last_verified but only OSM references", () => {
      // Failing fixture: station with last_verified and only OSM reference
      const failingStation = makeStation({
        station_id: "st-osm-only",
        last_verified: "2026-01-01",
        references: ["https://www.openstreetmap.org/node/123"],
      });
      const failResult = runAudit(makeDataset({ stations: [failingStation] }), AUDIT_OPTIONS);
      const failHits = findByRule(failResult.findings, "verified-without-official-source");
      expect(failHits.length).toBe(1);
      expect(failHits[0].subject).toBe("st-osm-only");

      // Passing fixture: station with official government reference
      const passingStation = makeStation({
        station_id: "st-official",
        last_verified: "2026-01-01",
        references: ["https://delhimetrorail.com/official-press-release"],
      });
      const passResult = runAudit(makeDataset({ stations: [passingStation] }), AUDIT_OPTIONS);
      const passHits = findByRule(passResult.findings, "verified-without-official-source");
      expect(passHits.length).toBe(0);
    });

    it("operational-station-no-opened-on: flags operational stations with null opened_on", () => {
      // Failing fixture: operational station with null opened_on
      const failingStation = makeStation({
        station_id: "st-no-date",
        status: "operational",
        opened_on: null,
      });
      const failResult = runAudit(makeDataset({ stations: [failingStation] }), AUDIT_OPTIONS);
      const failHits = findByRule(failResult.findings, "operational-station-no-opened-on");
      expect(failHits.length).toBe(1);

      // Passing fixture: operational station with opened_on date
      const passingStation = makeStation({
        station_id: "st-has-date",
        status: "operational",
        opened_on: "2020-01-01",
      });
      const passResult = runAudit(makeDataset({ stations: [passingStation] }), AUDIT_OPTIONS);
      const passHits = findByRule(passResult.findings, "operational-station-no-opened-on");
      expect(passHits.length).toBe(0);
    });
  });

  describe("F. M8.1 Audit Rules (Blind-Spot Closure)", () => {
    it("declared-not-compiled: reports missing override segment and passes a compiled declaration", () => {
      const declarations = {
        segments: [{ city_id: "test-city", line_id: "tc-red", segment_id: "tc-red-seg-01" }],
        lines: [{ city_id: "test-city", line_id: "tc-red" }],
      };
      const failResult = runAudit(makeDataset({ segments: [] }), {
        ...AUDIT_OPTIONS,
        declarations,
      });
      const failHits = findByRule(failResult.findings, "declared-not-compiled");
      expect(failHits).toHaveLength(1);
      expect(failHits[0].subject).toBe("tc-red-seg-01");

      const passSegment = makeSegment({ segment_id: "tc-red-seg-01" });
      const passResult = runAudit(makeDataset({ segments: [passSegment] }), {
        ...AUDIT_OPTIONS,
        declarations,
      });
      expect(findByRule(passResult.findings, "declared-not-compiled")).toHaveLength(0);
    });

    it("coverage gaps cannot downgrade operational declarations", () => {
      const result = runAudit(makeDataset({ segments: [] }), {
        ...AUDIT_OPTIONS,
        declarations: {
          segments: [{
            city_id: "test-city",
            line_id: "tc-red",
            segment_id: "tc-red-seg-01",
            status: "operational",
          }],
          lines: [],
        },
        coverageGaps: [{
          city_id: "test-city",
          line_id: "tc-red",
          stretch: "tc-red-seg-01",
          status: "planned",
          source_url: "https://example.com/source",
          reason: "Fixture only",
          review_date: "2026-10-15",
        }],
      });

      expect(findByRule(result.findings, "declared-not-compiled")).toHaveLength(1);
      expect(findByRule(result.findings, "coverage-gap")).toHaveLength(0);
    });

    it("reclassifies a matching planned declaration as a coverage gap", () => {
      const result = runAudit(makeDataset({ segments: [] }), {
        ...AUDIT_OPTIONS,
        declarations: {
          segments: [{
            city_id: "test-city",
            line_id: "tc-red",
            segment_id: "tc-red-seg-01",
            status: "planned",
          }],
          lines: [],
        },
        coverageGaps: [{
          city_id: "test-city",
          line_id: "tc-red",
          stretch: "tc-red-seg-01",
          status: "planned",
          source_url: "https://example.com/source",
          reason: "Fixture only",
          review_date: "2026-10-15",
        }],
      });

      expect(findByRule(result.findings, "coverage-gap")).toHaveLength(1);
      expect(findByRule(result.findings, "declared-not-compiled")).toHaveLength(0);
    });

    it("keeps an unlisted planned declaration as an error", () => {
      const result = runAudit(makeDataset({ segments: [] }), {
        ...AUDIT_OPTIONS,
        declarations: {
          segments: [{
            city_id: "test-city",
            line_id: "tc-red",
            segment_id: "tc-red-seg-01",
            status: "planned",
          }],
          lines: [],
        },
        coverageGaps: [],
      });

      expect(findByRule(result.findings, "declared-not-compiled")).toHaveLength(1);
      expect(findByRule(result.findings, "coverage-gap")).toHaveLength(0);
    });

    it("segment-parallel-duplicate: flags twin tracks 20 m apart for 500 m and passes separate tracks", () => {
      // Failing fixture: twin tracks 20m apart (~0.00018 deg lat) for 500m
      const segTrack1 = makeSegment({
        segment_id: "seg-track-1",
        geometry: {
          type: "LineString",
          coordinates: [
            [77.5, 12.5],
            [77.505, 12.5],
          ],
        },
      });
      const segTrack2 = makeSegment({
        segment_id: "seg-track-2",
        geometry: {
          type: "LineString",
          coordinates: [
            [77.5, 12.50018],
            [77.505, 12.50018],
          ],
        },
      });
      const failData = makeDataset({ segments: [segTrack1, segTrack2], stations: [] });
      const failResult = runAudit(failData, AUDIT_OPTIONS);
      const failHits = findByRule(failResult.findings, "segment-parallel-duplicate");
      expect(failHits.length).toBe(1);
      expect(failHits[0].subject).toContain("seg-track-1");

      // Passing fixture: tracks separated by 500m (~0.0045 deg)
      const passTrack2 = makeSegment({
        segment_id: "seg-track-pass",
        geometry: {
          type: "LineString",
          coordinates: [
            [77.5, 12.505],
            [77.505, 12.505],
          ],
        },
      });
      const passData = makeDataset({ segments: [segTrack1, passTrack2], stations: [] });
      const passResult = runAudit(passData, AUDIT_OPTIONS);
      const passHits = findByRule(passResult.findings, "segment-parallel-duplicate");
      expect(passHits.length).toBe(0);
    });

    it("shared corridor suppression requires the measured overlap to match the station range within 15%", () => {
      const source = "https://operator.example/route-map";
      const shared = {
        segment_ids: ["shared-a", "shared-b"],
        shared_station_ids: ["shared-start", "shared-end"],
        reason: "Official route map shows the consecutive common trunk.",
        source,
      };
      const segmentA = (endLng: number) => makeSegment({
        segment_id: "shared-a",
        shared_corridor: shared,
        geometry: { type: "LineString", coordinates: [[77.5, 12.5], [endLng, 12.5]] },
      });
      const segmentB = (endLng: number) => makeSegment({
        segment_id: "shared-b",
        shared_corridor: shared,
        geometry: { type: "LineString", coordinates: [[77.5, 12.5001], [endLng, 12.5001]] },
      });
      const sharedStations = (endLng: number) => [
        makeStation({ station_id: "shared-start", coordinates: [77.5, 12.5], line_ids: ["tc-red"] }),
        makeStation({ station_id: "shared-end", coordinates: [endLng, 12.5], line_ids: ["tc-red"] }),
      ];

      const matchingResult = runAudit(
        makeDataset({
          segments: [segmentA(77.51), segmentB(77.51)],
          stations: sharedStations(77.51),
        }),
        AUDIT_OPTIONS
      );
      expect(findByRule(matchingResult.findings, "segment-parallel-duplicate")).toHaveLength(0);
      expect(findByRule(matchingResult.findings, "segment-overlap")).toHaveLength(0);

      const oversizedResult = runAudit(
        makeDataset({
          segments: [segmentA(77.53), segmentB(77.53)],
          stations: sharedStations(77.51),
        }),
        AUDIT_OPTIONS
      );
      expect(findByRule(oversizedResult.findings, "segment-parallel-duplicate").length).toBeGreaterThan(0);
      expect(findByRule(oversizedResult.findings, "segment-overlap").length).toBeGreaterThan(0);
    });

    it("segment-hairpin: flags sharp 170° spike doubling back within 100 m", () => {
      // Failing fixture: spike turning back 170° within 100m
      const segHairpin = makeSegment({
        segment_id: "seg-hairpin",
        geometry: {
          type: "LineString",
          coordinates: [
            [77.5, 12.5],
            [77.5005, 12.5],
            [77.50005, 12.50005],
          ],
        },
      });
      const failResult = runAudit(makeDataset({ segments: [segHairpin], stations: [] }), AUDIT_OPTIONS);
      const failHits = findByRule(failResult.findings, "segment-hairpin");
      expect(failHits.length).toBe(1);
      expect(failHits[0].subject).toContain("seg-hairpin");

      // Passing fixture: smooth curve with turn under 90°
      const segSmooth = makeSegment({
        segment_id: "seg-smooth",
        geometry: {
          type: "LineString",
          coordinates: [
            [77.5, 12.5],
            [77.505, 12.5],
            [77.508, 12.503],
          ],
        },
      });
      const passResult = runAudit(makeDataset({ segments: [segSmooth], stations: [] }), AUDIT_OPTIONS);
      const passHits = findByRule(passResult.findings, "segment-hairpin");
      expect(passHits.length).toBe(0);
    });

    it("segment-sparse-vertices: flags 1.5 km chord in non-schematic segment and passes schematic", () => {
      // Failing fixture: 1.5 km straight leg (~0.014 deg lon) in non-schematic segment
      const segChord = makeSegment({
        segment_id: "seg-chord",
        geometry_quality: "exact",
        geometry: {
          type: "LineString",
          coordinates: [
            [77.5, 12.5],
            [77.514, 12.5],
          ],
        },
      });
      const failResult = runAudit(makeDataset({ segments: [segChord], stations: [] }), AUDIT_OPTIONS);
      const failHits = findByRule(failResult.findings, "segment-sparse-vertices");
      expect(failHits.length).toBe(1);
      expect(failHits[0].subject).toContain("seg-chord");

      // Passing fixture: 1.5 km chord in schematic segment
      const segSchematic = makeSegment({
        segment_id: "seg-schematic",
        geometry_quality: "schematic",
        geometry: {
          type: "LineString",
          coordinates: [
            [77.5, 12.5],
            [77.514, 12.5],
          ],
        },
      });
      const passResult = runAudit(makeDataset({ segments: [segSchematic], stations: [] }), AUDIT_OPTIONS);
      const passHits = findByRule(passResult.findings, "segment-sparse-vertices");
      expect(passHits.length).toBe(0);

      const cityOverrideResult = runAudit(
        makeDataset({ segments: [segChord], stations: [] }),
        {
          ...AUDIT_OPTIONS,
          cityThresholdOverrides: { "test-city": { sparseVertexMaxChordM: 2000 } },
        }
      );
      expect(findByRule(cityOverrideResult.findings, "segment-sparse-vertices")).toHaveLength(0);
    });

    it("orphan-future-station: flags future station with no nearby segment", () => {
      // Failing fixture: future station 1 km away from any line segment
      const futureOrphan = makeStation({
        station_id: "st-future-orphan",
        status: "construction",
        expected_completion: "2028-12",
        opened_on: null,
        line_ids: ["tc-red"],
        coordinates: [77.5, 12.51], // ~1.1 km north of segment at 12.5
      });
      const failResult = runAudit(makeDataset({ stations: [futureOrphan] }), AUDIT_OPTIONS);
      const failHits = findByRule(failResult.findings, "orphan-future-station");
      expect(failHits.length).toBe(1);
      expect(failHits[0].subject).toBe("st-future-orphan");

      // Passing fixture: future station close to segment (within 50m)
      const futureNear = makeStation({
        station_id: "st-future-near",
        status: "construction",
        expected_completion: "2028-12",
        opened_on: null,
        line_ids: ["tc-red"],
        coordinates: [77.5, 12.5002], // ~22m away
      });
      const passResult = runAudit(makeDataset({ stations: [futureNear] }), AUDIT_OPTIONS);
      const passHits = findByRule(passResult.findings, "orphan-future-station");
      expect(passHits.length).toBe(0);

      const nearBeyondDefault = makeStation({
        station_id: "st-future-near-default-limit",
        status: "construction",
        expected_completion: "2028-12",
        opened_on: null,
        line_ids: ["tc-red"],
        coordinates: [77.5, 12.5009], // ~100 m away; beyond the 75 m default
      });
      const nearData = makeDataset({ stations: [nearBeyondDefault] });
      expect(findByRule(runAudit(nearData, AUDIT_OPTIONS).findings, "orphan-future-station")).toHaveLength(1);
      const overridden = runAudit(nearData, {
        ...AUDIT_OPTIONS,
        cityThresholdOverrides: { "test-city": { futureStationToSegmentMaxM: 150 } },
      });
      expect(findByRule(overridden.findings, "orphan-future-station")).toHaveLength(0);
    });

    it("line-terminal-missing: flags reference terminal station not near segment end", () => {
      const fs = require("node:fs");
      const path = require("node:path");
      const os = require("node:os");
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ref-term-test-"));

      const refData = {
        city_id: "test-city",
        compiled_on: "2026-10-07",
        lines: [
          {
            line_id: "tc-red",
            official_name: "Red Line",
            operator: "TCRL",
            topology: "linear",
            status: "operational",
            operational_stations: 2,
            terminals: ["Station A", "Station Omega"],
          },
        ],
      };
      fs.writeFileSync(path.join(tmpDir, "test-city.json"), JSON.stringify(refData));

      // Failing fixture: Station Omega is 1.5 km away from segment ends
      const stA = makeStation({
        station_id: "st-a",
        name: "Station A",
        coordinates: [77.5, 12.5], // matches start of segment
      });
      const stOmegaFar = makeStation({
        station_id: "st-omega",
        name: "Station Omega",
        coordinates: [77.55, 12.5], // far from segment end at 77.6
      });
      const segRed = makeSegment({
        segment_id: "tc-red-seg",
        geometry: {
          type: "LineString",
          coordinates: [
            [77.5, 12.5],
            [77.6, 12.5],
          ],
        },
      });
      const failDataset = makeDataset({
        stations: [stA, stOmegaFar],
        segments: [segRed],
      });
      const failResult = runAudit(failDataset, { ...AUDIT_OPTIONS, referenceDir: tmpDir });
      const failHits = findByRule(failResult.findings, "line-terminal-missing");
      expect(failHits.length).toBe(1);
      expect(failHits[0].subject).toContain("st-omega");

      // Passing fixture: Station Omega is at the segment end (77.6, 12.5)
      const stOmegaEnd = makeStation({
        station_id: "st-omega",
        name: "Station Omega",
        coordinates: [77.6, 12.5],
      });
      const passDataset = makeDataset({
        stations: [stA, stOmegaEnd],
        segments: [segRed],
      });
      const passResult = runAudit(passDataset, { ...AUDIT_OPTIONS, referenceDir: tmpDir });
      const passHits = findByRule(passResult.findings, "line-terminal-missing");
      expect(passHits.length).toBe(0);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("declared-not-compiled: flags a reference construction corridor without a feature", () => {
      const fs = require("node:fs");
      const path = require("node:path");
      const os = require("node:os");
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ref-con-test-"));

      const refData = {
        city_id: "test-city",
        compiled_on: "2026-10-07",
        lines: [
          {
            line_id: "tc-red",
            official_name: "Red Line",
            operator: "TCRL",
            status: "under_construction",
            terminals: ["Station A", "Station B"],
            construction: [
              {
                stretch: "Station A - Station B",
                phase: "2",
                expected_completion: "2028-12-31",
                stations: 2,
              },
            ],
          },
        ],
      };
      fs.writeFileSync(path.join(tmpDir, "test-city.json"), JSON.stringify(refData));

      // Failing fixture: no construction segments for tc-red
      const failDataset = makeDataset({ segments: [] });
      const failResult = runAudit(failDataset, { ...AUDIT_OPTIONS, referenceDir: tmpDir });
      const failHits = findByRule(failResult.findings, "declared-not-compiled");
      expect(failHits.length).toBe(1);
      expect(failHits[0].subject).toContain("Station A - Station B");

      // Passing fixture: construction segment matching stretch exists
      const conSeg = makeSegment({
        segment_id: "tc-red-con-01",
        status: "construction",
        geometry: {
          type: "LineString",
          coordinates: [
            [77.5, 12.5],
            [77.6, 12.5],
          ],
        },
      });
      const passDataset = makeDataset({ segments: [conSeg] });
      const passResult = runAudit(passDataset, { ...AUDIT_OPTIONS, referenceDir: tmpDir });
      const passHits = findByRule(passResult.findings, "declared-not-compiled");
      expect(passHits.length).toBe(0);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("schematic construction stretch requires cited source and two mapped terminal stations", () => {
      const fs = require("node:fs");
      const path = require("node:path");
      const os = require("node:os");
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "schematic-ref-test-"));
      fs.writeFileSync(path.join(tmpDir, "test-city.json"), JSON.stringify({
        city_id: "test-city",
        compiled_on: "2026-10-15",
        lines: [{
          line_id: "tc-red",
          official_name: "Red Line",
          operator: "TCRL",
          topology: "linear",
          operational_stations: 2,
          operational_length_km: 0,
          planned_length_km: 1,
          terminals: ["Station A", "Station B"],
          status: "under_construction",
          construction: [{
            stretch: "Station A - Station B",
            phase: "1",
            expected_completion: "2028",
            stations: 2,
          }],
        }],
      }));
      const stations = [
        makeStation({ station_id: "schematic-a", name: "Station A", coordinates: [77.5, 12.5], line_ids: ["tc-red"] }),
        makeStation({ station_id: "schematic-b", name: "Station B", coordinates: [77.51, 12.5], line_ids: ["tc-red"] }),
      ];
      const segment = (end: number, geometryQuality: "schematic" | "exact" = "schematic") => makeSegment({
        segment_id: "tc-red-schematic",
        status: "construction",
        inaugurated_on: null,
        expected_completion: "2028",
        geometry_quality: geometryQuality,
        references: ["https://tcrl.org/official-alignment"],
        geometry: { type: "LineString", coordinates: [[77.5, 12.5], [end, 12.5]] },
      });

      const passing = runAudit(
        makeDataset({ stations, segments: [segment(77.51)] }),
        { ...AUDIT_OPTIONS, referenceDir: tmpDir }
      );
      expect(findByRule(passing.findings, "schematic-segment-incomplete")).toHaveLength(0);
      expect(findByRule(passing.findings, "reference-construction-stretch-missing")).toHaveLength(0);

      const failing = runAudit(
        makeDataset({ stations, segments: [segment(77.53, "exact")] }),
        { ...AUDIT_OPTIONS, referenceDir: tmpDir }
      );
      expect(findByRule(failing.findings, "schematic-segment-incomplete")).toHaveLength(0);
      expect(findByRule(failing.findings, "declared-not-compiled")).toHaveLength(0);
      expect(failing.findings.map(({ rule, subject }) => ({ rule, subject }))).toEqual(
        expect.arrayContaining([{ rule: "reference-construction-stretch-missing", subject: "tc-red|Station A - Station B" }])
      );
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("city-km-vs-reference: flags city operational length mismatch > 10% vs reference", () => {
      const fs = require("node:fs");
      const path = require("node:path");
      const os = require("node:os");
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ref-km-test-"));

      const refData = {
        city_id: "test-city",
        compiled_on: "2026-10-07",
        lines: [
          {
            line_id: "tc-red",
            official_name: "Red Line",
            operator: "TCRL",
            status: "operational",
            operational_length_km: 25.0, // Reference says 25 km
            terminals: ["Station A", "Station B"],
          },
        ],
      };
      fs.writeFileSync(path.join(tmpDir, "test-city.json"), JSON.stringify(refData));

      // Failing fixture: Data has ~10.8 km (mismatch ~56% > 10%)
      const failDataset = makeDataset(); // segment is ~10.8 km
      const failResult = runAudit(failDataset, { ...AUDIT_OPTIONS, referenceDir: tmpDir });
      const failHits = findByRule(failResult.findings, "city-km-vs-reference");
      expect(failHits.length).toBe(1);
      expect(failHits[0].subject).toBe("test-city");

      // Passing fixture: Reference is 11.0 km (~2% diff)
      refData.lines[0].operational_length_km = 11.0;
      fs.writeFileSync(path.join(tmpDir, "test-city.json"), JSON.stringify(refData));

      const passResult = runAudit(failDataset, { ...AUDIT_OPTIONS, referenceDir: tmpDir });
      const passHits = findByRule(passResult.findings, "city-km-vs-reference");
      expect(passHits.length).toBe(0);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});

