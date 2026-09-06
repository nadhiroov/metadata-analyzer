import { parseExifToolOutput } from "../exiftool/parseMetadata";
import type { AnalyzedMetadata } from "../../shared/types";

const EXIFTOOL_TIMEOUT_MS = 15_000;

export class ExifToolError extends Error {}

/**
 * Runs ExifTool against a local file path using an argument array (never a
 * shell string), so no user-controlled value can be interpreted as a shell
 * command. `filePath` must already be a server-generated path — never a raw
 * client-supplied string.
 */
async function runExifTool(filePath: string): Promise<Record<string, unknown>> {
  // `-a` keeps duplicate/grouped tags instead of silently dropping them, and
  // `-n` returns numeric values (signed decimal GPS degrees, raw ISO/FNumber,
  // etc). Note this is intentionally *not* `-File:All`, which would restrict
  // output to just the filesystem tag group and silently drop EXIF/GPS/
  // maker-note data — despite the confusing name, it does not mean "all
  // metadata". We also skip `-api RequestAll=3`: it additionally surfaces
  // host filesystem/OS pseudo-tags (inode numbers, uid/gid, macOS Spotlight
  // attributes) that describe our server's temp file, not the media itself.
  const proc = Bun.spawn(["exiftool", "-json", "-n", "-a", filePath], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const timeout = setTimeout(() => {
    proc.kill();
  }, EXIFTOOL_TIMEOUT_MS);

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  clearTimeout(timeout);

  if (exitCode !== 0) {
    throw new ExifToolError(`exiftool exited with code ${exitCode}: ${stderr.slice(0, 500)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new ExifToolError("exiftool produced invalid JSON output");
  }

  if (!Array.isArray(parsed) || parsed.length === 0 || typeof parsed[0] !== "object") {
    throw new ExifToolError("exiftool produced an unexpected output shape");
  }

  return parsed[0] as Record<string, unknown>;
}

export class ExifToolService {
  async extractMetadata(
    filePath: string,
    fileMeta: { name: string; size: number; mimeType: string; extension: string; sha256: string },
  ): Promise<AnalyzedMetadata> {
    const tags = await runExifTool(filePath);
    return parseExifToolOutput(tags, fileMeta);
  }
}

export const exifToolService = new ExifToolService();
