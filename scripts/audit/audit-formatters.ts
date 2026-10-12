import type {
  Finding,
  BaselineFile,
  AuditResult,
  BaselineEntry,
  KnownDefectEntry,
} from "./audit-engine";

export interface ApplyBaselineResult {
  unbaselined: Finding[];
  accepted: Finding[];
  unreviewed: Finding[];
  knownDefects: Finding[];
  staleAccepted: BaselineEntry[];
  staleUnreviewed: BaselineEntry[];
  staleKnownDefects: KnownDefectEntry[];
}

/**
 * Separates findings into accepted, unreviewed, known defects, and unbaselined sets.
 * Also tracks stale baseline entries that match no active finding.
 */
export function applyBaseline(
  findings: Finding[],
  baseline: BaselineFile
): ApplyBaselineResult {
  const acceptedList = baseline.accepted_warnings || [];
  const unreviewedList = baseline.unreviewed_warnings || [];
  const knownDefectsList = baseline.known_defects || [];

  const acceptedKeys = new Set(acceptedList.map((e) => `${e.city_id}|${e.rule}|${e.subject}`));
  const unreviewedKeys = new Set(unreviewedList.map((e) => `${e.city_id}|${e.rule}|${e.subject}`));
  const knownDefectKeys = new Set(knownDefectsList.map((d) => `${d.city_id}|${d.rule}|${d.subject}`));

  const matchedAcceptedKeys = new Set<string>();
  const matchedUnreviewedKeys = new Set<string>();
  const matchedKnownDefectKeys = new Set<string>();

  const unbaselined: Finding[] = [];
  const accepted: Finding[] = [];
  const unreviewed: Finding[] = [];
  const knownDefects: Finding[] = [];

  for (const f of findings) {
    if (f.severity !== "warn") {
      unbaselined.push(f);
      continue;
    }

    const key = `${f.city_id}|${f.rule}|${f.subject}`;
    if (knownDefectKeys.has(key)) {
      knownDefects.push(f);
      matchedKnownDefectKeys.add(key);
    } else if (acceptedKeys.has(key)) {
      accepted.push(f);
      matchedAcceptedKeys.add(key);
    } else if (unreviewedKeys.has(key)) {
      unreviewed.push(f);
      matchedUnreviewedKeys.add(key);
    } else {
      unbaselined.push(f);
    }
  }

  const staleAccepted = acceptedList.filter(
    (e) => !matchedAcceptedKeys.has(`${e.city_id}|${e.rule}|${e.subject}`)
  );
  const staleUnreviewed = unreviewedList.filter(
    (e) => !matchedUnreviewedKeys.has(`${e.city_id}|${e.rule}|${e.subject}`)
  );
  const staleKnownDefects = knownDefectsList.filter(
    (d) => !matchedKnownDefectKeys.has(`${d.city_id}|${d.rule}|${d.subject}`)
  );

  return {
    unbaselined,
    accepted,
    unreviewed,
    knownDefects,
    staleAccepted,
    staleUnreviewed,
    staleKnownDefects,
  };
}

/**
 * Formats full markdown audit report.
 */
