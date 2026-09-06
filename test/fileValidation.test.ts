import { describe, expect, test } from "bun:test";
import { detectFileType } from "../src/server/services/fileValidation";

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function withAscii(header: number[], text: string, atOffset: number, totalLength = 32): Uint8Array {
  const buf = new Uint8Array(totalLength);
  buf.set(header, 0);
  for (let i = 0; i < text.length; i++) buf[atOffset + i] = text.charCodeAt(i);
  return buf;
}

describe("detectFileType — image signatures", () => {
  test("detects JPEG", () => {
    expect(detectFileType(bytes(0xff, 0xd8, 0xff, 0xe0))?.extension).toBe("jpg");
  });

  test("detects PNG", () => {
    expect(detectFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.extension).toBe("png");
  });

  test("detects GIF87a and GIF89a", () => {
    expect(detectFileType(new TextEncoder().encode("GIF87a"))?.extension).toBe("gif");
    expect(detectFileType(new TextEncoder().encode("GIF89a"))?.extension).toBe("gif");
  });

  test("detects WebP via RIFF/WEBP container", () => {
    const buf = new Uint8Array(16);
    buf.set(new TextEncoder().encode("RIFF"), 0);
    buf.set(new TextEncoder().encode("WEBP"), 8);
    expect(detectFileType(buf)?.extension).toBe("webp");
  });

  test("detects TIFF (both byte orders)", () => {
    expect(detectFileType(bytes(0x49, 0x49, 0x2a, 0x00))?.extension).toBe("tiff");
    expect(detectFileType(bytes(0x4d, 0x4d, 0x00, 0x2a))?.extension).toBe("tiff");
  });

  test("detects HEIC via ftyp brand", () => {
    const buf = withAscii([0, 0, 0, 24], "ftyp", 4);
    buf.set(new TextEncoder().encode("heic"), 8);
    expect(detectFileType(buf)?.extension).toBe("heic");
  });

  test("detects AVIF via ftyp brand", () => {
    const buf = withAscii([0, 0, 0, 24], "ftyp", 4);
    buf.set(new TextEncoder().encode("avif"), 8);
    expect(detectFileType(buf)?.extension).toBe("avif");
  });
});

describe("detectFileType — video signatures", () => {
  test("detects MP4 via ftyp brand", () => {
    const buf = withAscii([0, 0, 0, 24], "ftyp", 4);
    buf.set(new TextEncoder().encode("isom"), 8);
    expect(detectFileType(buf)?.extension).toBe("mp4");
    expect(detectFileType(buf)?.mediaKind).toBe("video");
  });

  test("detects QuickTime/MOV via ftyp brand", () => {
    const buf = withAscii([0, 0, 0, 24], "ftyp", 4);
    buf.set(new TextEncoder().encode("qt  "), 8);
    expect(detectFileType(buf)?.extension).toBe("mov");
  });

  test("detects AVI via RIFF/AVI container", () => {
    const buf = new Uint8Array(16);
    buf.set(new TextEncoder().encode("RIFF"), 0);
    buf.set(new TextEncoder().encode("AVI "), 8);
    expect(detectFileType(buf)?.extension).toBe("avi");
  });

  test("distinguishes WebM from MKV using the DocType string", () => {
    const mkvHeader = bytes(0x1a, 0x45, 0xdf, 0xa3);
    const webmBuf = new Uint8Array(64);
    webmBuf.set(mkvHeader, 0);
    webmBuf.set(new TextEncoder().encode("webm"), 20);
    expect(detectFileType(webmBuf)?.extension).toBe("webm");

    const mkvBuf = new Uint8Array(64);
    mkvBuf.set(mkvHeader, 0);
    mkvBuf.set(new TextEncoder().encode("matroska"), 20);
    expect(detectFileType(mkvBuf)?.extension).toBe("mkv");
  });
});

describe("detectFileType — rejection", () => {
  test("returns null for unrecognized content", () => {
    expect(detectFileType(new TextEncoder().encode("plain text file"))).toBeNull();
  });

  test("returns null for an empty buffer", () => {
    expect(detectFileType(new Uint8Array(0))).toBeNull();
  });

  test("does not trust a spoofed extension — only binary content matters", () => {
    // A .jpg-named file whose actual bytes are plain text must not validate.
    const fakeJpeg = new TextEncoder().encode("this is not really a jpeg");
    expect(detectFileType(fakeJpeg)).toBeNull();
  });
});
