/**
 * CLI entry point for `npm run audit:data`.
 *
 * Read-only — never modifies data files.
 * Writes reports to reports/data-audit/<date>.{md,json}.
 * Exit code 1 if any error exists or any warn is not baselined.
 * Set AUDIT_WARNINGS=report-only to keep warnings visible without failing CI.
 */
import fs from "node:fs";
import path from "node:path";
import {
  runAudit,
  applyBaseline,
  formatMarkdownReport,
  formatJsonReport,
} from "./audit-engine";
import type { AuditDeclarations, BaselineFile, CoverageGap } from "./audit-engine";
import { loadMetroDatasetFromDisk, readJsonFile } from "../lib/load-dataset";

function main() {
  const dataDir = path.resolve(process.cwd(), "data");
  const reportsDir = path.resolve(process.cwd(), "reports/data-audit");

  const { cities, lines, segments, stations } = loadMetroDatasetFromDisk(dataDir);

  // Load overrides for self-intersection exemptions, intentional breaks, and out of scope stations
  const selfIntersectionExemptions: string[] = [];
  const intentionalBreaks: string[] = [];
  const outOfScopeStations: Record<string, string[]> = {};
  const outOfScopeLineIds: string[] = [];
  const declarations: AuditDeclarations = { segments: [], lines: [] };
  const coverageGapsPath = path.join(dataDir, "audit", "coverage-gaps.json");
  let coverageGaps: CoverageGap[] = [];
  if (fs.existsSync(coverageGapsPath)) {
    try {
      const parsed: unknown = readJsonFile(coverageGapsPath);
      if (Array.isArray(parsed)) {
        coverageGaps = parsed.filter(
          (gap): gap is CoverageGap =>
            typeof gap?.city_id === "string" &&
            typeof gap?.line_id === "string" &&
            typeof gap?.stretch === "string" &&
            (gap?.segment_id === undefined || typeof gap.segment_id === "string") &&
            ["planned", "under_construction"].includes(gap?.status) &&
            typeof gap?.source_url === "string" &&
            /^https?:\/\//.test(gap.source_url) &&
            typeof gap?.reason === "string" &&
            typeof gap?.review_date === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(gap.review_date)
        );
      }
    } catch {
      console.error(`⚠️ Could not parse ${coverageGapsPath}; no gaps will be reclassified.`);
    }
  }

  // Look for exemptions in each city's override file
  const overridesDir = path.join(dataDir, "overrides");
  if (fs.existsSync(overridesDir)) {
    fs.readdirSync(overridesDir).filter((file) => file.endsWith(".json") && file !== "pending-unverified.json").forEach((file) => {
      try {
        const override = readJsonFile<any>(path.join(overridesDir, file));
        const cityId = override.city?.id || file.replace(".json", "");
        declarations.segments.push(...(override.segments || []).filter((s: any) => s.segment_id && s.line_id)
          .map((s: any) => ({ city_id: cityId, line_id: s.line_id, segment_id: s.segment_id, status: s.status })));
        selfIntersectionExemptions.push(...(override.selfIntersectionExemptions || []));
        intentionalBreaks.push(...(override.intentionalBreaks || []));
        if (override.out_of_scope_station_ids) outOfScopeStations[cityId] = override.out_of_scope_station_ids;
        outOfScopeLineIds.push(...(override.out_of_scope_line_ids || []));
      } catch {
        // Skip malformed override files
      }
    });
  }

  const referenceDir = path.join(dataDir, "reference");
  if (fs.existsSync(referenceDir)) {
    fs.readdirSync(referenceDir).filter((file) => file.endsWith(".json")).forEach((file) => {
      try {
        const reference = readJsonFile<any>(path.join(referenceDir, file));
        declarations.lines.push(...(reference.lines || []).filter((line: any) => reference.city_id && line.line_id)
          .map((line: any) => ({ city_id: reference.city_id, line_id: line.line_id })));
      } catch {
        // Ignore malformed reference files here; reference schema checks report them separately.
      }
    });
  }

  console.log("🔍 Running data audit...\n");

  const today = new Date().toISOString().slice(0, 10);
  const result = runAudit(
    { cities, lines, segments, stations },
    {
      currentDate: today,
      selfIntersectionExemptions,
      intentionalBreaks,
      referenceDir: path.join(dataDir, "reference"),
      outOfScopeStations,
      outOfScopeLineIds,
      declarations,
      coverageGaps,
    }
  );

  // Load baseline if it exists
  let baseline: BaselineFile = { accepted_warnings: [] };
  const baselinePath = path.join(dataDir, "audit-baseline.json");
  if (fs.existsSync(baselinePath)) {
    try {
      baseline = readJsonFile<BaselineFile>(baselinePath);
    } catch {
      console.warn("⚠️ Failed to parse audit-baseline.json, ignoring.");
    }
  }

  // Always write reports
  fs.mkdirSync(reportsDir, { recursive: true });
  const mdPath = path.join(reportsDir, `${today}.md`);
  const jsonPath = path.join(reportsDir, `${today}.json`);

  fs.writeFileSync(mdPath, formatMarkdownReport(result, baseline), "utf-8");
  fs.writeFileSync(jsonPath, formatJsonReport(result), "utf-8");

  // Summary output
  const totalErrors = result.findings.filter((f) => f.severity === "error").length;
  const totalWarnings = result.findings.filter((f) => f.severity === "warn").length;
  const totalInfo = result.findings.filter((f) => f.severity === "info").length;

  console.log("📊 Audit Summary:");
  console.log("");

  const cityCounts = result.findings.reduce((counts, finding) => {
    const count = counts.get(finding.city_id) || { error: 0, warn: 0, info: 0 };
    count[finding.severity]++;
    return counts.set(finding.city_id, count);
  }, new Map<string, { error: number; warn: number; info: number }>());
  for (const summary of result.summaries) {
    const { error: e = 0, warn: w = 0, info: i = 0 } = cityCounts.get(summary.city_id) || {};
    console.log(`  ${summary.city_name}: ${summary.lines} lines, ${summary.segments} segments, ${summary.stations} stations — ${e} errors, ${w} warnings, ${i} info`);
  }

  console.log("");
  console.log(`📝 Reports written:`);
  console.log(`   ${mdPath}`);
  console.log(`   ${jsonPath}`);
  console.log("");
  console.log(`🔴 Errors: ${totalErrors}`);
  console.log(`🟡 Warnings: ${totalWarnings}`);
  console.log(`🔵 Info: ${totalInfo}`);

  // Apply baseline and determine exit code
  const {
    unbaselined,
    accepted,
    unreviewed,
    knownDefects,
    pending,
    staleAccepted,
    staleUnreviewed,
    staleKnownDefects,
  } = applyBaseline(result.findings, baseline);

  const unbaselinedErrors = unbaselined.filter((f) => f.severity === "error").length;
  const unbaselinedWarns = unbaselined.filter((f) => f.severity === "warn").length;
  const warningsReportOnly = process.env.AUDIT_WARNINGS === "report-only";

  console.log(`✅ Accepted warnings (reviewed): ${accepted.length}`);
  console.log(`📋 Unreviewed warnings (awaiting city review): ${unreviewed.length}`);
  console.log(`🚨 Known walkthrough defects tracked: ${knownDefects.length}`);
  console.log(`⏳ Pending rules (report-only): ${pending.length}`);
  console.log(`🗺️ Coverage gaps: ${result.findings.filter((f) => f.rule === "coverage-gap").length}`);

  const totalStale = staleAccepted.length + staleUnreviewed.length + staleKnownDefects.length;
  if (totalStale > 0) {
    console.log("");
    console.log(`⚠️ Warning: Found ${totalStale} stale baseline entry/entries that match no active finding:`);
    [
      ...staleAccepted.map((s) => `[stale accepted] ${s.city_id} | ${s.rule} | ${s.subject}`),
      ...staleUnreviewed.map((s) => `[stale unreviewed] ${s.city_id} | ${s.rule} | ${s.subject}`),
      ...staleKnownDefects.map((s) => `[stale defect ${s.finding_id}] ${s.city_id} | ${s.rule} | ${s.subject}`),
    ].forEach((entry) => console.log(`   • ${entry}`));
  }

  if (unbaselinedErrors > 0 || (unbaselinedWarns > 0 && !warningsReportOnly)) {
    console.log("");
    console.log(`❌ ${unbaselinedErrors} errors and ${unbaselinedWarns} un-baselined warnings remain:`);
    for (const u of unbaselined) {
      console.log(`   • [${u.severity}] ${u.city_id} | ${u.rule} | ${u.subject} | ${u.message}`);
    }
    process.exit(1);
  } else if (warningsReportOnly && unbaselinedWarns > 0) {
    console.log("");
    console.log(
      `⚠️ ${unbaselinedWarns} un-baselined warnings remain; report-only mode ignores warnings for the exit code.`
    );
    process.exit(0);
  } else {
    console.log("");
    console.log("✅ All checks pass (no errors, all warnings baselined or tracked).");
    process.exit(0);
  }
}

main();