export function formatMarkdownReport(result: AuditResult, baseline?: BaselineFile): string {
  const lines: string[] = [];
  lines.push(`# Data Audit Report — ${result.date}`);
  lines.push("");

  // Per-city summary
  for (const summary of result.summaries) {
    lines.push(`## ${summary.city_name} (\`${summary.city_id}\`)`);
    lines.push("");
    lines.push("### Summary");
    lines.push("");
    lines.push(`| Entity | Count |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Lines | ${summary.lines} |`);
    lines.push(`| Segments | ${summary.segments} |`);
    lines.push(`| Stations | ${summary.stations} |`);
    lines.push("");

    lines.push("**Sources:**");
    lines.push("");
    if (Object.keys(summary.lineSources).length > 0) {
      lines.push(`- Lines: ${Object.entries(summary.lineSources).sort(([a],[b])=>a.localeCompare(b)).map(([s, c]) => `${s}: ${c}`).join(", ")}`);
    }
    if (Object.keys(summary.segmentSources).length > 0) {
      lines.push(`- Segments: ${Object.entries(summary.segmentSources).sort(([a],[b])=>a.localeCompare(b)).map(([s, c]) => `${s}: ${c}`).join(", ")}`);
    }
    if (Object.keys(summary.stationSources).length > 0) {
      lines.push(`- Stations: ${Object.entries(summary.stationSources).sort(([a],[b])=>a.localeCompare(b)).map(([s, c]) => `${s}: ${c}`).join(", ")}`);
    }
    lines.push("");

    // Findings for this city
    const cityFindings = result.findings.filter(
      (f) => f.city_id === summary.city_id
    );
    const errorCount = cityFindings.filter((f) => f.severity === "error").length;
    const warnCount = cityFindings.filter((f) => f.severity === "warn").length;
    const infoCount = cityFindings.filter((f) => f.severity === "info").length;

    lines.push(`### Findings: ${errorCount} errors, ${warnCount} warnings, ${infoCount} info`);
    lines.push("");

    // Per-rule counts table
    const ruleCountMap = new Map<string, { error: number; warn: number; info: number }>();
    for (const f of cityFindings) {
      if (!ruleCountMap.has(f.rule)) {
        ruleCountMap.set(f.rule, { error: 0, warn: 0, info: 0 });
      }
      ruleCountMap.get(f.rule)![f.severity]++;
    }

    if (ruleCountMap.size > 0) {
      lines.push("| Rule | Errors | Warnings | Info |");
      lines.push("|------|--------|----------|------|");
      for (const [rule, counts] of [...ruleCountMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        lines.push(`| \`${rule}\` | ${counts.error} | ${counts.warn} | ${counts.info} |`);
      }
      lines.push("");

      // First 20 findings per rule
      for (const [rule] of [...ruleCountMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const ruleFindings = cityFindings.filter((f) => f.rule === rule);
        lines.push(`#### \`${rule}\` (${ruleFindings.length} findings)`);
        lines.push("");

        const shown = ruleFindings.slice(0, 20);
        for (const f of shown) {
          const icon = f.severity === "error" ? "🔴" : f.severity === "warn" ? "🟡" : "🔵";
          lines.push(`- ${icon} **${f.severity}** \`${f.subject}\`: ${f.message}`);
        }

        if (ruleFindings.length > 20) {
          lines.push(`- ... and ${ruleFindings.length - 20} more (see JSON report)`);
        }
        lines.push("");
      }
    } else {
      lines.push("No findings for this city.");
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  // Overall totals
  const totalErrors = result.findings.filter((f) => f.severity === "error").length;
  const totalWarnings = result.findings.filter((f) => f.severity === "warn").length;
  const totalInfo = result.findings.filter((f) => f.severity === "info").length;

  lines.push("## Overall Totals");
  lines.push("");
  lines.push(`- **Errors:** ${totalErrors}`);
  lines.push(`- **Warnings:** ${totalWarnings}`);
  lines.push(`- **Info:** ${totalInfo}`);
  lines.push("");

  if (baseline) {
    const { accepted, unreviewed, knownDefects, staleAccepted, staleUnreviewed, staleKnownDefects } =
      applyBaseline(result.findings, baseline);

    lines.push(`- **Accepted warnings (reviewed):** ${accepted.length}`);
    lines.push(`- **Unreviewed warnings (awaiting city review):** ${unreviewed.length}`);
    lines.push(`- **Known defects tracked (active backlog):** ${knownDefects.length}`);
    lines.push("");

    const totalStale = staleAccepted.length + staleUnreviewed.length + staleKnownDefects.length;
    if (totalStale > 0) {
      lines.push(`⚠️ **Stale baseline entries (${totalStale}):**`);
      for (const s of staleAccepted) {
        lines.push(`  - [accepted] \`${s.city_id}\` \`${s.rule}\` \`${s.subject}\``);
      }
      for (const s of staleUnreviewed) {
        lines.push(`  - [unreviewed] \`${s.city_id}\` \`${s.rule}\` \`${s.subject}\``);
      }
      for (const s of staleKnownDefects) {
        lines.push(`  - [known_defect ${s.finding_id}] \`${s.city_id}\` \`${s.rule}\` \`${s.subject}\``);
      }
      lines.push("");
    }

    if (knownDefects.length > 0) {
      lines.push("### 🚨 Known Defects Tracked (Active Backlog)");
      lines.push("");
      lines.push("| Finding ID | Target | City | Rule | Subject | Note |");
      lines.push("|---|---|---|---|---|---|");
      for (const kd of baseline.known_defects || []) {
        lines.push(`| ${kd.finding_id} | ${kd.target_milestone} | \`${kd.city_id}\` | \`${kd.rule}\` | \`${kd.subject}\` | ${kd.note} |`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Formats full JSON audit report.
 */
export function formatJsonReport(result: AuditResult): string {
  return JSON.stringify(result, null, 2);
}
