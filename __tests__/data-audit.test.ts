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
    references: [],
    last_verified: "2026-01-01",
    completion_unconfirmed: false,
    ...overrides,
  };
  return {
    type: "Feature" as const,
    geometry: {
      type: "LineString" as const,
      coordinates: [
        [77.5, 12.5],
        [77.6, 12.5],
      ] as [number, number][],
    },
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
    last_verified: "2026-01-01",
    ...overrides,
  };
  return {
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [77.5, 12.5] as [number, number],
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
            makeStation({ is_interchange: true }),
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
    it("filters baselined warnings", () => {
      const findings: Finding[] = [
        { city_id: "a", rule: "r1", severity: "warn", subject: "s1", message: "m1" },
        { city_id: "a", rule: "r2", severity: "warn", subject: "s2", message: "m2" },
        { city_id: "a", rule: "r3", severity: "error", subject: "s3", message: "m3" },
      ];
      const baseline: BaselineFile = {
        accepted_warnings: [
          { city_id: "a", rule: "r1", subject: "s1", reason: "known" },
        ],
      };
      const { unbaselined, baselined } = applyBaseline(findings, baseline);
      expect(baselined.length).toBe(1);
      expect(unbaselined.length).toBe(2);
      // Errors are never baselined
      expect(unbaselined.some((f) => f.rule === "r3")).toBe(true);
    });

    it("does not baseline errors", () => {
      const findings: Finding[] = [
        { city_id: "a", rule: "r1", severity: "error", subject: "s1", message: "m1" },
      ];
      const baseline: BaselineFile = {
        accepted_warnings: [
          { city_id: "a", rule: "r1", subject: "s1", reason: "known" },
        ],
      };
      const { unbaselined } = applyBaseline(findings, baseline);
      expect(unbaselined.length).toBe(1);
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
});
