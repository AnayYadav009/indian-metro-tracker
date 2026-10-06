import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { atomicWriteFiles } from "@/scripts/lib/atomic-write";

describe("atomicWriteFiles helper", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "atomic-write-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it("successfully writes all files and cleans up temporary/backup files", () => {
    const file1 = path.join(tempDir, "file1.json");
    const file2 = path.join(tempDir, "file2.json");

    fs.writeFileSync(file1, JSON.stringify({ initial: 1 }));
    fs.writeFileSync(file2, JSON.stringify({ initial: 2 }));

    atomicWriteFiles([
      { target: file1, content: JSON.stringify({ updated: 1 }) },
      { target: file2, content: JSON.stringify({ updated: 2 }) },
    ]);

    expect(JSON.parse(fs.readFileSync(file1, "utf-8"))).toEqual({ updated: 1 });
    expect(JSON.parse(fs.readFileSync(file2, "utf-8"))).toEqual({ updated: 2 });

    const remainingFiles = fs.readdirSync(tempDir);
    expect(remainingFiles).toEqual(["file1.json", "file2.json"]);
  });

  it("fails fast on invalid JSON during sanity check and touches no target files", () => {
    const file1 = path.join(tempDir, "file1.json");
    const file2 = path.join(tempDir, "file2.json");

    fs.writeFileSync(file1, JSON.stringify({ original: 1 }));
    fs.writeFileSync(file2, JSON.stringify({ original: 2 }));

    expect(() =>
      atomicWriteFiles([
        { target: file1, content: JSON.stringify({ updated: 1 }) },
        { target: file2, content: "{ invalid json ... " },
      ])
    ).toThrow(/Sanity check failed/);

    // Target files must remain untouched
    expect(JSON.parse(fs.readFileSync(file1, "utf-8"))).toEqual({ original: 1 });
    expect(JSON.parse(fs.readFileSync(file2, "utf-8"))).toEqual({ original: 2 });

    // Temp files cleaned up
    const remainingFiles = fs.readdirSync(tempDir);
    expect(remainingFiles).toEqual(["file1.json", "file2.json"]);
  });

  it("restores original files if a crash occurs on the 2nd rename", () => {
    const file1 = path.join(tempDir, "file1.json");
    const file2 = path.join(tempDir, "file2.json");
    const file3 = path.join(tempDir, "file3.json");

    fs.writeFileSync(file1, JSON.stringify({ original: 1 }));
    fs.writeFileSync(file2, JSON.stringify({ original: 2 }));
    fs.writeFileSync(file3, JSON.stringify({ original: 3 }));

    const realRenameSync = fs.renameSync;
    let renameCount = 0;

    vi.spyOn(fs, "renameSync").mockImplementation((src, dest) => {
      renameCount++;
      if (renameCount === 2) {
        throw new Error("Simulated disk error on 2nd rename");
      }
      return realRenameSync(src, dest);
    });

    expect(() =>
      atomicWriteFiles([
        { target: file1, content: JSON.stringify({ updated: 1 }) },
        { target: file2, content: JSON.stringify({ updated: 2 }) },
        { target: file3, content: JSON.stringify({ updated: 3 }) },
      ])
    ).toThrow("Simulated disk error on 2nd rename");

    // All original files must be restored
    expect(JSON.parse(fs.readFileSync(file1, "utf-8"))).toEqual({ original: 1 });
    expect(JSON.parse(fs.readFileSync(file2, "utf-8"))).toEqual({ original: 2 });
    expect(JSON.parse(fs.readFileSync(file3, "utf-8"))).toEqual({ original: 3 });

    // Backups and temps must be cleaned up
    const remainingFiles = fs.readdirSync(tempDir).filter((f) => f.includes(".bak") || f.includes(".tmp"));
    expect(remainingFiles).toHaveLength(0);
  });

  it("restores all files if a crash occurs on the last rename", () => {
    const file1 = path.join(tempDir, "file1.json");
    const file2 = path.join(tempDir, "file2.json");
    const file3 = path.join(tempDir, "file3.json");

    fs.writeFileSync(file1, JSON.stringify({ original: 1 }));
    fs.writeFileSync(file2, JSON.stringify({ original: 2 }));
    fs.writeFileSync(file3, JSON.stringify({ original: 3 }));

    const realRenameSync = fs.renameSync;
    let renameCount = 0;

    vi.spyOn(fs, "renameSync").mockImplementation((src, dest) => {
      renameCount++;
      if (renameCount === 3) {
        throw new Error("Simulated failure on last rename");
      }
      return realRenameSync(src, dest);
    });

    expect(() =>
      atomicWriteFiles([
        { target: file1, content: JSON.stringify({ updated: 1 }) },
        { target: file2, content: JSON.stringify({ updated: 2 }) },
        { target: file3, content: JSON.stringify({ updated: 3 }) },
      ])
    ).toThrow("Simulated failure on last rename");

    // All original files must be preserved
    expect(JSON.parse(fs.readFileSync(file1, "utf-8"))).toEqual({ original: 1 });
    expect(JSON.parse(fs.readFileSync(file2, "utf-8"))).toEqual({ original: 2 });
    expect(JSON.parse(fs.readFileSync(file3, "utf-8"))).toEqual({ original: 3 });

    const remainingFiles = fs.readdirSync(tempDir).filter((f) => f.includes(".bak") || f.includes(".tmp"));
    expect(remainingFiles).toHaveLength(0);
  });
});
