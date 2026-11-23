import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

interface AllowlistEntry {
  file: string;
  testid: string;
  reason: string;
}

describe("E2E Layout Drift Guard (M23.0 Part 4)", () => {
  const allowlistPath = path.resolve(__dirname, "../e2e/layout-drift-allowlist.json");
  const allowlist: AllowlistEntry[] = JSON.parse(
    fs.readFileSync(allowlistPath, "utf-8")
  );

  const e2eDir = path.resolve(__dirname, "../e2e");
  const specFiles = fs
    .readdirSync(e2eDir)
    .filter((file) => file.endsWith(".spec.ts"))
    .sort();

  it("ensures no e2e specs contain raw layout-owned testids outside the allowlist", () => {
    const violations: { file: string; line: number; match: string }[] = [];

    // Layout-owned testids regex
    const testidRegex = /(?:data-testid|getByTestId)[^"']*["']([^"']+)["']/g;

    for (const specFile of specFiles) {
      const filePath = path.join(e2eDir, specFile);
      const relativePath = path.join("e2e", specFile).replace(/\\/g, "/");
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        let match: RegExpExecArray | null;

        // Check 1: getByTestId("...")
        const getByTestIdRegex = /getByTestId\(\s*["']([^"']+)["']\s*\)/g;
        while ((match = getByTestIdRegex.exec(line)) !== null) {
          const rawMatch = match[1];
          const isAllowed = allowlist.some(
            (entry) => entry.file === relativePath && entry.testid === rawMatch
          );
          if (!isAllowed) {
            violations.push({
              file: relativePath,
              line: index + 1,
              match: rawMatch,
            });
          }
        }

        // Check 2: [data-testid*="..."]
        const attrRegex = /\[data-testid[=^~|*]?=["']([^"']+)["']\]/g;
        while ((match = attrRegex.exec(line)) !== null) {
          const rawMatch = match[1];
          const isAllowed = allowlist.some(
            (entry) => entry.file === relativePath && entry.testid === rawMatch
          );
          if (!isAllowed) {
            violations.push({
              file: relativePath,
              line: index + 1,
              match: rawMatch,
            });
          }
        }

        // Check 3: getAttribute("data-testid")
        const getAttrRegex = /getAttribute\(\s*["']data-testid["']\s*\)/g;
        while ((match = getAttrRegex.exec(line)) !== null) {
          const rawMatch = "getAttribute(data-testid)";
          const isAllowed = allowlist.some(
            (entry) => entry.file === relativePath && entry.testid === rawMatch
          );
          if (!isAllowed) {
            violations.push({
              file: relativePath,
              line: index + 1,
              match: rawMatch,
            });
          }
        }
      });
    }

    expect(
      violations,
      `Found ${violations.length} un-allowlisted raw testid references in e2e specs:\n${JSON.stringify(
        violations,
        null,
        2
      )}`
    ).toEqual([]);
  });

  it("verifies every allowlist entry has a valid documented reason and file", () => {
    expect(allowlist.length).toBeGreaterThan(0);
    for (const entry of allowlist) {
      expect(entry.file).toBeDefined();
      expect(entry.testid).toBeDefined();
      expect(entry.reason).toBeDefined();
      expect(entry.reason.length).toBeGreaterThan(10);
      expect(fs.existsSync(path.resolve(__dirname, "..", entry.file))).toBe(true);
    }
  });
});
