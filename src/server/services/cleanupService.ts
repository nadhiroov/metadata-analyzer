import { randomUUID } from "node:crypto";
import { unlink, readdir, stat } from "node:fs/promises";
import path from "node:path";

const STALE_FILE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Generates a random, extension-less filename for a temp upload. Never
 * derived from the client-supplied filename, so it cannot be used for path
 * traversal or to smuggle unexpected characters into the filesystem.
 */
export function randomTempFilename(): string {
  return randomUUID();
}

export function resolveUploadPath(uploadDir: string, filename: string): string {
  const resolvedDir = path.resolve(uploadDir);
  const resolvedPath = path.resolve(resolvedDir, filename);
  if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
    throw new Error("Resolved upload path escapes the upload directory");
  }
  return resolvedPath;
}

export async function safeDelete(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`Failed to delete temp file ${filePath}:`, error);
    }
  }
}

/**
 * Periodically removes any upload that outlived its request (e.g. the
 * process crashed mid-analysis before its own cleanup ran).
 */
export function startPeriodicCleanup(uploadDir: string): Timer {
  const sweep = async () => {
    try {
      const entries = await readdir(uploadDir);
      const now = Date.now();
      for (const entry of entries) {
        if (entry === ".gitkeep") continue;
        const filePath = path.join(uploadDir, entry);
        try {
          const stats = await stat(filePath);
          if (now - stats.mtimeMs > STALE_FILE_MAX_AGE_MS) {
            await safeDelete(filePath);
          }
        } catch {
          // File may have been removed concurrently; ignore.
        }
      }
    } catch (error) {
      console.error("Periodic upload cleanup failed:", error);
    }
  };

  void sweep();
  return setInterval(sweep, SWEEP_INTERVAL_MS);
}
