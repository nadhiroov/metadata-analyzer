import path from "node:path";
import { mkdir } from "node:fs/promises";
import type { AnalyzeResponse } from "../../shared/types";
import { detectFileType } from "../services/fileValidation";
import { exifToolService, ExifToolError } from "../services/exiftoolService";
import { reverseGeocode } from "../services/geocodingService";
import { randomTempFilename, resolveUploadPath, safeDelete } from "../services/cleanupService";

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
const MAX_FILE_SIZE_BYTES = parseMaxFileSize(process.env.MAX_FILE_SIZE ?? "100MB");
const ANALYZE_TIMEOUT_MS = 30_000;

/** Stage names mirror the pipeline's real steps — never a synthetic percentage. */
export type AnalyzeStage =
  | "validating"
  | "extracting"
  | "analyzing-gps"
  | "resolving-location"
  | "complete"
  | "error";

export type AnalyzeStreamEvent =
  | { stage: "validating" | "extracting" | "analyzing-gps" | "resolving-location" }
  | ({ stage: "complete" } & AnalyzeResponse & { success: true })
  | ({ stage: "error" } & AnalyzeResponse & { success: false });

function parseMaxFileSize(input: string): number {
  const match = /^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)?$/i.exec(input.trim());
  if (!match) return 100 * 1024 * 1024;
  const value = parseFloat(match[1]!);
  const unit = (match[2] ?? "MB").toUpperCase();
  const multipliers: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };
  return Math.round(value * (multipliers[unit] ?? multipliers.MB!));
}

function jsonErrorResponse(message: string, reasons: string[], status: number): Response {
  const body: AnalyzeResponse = { success: false, error: message, reasons };
  return Response.json(body, { status });
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(bytes);
  return hasher.digest("hex");
}

/** Strips path separators and control characters; display-only, never used on disk. */
function sanitizeDisplayName(name: string): string {
  return name.replace(/[/\\]/g, "").replace(/[\x00-\x1f]/g, "").slice(0, 255) || "unknown";
}

const encoder = new TextEncoder();

/**
 * Streams newline-delimited JSON stage events as the pipeline actually
 * progresses (validating -> extracting -> analyzing GPS -> resolving
 * location -> complete/error). Each event reflects real work that just
 * happened on the server — there is no simulated percentage.
 */
function buildAnalyzeStream(file: File): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let tempFilePath: string | null = null;

      const emit = (event: AnalyzeStreamEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      const watchdog = setTimeout(() => {
        emit({
          stage: "error",
          success: false,
          error: "Unable to analyze this file.",
          reasons: ["Request timed out"],
        });
        finish();
      }, ANALYZE_TIMEOUT_MS);

      try {
        emit({ stage: "validating" });

        const headerBytes = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
        const detected = detectFileType(headerBytes);
        if (!detected) {
          emit({
            stage: "error",
            success: false,
            error: "Unable to analyze this file.",
            reasons: ["Unsupported file format", "Corrupted file"],
          });
          return;
        }

        const fullBytes = new Uint8Array(await file.arrayBuffer());
        const sha256 = await sha256Hex(fullBytes);

        const tempFilename = `${randomTempFilename()}.${detected.extension}`;
        tempFilePath = resolveUploadPath(UPLOAD_DIR, tempFilename);
        await Bun.write(tempFilePath, fullBytes);

        emit({ stage: "extracting" });
        let metadata;
        try {
          metadata = await exifToolService.extractMetadata(tempFilePath, {
            name: sanitizeDisplayName(file.name),
            size: file.size,
            mimeType: detected.mimeType,
            extension: detected.extension,
            sha256,
          });
        } catch (error) {
          console.error("ExifTool extraction failed:", error);
          const reason =
            error instanceof ExifToolError
              ? "Metadata could not be read"
              : "Unexpected error while reading metadata";
          emit({ stage: "error", success: false, error: "Unable to analyze this file.", reasons: [reason] });
          return;
        }

        emit({ stage: "analyzing-gps" });

        let location = null;
        if (metadata.gps) {
          emit({ stage: "resolving-location" });
          location = await reverseGeocode(metadata.gps.latitude.decimal, metadata.gps.longitude.decimal);
        }

        emit({
          stage: "complete",
          success: true,
          file: {
            name: sanitizeDisplayName(file.name),
            size: file.size,
            mimeType: detected.mimeType,
          },
          metadata,
          gps: metadata.gps
            ? {
                latitude: metadata.gps.latitude.decimal,
                longitude: metadata.gps.longitude.decimal,
                altitude: metadata.gps.altitude,
              }
            : null,
          location,
        });
      } catch (error) {
        console.error("Unexpected error while analyzing file:", error);
        emit({
          stage: "error",
          success: false,
          error: "Unable to analyze this file.",
          reasons: ["Unexpected server error"],
        });
      } finally {
        clearTimeout(watchdog);
        // Delete before closing the stream: a reader may treat stream
        // completion as a signal that cleanup has finished.
        if (tempFilePath) await safeDelete(tempFilePath);
        finish();
      }
    },
  });
}

export async function handleAnalyze(req: Request): Promise<Response> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonErrorResponse("Unable to analyze this file.", ["Malformed upload request"], 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonErrorResponse("Unable to analyze this file.", ["No file was provided"], 400);
  }

  if (file.size === 0) {
    return jsonErrorResponse("Unable to analyze this file.", ["File is empty"], 400);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return jsonErrorResponse("Unable to analyze this file.", ["File exceeds maximum size"], 413);
  }

  return new Response(buildAnalyzeStream(file), {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
