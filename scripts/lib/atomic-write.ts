import fs from "node:fs";
import path from "node:path";

export interface FileWritePlan {
  target: string;
  content: string;
}

/**
 * Atomically writes a batch of files:
 * 1. Writes each content to a unique temporary file in the target directory.
 * 2. Sanity-checks each temp file by re-reading and verifying JSON.parse.
 * 3. Creates .bak backup copies of existing target files.
 * 4. Renames each temp file to the target file.
 * 5. On failure, restores all targets from their .bak backups and cleans up.
 * 6. On success, removes all .bak backups and temps.
 */
export function atomicWriteFiles(files: FileWritePlan[]): void {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  const planItems = files.map((f, idx) => {
    const dir = path.dirname(f.target);
    const base = path.basename(f.target);
    const tempPath = path.join(dir, `.${base}.tmp-${timestamp}-${randomSuffix}-${idx}`);
    const bakPath = path.join(dir, `.${base}.bak-${timestamp}-${randomSuffix}-${idx}`);
    return {
      target: f.target,
      content: f.content,
      tempPath,
      bakPath,
      hadExisting: fs.existsSync(f.target),
      swapped: false,
    };
  });

  const createdTemps: string[] = [];
  const createdBaks: { bak: string; target: string }[] = [];

  try {
    // 1. Write each file to a temp path
    for (const item of planItems) {
      const dir = path.dirname(item.target);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(item.tempPath, item.content, "utf-8");
      createdTemps.push(item.tempPath);
    }

    // 2. Sanity check: re-read and JSON.parse each temp file
    for (const item of planItems) {
      const readBack = fs.readFileSync(item.tempPath, "utf-8");
      try {
        JSON.parse(readBack);
      } catch (parseErr) {
        throw new Error(
          `Sanity check failed for ${item.target} (temp: ${item.tempPath}): Invalid JSON content (${(parseErr as Error).message})`
        );
      }
    }

    // 3. Backup existing target files
    for (const item of planItems) {
      if (item.hadExisting) {
        fs.copyFileSync(item.target, item.bakPath);
        createdBaks.push({ bak: item.bakPath, target: item.target });
      }
    }

    // 4. Rename each temp file into its destination target
    for (const item of planItems) {
      // If target exists on Windows, copy or rename into place
      if (fs.existsSync(item.target)) {
        fs.unlinkSync(item.target);
      }
      fs.renameSync(item.tempPath, item.target);
      item.swapped = true;
    }

    // 5. Success cleanup: remove all backups and temp files
    for (const b of createdBaks) {
      if (fs.existsSync(b.bak)) {
        try {
          fs.unlinkSync(b.bak);
        } catch {
          // ignore cleanup errors
        }
      }
    }
  } catch (err) {
    // Failure cleanup and rollback
    console.error("❌ Atomic write failed. Rolling back changes...", err);

    for (const b of createdBaks) {
      try {
        if (fs.existsSync(b.bak)) {
          if (fs.existsSync(b.target)) {
            fs.unlinkSync(b.target);
          }
          fs.copyFileSync(b.bak, b.target);
          fs.unlinkSync(b.bak);
        }
      } catch (rollbackErr) {
        console.error(`Failed to restore backup ${b.bak} to ${b.target}:`, rollbackErr);
      }
    }

    // Remove any leftover temp files
    for (const temp of createdTemps) {
      if (fs.existsSync(temp)) {
        try {
          fs.unlinkSync(temp);
        } catch {
          // ignore cleanup errors
        }
      }
    }

    throw err;
  }
}
