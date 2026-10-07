import type { Finding, BaselineFile, AuditResult, Severity } from "./audit-engine";

/**
 * Separates findings into baselined and unbaselined sets based on baseline definitions.
 */
export function applyBaseline(
  findings: Finding[],
  baseline: BaselineFile
): { unbaselined: Finding[]; baselined: Finding[] } {
  const baselineSet = new Set(
    baseline.accepted_warnings.map(
      (e) => `${e.city_id}|${e.rule}|${e.subject}`
    )
  );

  const unbaselined: Finding[] = [];
  const baselined: Finding[] = [];

  for (const f of findings) {
    if (
      f.severity === "warn" &&
      baselineSet.has(`${f.city_id}|${f.rule}|${f.subject}`)
    ) {
      baselined.push(f);
    } else {
      unbaselined.push(f);
    }
  }

  return { unbaselined, baselined };
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
    const { baselined } = applyBaseline(result.findings, baseline);
    if (baselined.length > 0) {
      lines.push(`- **Baselined warnings:** ${baselined.length}`);
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
