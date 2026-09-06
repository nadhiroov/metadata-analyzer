import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import path from "node:path";

const FIXTURE = path.join(import.meta.dir, "fixtures", "gps-sample.jpg");

function sha256Hex(bytes: Uint8Array): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(bytes);
  return hasher.digest("hex");
}

describe("SHA-256 hash calculation", () => {
  test("matches an independent implementation (node:crypto)", async () => {
    const bytes = new Uint8Array(await Bun.file(FIXTURE).arrayBuffer());
    const bunHash = sha256Hex(bytes);
    const nodeHash = createHash("sha256").update(bytes).digest("hex");
    expect(bunHash).toBe(nodeHash);
    expect(bunHash).toMatch(/^[a-f0-9]{64}$/);
  });

  test("is deterministic for identical content", async () => {
    const bytes = new Uint8Array(await Bun.file(FIXTURE).arrayBuffer());
    expect(sha256Hex(bytes)).toBe(sha256Hex(bytes));
  });

  test("differs when a single byte changes", async () => {
    const bytes = new Uint8Array(await Bun.file(FIXTURE).arrayBuffer());
    const mutated = new Uint8Array(bytes);
    mutated[0] = mutated[0]! ^ 0xff;
    expect(sha256Hex(bytes)).not.toBe(sha256Hex(mutated));
  });
});
