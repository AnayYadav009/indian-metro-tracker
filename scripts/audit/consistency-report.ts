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
import type { BaselineFile } from "./audit-engine";
import { loadMetroDatasetFromDisk } from "../lib/load-dataset";

function main() {
  const dataDir = path.resolve(process.cwd(), "data");
  const reportsDir = path.resolve(process.cwd(), "reports/data-audit");

  const { cities, lines, segments, stations } = loadMetroDatasetFromDisk(dataDir);

  // Load overrides for self-intersection exemptions, intentional breaks, and out of scope stations
  const selfIntersectionExemptions: string[] = [];
  const intentionalBreaks: string[] = [];
  const outOfScopeStations: Record<string, string[]> = {};
  const outOfScopeLineIds: string[] = [];

  // Look for exemptions in each city's override file
  const overridesDir = path.join(dataDir, "overrides");
  if (fs.existsSync(overridesDir)) {
    for (const file of fs.readdirSync(overridesDir)) {
      if (!file.endsWith(".json") || file === "pending-unverified.json") continue;
      try {
        const override = JSON.parse(
          fs.readFileSync(path.join(overridesDir, file), "utf-8")
        );
        const cityId = override.city?.id || file.replace(".json", "");
        if (override.selfIntersectionExemptions) {
          selfIntersectionExemptions.push(...override.selfIntersectionExemptions);
        }
        if (override.intentionalBreaks) {
          intentionalBreaks.push(...override.intentionalBreaks);
        }
        if (override.out_of_scope_station_ids) {
          outOfScopeStations[cityId] = override.out_of_scope_station_ids;
        }
        if (override.out_of_scope_line_ids) {
          outOfScopeLineIds.push(...override.out_of_scope_line_ids);
        }
      } catch {
        // Skip malformed override files
      }
    }
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
    }
  );

  // Load baseline if it exists
  let baseline: BaselineFile = { accepted_warnings: [] };
  const baselinePath = path.join(dataDir, "audit-baseline.json");
  if (fs.existsSync(baselinePath)) {
    try {
      baseline = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));
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

  for (const summary of result.summaries) {
    const cityFindings = result.findings.filter((f) => f.city_id === summary.city_id);
    const e = cityFindings.filter((f) => f.severity === "error").length;
    const w = cityFindings.filter((f) => f.severity === "warn").length;
    const i = cityFindings.filter((f) => f.severity === "info").length;
    console.log(
      `  ${summary.city_name}: ${summary.lines} lines, ${summary.segments} segments, ${summary.stations} stations — ${e} errors, ${w} warnings, ${i} info`
    );
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
  const { unbaselined } = applyBaseline(result.findings, baseline);
  const unbaselinedErrors = unbaselined.filter((f) => f.severity === "error").length;
  const unbaselinedWarns = unbaselined.filter((f) => f.severity === "warn").length;
  const warningsReportOnly = process.env.AUDIT_WARNINGS === "report-only";

  if (unbaselinedErrors > 0 || (unbaselinedWarns > 0 && !warningsReportOnly)) {
    console.log("");
    console.log(`❌ ${unbaselinedErrors} errors and ${unbaselinedWarns} un-baselined warnings remain.`);
    process.exit(1);
  } else if (warningsReportOnly && unbaselinedWarns > 0) {
    console.log("");
    console.log(
      `⚠️ ${unbaselinedWarns} un-baselined warnings remain; report-only mode ignores warnings for the exit code.`
    );
    process.exit(0);
  } else {
    console.log("");
    console.log("✅ All checks pass (no errors, all warnings baselined).");
    process.exit(0);
  }
}

main();
