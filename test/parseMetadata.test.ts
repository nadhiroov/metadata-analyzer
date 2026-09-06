import { describe, expect, test } from "bun:test";
import { parseExifToolOutput } from "../src/server/exiftool/parseMetadata";

const baseFileMeta = {
  name: "photo.jpg",
  size: 1024,
  mimeType: "image/jpeg",
  extension: "jpg",
  sha256: "deadbeef",
};

describe("parseExifToolOutput — GPS handling", () => {
  test("builds gps info when valid coordinates are present", () => {
    const metadata = parseExifToolOutput(
      {
        MIMEType: "image/jpeg",
        GPSLatitude: -7.983908,
        GPSLongitude: 112.621391,
        GPSLatitudeRef: "S",
        GPSLongitudeRef: "E",
        GPSAltitude: 450,
      },
      baseFileMeta,
    );

    expect(metadata.gps).not.toBeNull();
    expect(metadata.gps!.latitude.decimal).toBeCloseTo(-7.983908, 6);
    expect(metadata.gps!.longitude.decimal).toBeCloseTo(112.621391, 6);
    expect(metadata.gps!.altitude).toBe(450);
    expect(metadata.gps!.latitudeRef).toBe("S");
    expect(metadata.gps!.longitudeRef).toBe("E");
  });

  test("returns null gps when no GPS tags are present (missing GPS)", () => {
    const metadata = parseExifToolOutput({ MIMEType: "image/jpeg", Make: "Canon" }, baseFileMeta);
    expect(metadata.gps).toBeNull();
  });

  test("returns null gps for out-of-range coordinates (invalid GPS)", () => {
    const metadata = parseExifToolOutput(
      { MIMEType: "image/jpeg", GPSLatitude: 200, GPSLongitude: 112.6 },
      baseFileMeta,
    );
    expect(metadata.gps).toBeNull();
  });

  test("never fabricates GPS data when coordinates are absent", () => {
    const metadata = parseExifToolOutput({ MIMEType: "image/jpeg" }, baseFileMeta);
    expect(metadata.gps).toBeNull();
  });
});

describe("parseExifToolOutput — metadata grouping", () => {
  test("groups camera tags under `camera`", () => {
    const metadata = parseExifToolOutput(
      { MIMEType: "image/jpeg", Make: "Apple", Model: "iPhone 15 Pro", ISO: 100, FNumber: 1.78 },
      baseFileMeta,
    );
    expect(metadata.camera).toEqual(
      expect.objectContaining({ make: "Apple", model: "iPhone 15 Pro", iso: 100, fNumber: 1.78 }),
    );
  });

  test("returns null camera when no make/model present", () => {
    const metadata = parseExifToolOutput({ MIMEType: "image/jpeg" }, baseFileMeta);
    expect(metadata.camera).toBeNull();
  });

  test("groups date tags under `dates`", () => {
    const metadata = parseExifToolOutput(
      { MIMEType: "image/jpeg", DateTimeOriginal: "2024:01:15 10:30:00" },
      baseFileMeta,
    );
    expect(metadata.dates.dateTimeOriginal).toBe("2024:01:15 10:30:00");
  });

  test("keeps unrecognized tags in `technical` instead of discarding them", () => {
    const metadata = parseExifToolOutput(
      { MIMEType: "image/jpeg", SomeVendorSpecificTag: "unusual-value" },
      baseFileMeta,
    );
    expect(metadata.technical.SomeVendorSpecificTag).toBe("unusual-value");
  });

  test("preserves every original tag in `raw`", () => {
    const tags = { MIMEType: "image/jpeg", Make: "Apple", CustomTag: 42 };
    const metadata = parseExifToolOutput(tags, baseFileMeta);
    expect(metadata.raw.Make).toBe("Apple");
    expect(metadata.raw.CustomTag).toBe(42);
  });

  test("detects video media kind from MIMEType", () => {
    const metadata = parseExifToolOutput({ MIMEType: "video/mp4", Duration: "10.5 s" }, baseFileMeta);
    expect(metadata.mediaKind).toBe("video");
    expect(metadata.video?.duration).toBe("10.5 s");
    expect(metadata.image).toBeNull();
  });
});

describe("parseExifToolOutput — server path redaction", () => {
  test("strips server filesystem paths and replaces FileName with the display name", () => {
    const metadata = parseExifToolOutput(
      {
        MIMEType: "image/jpeg",
        SourceFile: "/srv/app/uploads/8f14e-random.jpg",
        Directory: "/srv/app/uploads",
        FileName: "8f14e-random.jpg",
      },
      baseFileMeta,
    );

    expect(metadata.file.name).toBe("photo.jpg");
    expect(JSON.stringify(metadata.raw)).not.toContain("/srv/app");
    expect(JSON.stringify(metadata.technical)).not.toContain("/srv/app");
    expect(metadata.raw.FileName).toBe("photo.jpg");
  });
});
