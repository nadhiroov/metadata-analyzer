import { describe, expect, test } from "bun:test";
import path from "node:path";
import { readdir } from "node:fs/promises";
import { handleAnalyze } from "../src/server/routes/analyze";
import type { AnalyzeResponse } from "../src/shared/types";

const FIXTURES_DIR = path.join(import.meta.dir, "fixtures");
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");

async function readNdjsonEvents(response: Response): Promise<Record<string, unknown>[]> {
  const text = await response.text();
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function buildRequest(filePath: string, filename: string, mimeType: string): Promise<Request> {
  return Bun.file(filePath)
    .arrayBuffer()
    .then((buffer) => {
      const formData = new FormData();
      formData.append("file", new File([buffer], filename, { type: mimeType }));
      return new Request("http://localhost/api/analyze", { method: "POST", body: formData });
    });
}

describe("POST /api/analyze — image with GPS", () => {
  test("streams real pipeline stages and returns structured GPS metadata", async () => {
    const req = await buildRequest(path.join(FIXTURES_DIR, "gps-sample.jpg"), "vacation.jpg", "image/jpeg");
    const response = await handleAnalyze(req);
    expect(response.status).toBe(200);

    const events = await readNdjsonEvents(response);
    const stages = events.map((e) => e.stage);
    expect(stages).toEqual(["validating", "extracting", "analyzing-gps", "resolving-location", "complete"]);

    const result = events[events.length - 1] as unknown as AnalyzeResponse;
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");

    expect(result.file.name).toBe("vacation.jpg");
    expect(result.gps).not.toBeNull();
    expect(result.gps!.latitude).toBeCloseTo(-7.983908, 5);
    expect(result.gps!.longitude).toBeCloseTo(112.621391, 5);
    expect(result.metadata.camera?.make).toBe("Apple");
    expect(result.metadata.file.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  test("never trusts the client-supplied filename for on-disk paths (no leaked paths)", async () => {
    const req = await buildRequest(path.join(FIXTURES_DIR, "gps-sample.jpg"), "../../etc/passwd.jpg", "image/jpeg");
    const response = await handleAnalyze(req);
    const events = await readNdjsonEvents(response);
    const result = events[events.length - 1] as unknown as AnalyzeResponse;
    expect(result.success).toBe(true);
    // Display name is sanitized but preserved for the user to see; it must
    // never be used to construct a filesystem path (verified by fileValidation
    // and cleanupService unit tests). Here we just confirm no server path leaks.
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(UPLOAD_DIR);
  });
});

describe("POST /api/analyze — image without GPS", () => {
  test("reports gps and location as null without fabricating data", async () => {
    const req = await buildRequest(path.join(FIXTURES_DIR, "no-gps.jpg"), "no-gps.jpg", "image/jpeg");
    const response = await handleAnalyze(req);
    const events = await readNdjsonEvents(response);
    const stages = events.map((e) => e.stage);
    // No "resolving-location" stage should occur when there is no GPS.
    expect(stages).toEqual(["validating", "extracting", "analyzing-gps", "complete"]);

    const result = events[events.length - 1] as unknown as AnalyzeResponse;
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.gps).toBeNull();
    expect(result.location).toBeNull();
  });
});

describe("POST /api/analyze — video", () => {
  test("extracts container-level video metadata", async () => {
    const req = await buildRequest(path.join(FIXTURES_DIR, "sample.mp4"), "clip.mp4", "video/mp4");
    const response = await handleAnalyze(req);
    const events = await readNdjsonEvents(response);
    const result = events[events.length - 1] as unknown as AnalyzeResponse;
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.metadata.mediaKind).toBe("video");
    expect(result.file.mimeType).toBe("video/mp4");
  });
});

describe("POST /api/analyze — rejects unsupported/invalid input", () => {
  test("rejects a file whose signature does not match any supported format", async () => {
    const formData = new FormData();
    formData.append("file", new File([new TextEncoder().encode("not a real media file")], "fake.jpg", { type: "image/jpeg" }));
    const req = new Request("http://localhost/api/analyze", { method: "POST", body: formData });

    const response = await handleAnalyze(req);
    const events = await readNdjsonEvents(response);
    const result = events[events.length - 1] as unknown as AnalyzeResponse;
    expect(result.success).toBe(false);
  });

  test("rejects a request with no file field", async () => {
    const req = new Request("http://localhost/api/analyze", { method: "POST", body: new FormData() });
    const response = await handleAnalyze(req);
    expect(response.status).toBe(400);
    const body = (await response.json()) as AnalyzeResponse;
    expect(body.success).toBe(false);
  });
});

describe("cleanup", () => {
  test("removes the temporary upload after analysis completes", async () => {
    const req = await buildRequest(path.join(FIXTURES_DIR, "gps-sample.jpg"), "vacation.jpg", "image/jpeg");
    const response = await handleAnalyze(req);
    // The pipeline (including its cleanup `finally` block) runs as the
    // response stream is produced, so it must be fully drained before
    // asserting on filesystem side effects.
    await readNdjsonEvents(response);

    const remaining = (await readdir(UPLOAD_DIR)).filter((name) => name !== ".gitkeep");
    expect(remaining).toEqual([]);
  });
});
