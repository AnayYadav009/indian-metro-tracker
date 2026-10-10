/**
 * Script to check all source URLs in data/reference/*.json.
 * Usage: npx tsx scripts/audit/check-reference-links.ts
 */
import fs from "node:fs";
import path from "node:path";

interface CheckResult {
  city: string;
  lineId: string;
  stageOrStretch: string;
  url: string;
  status: number | string;
  ok: boolean;
  containsValue: boolean;
  error?: string;
}

async function checkUrl(url: string, timeoutMs = 8000): Promise<{ status: number | string; ok: boolean; html?: string; error?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    const html = await res.text();
    return { status: res.status, ok: res.status >= 200 && res.status < 400, html };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: "FAIL", ok: false, error: msg };
  }
}

async function main() {
  const refDir = path.resolve(process.cwd(), "data/reference");
  const files = fs
    .readdirSync(refDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const results: CheckResult[] = [];

  for (const file of files) {
    const filePath = path.join(refDir, file);
    if (!fs.existsSync(filePath)) continue;
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const cityName = content.city_id;

    for (const line of content.lines) {
      if (line.openings) {
        for (const op of line.openings) {
          if (op.source?.url) {
            const check = await checkUrl(op.source.url);
            const containsValue = check.ok && check.html ? (
              check.html.toLowerCase().includes("metro") ||
              check.html.includes(line.official_name) ||
              check.html.includes(cityName)
            ) : false;
            results.push({
              city: cityName,
              lineId: line.line_id,
              stageOrStretch: `Opening: ${op.stage}`,
              url: op.source.url,
              status: check.status,
              ok: check.ok,
              containsValue,
              error: check.error,
            });
          }
        }
      }
      if (line.construction) {
        for (const con of line.construction) {
          if (con.source?.url) {
            const check = await checkUrl(con.source.url);
            const containsValue = check.ok && check.html ? (
              check.html.toLowerCase().includes("metro")
            ) : false;
            results.push({
              city: cityName,
              lineId: line.line_id,
              stageOrStretch: `Construction: ${con.stretch}`,
              url: con.source.url,
              status: check.status,
              ok: check.ok,
              containsValue,
              error: check.error,
            });
          }
        }
      }
    }
  }

  console.log("\n=== REFERENCE URL LINK CHECK RESULTS ===");
  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const symbol = r.ok && r.containsValue ? "✅" : (r.ok ? "⚠️" : "❌");
    console.log(`${symbol} [${r.status}] ${r.city} | ${r.lineId} | ${r.stageOrStretch} -> ${r.url} (containsValue: ${r.containsValue})${r.error ? ` (${r.error})` : ""}`);
    if (r.ok && r.containsValue) passed++;
    else failed++;
  }

  console.log(`\nTotal Checked: ${results.length} | Fully Verified (200 + Content): ${passed} | Failed/Unverified: ${failed}\n`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
