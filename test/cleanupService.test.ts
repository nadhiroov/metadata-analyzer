import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomTempFilename, resolveUploadPath, safeDelete } from "../src/server/services/cleanupService";

describe("randomTempFilename", () => {
  test("generates unique, unpredictable names", () => {
    const names = new Set(Array.from({ length: 50 }, () => randomTempFilename()));
    expect(names.size).toBe(50);
  });

  test("never derives from client input (takes no arguments)", () => {
    expect(randomTempFilename.length).toBe(0);
  });
});

describe("resolveUploadPath — path traversal protection", () => {
  test("resolves a plain filename inside the upload directory", async () => {
    const uploadDir = await mkdtemp(path.join(tmpdir(), "uploads-"));
    const resolved = resolveUploadPath(uploadDir, "abc123.jpg");
    expect(resolved).toBe(path.join(path.resolve(uploadDir), "abc123.jpg"));
  });

  test("rejects a filename that escapes the upload directory via ../", async () => {
    const uploadDir = await mkdtemp(path.join(tmpdir(), "uploads-"));
    expect(() => resolveUploadPath(uploadDir, "../../etc/passwd")).toThrow();
  });

  test("rejects an absolute path override attempt", async () => {
    const uploadDir = await mkdtemp(path.join(tmpdir(), "uploads-"));
    expect(() => resolveUploadPath(uploadDir, "/etc/passwd")).toThrow();
  });
});

describe("safeDelete — automatic cleanup", () => {
  test("deletes an existing file", async () => {
    const uploadDir = await mkdtemp(path.join(tmpdir(), "uploads-"));
    const filePath = path.join(uploadDir, "temp.jpg");
    await writeFile(filePath, "content");

    await safeDelete(filePath);

    await expect(readFile(filePath)).rejects.toThrow();
  });

  test("does not throw when the file is already gone", async () => {
    const uploadDir = await mkdtemp(path.join(tmpdir(), "uploads-"));
    const filePath = path.join(uploadDir, "already-deleted.jpg");
    await expect(safeDelete(filePath)).resolves.toBeUndefined();
  });
});
