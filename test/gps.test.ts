import { describe, expect, test } from "bun:test";
import { decimalToDms, isValidLatitude, isValidLongitude, normalizeCoordinate } from "../src/server/exiftool/gps";

describe("decimalToDms", () => {
  test("converts a negative latitude to DMS with S reference", () => {
    expect(decimalToDms(-7.983908, "lat")).toBe(`7° 59' 2.07" S`);
  });

  test("converts a positive longitude to DMS with E reference", () => {
    expect(decimalToDms(112.621391, "lon")).toBe(`112° 37' 17.01" E`);
  });

  test("converts a positive latitude to DMS with N reference", () => {
    expect(decimalToDms(48.8584, "lat")).toBe(`48° 51' 30.24" N`);
  });

  test("converts a negative longitude to DMS with W reference", () => {
    expect(decimalToDms(-122.4194, "lon")).toBe(`122° 25' 9.84" W`);
  });

  test("handles zero", () => {
    expect(decimalToDms(0, "lat")).toBe(`0° 0' 0.00" N`);
  });
});

describe("normalizeCoordinate", () => {
  test("applies S reference by negating a positive magnitude", () => {
    const result = normalizeCoordinate(7.983908, "S", "lat");
    expect(result.decimal).toBeCloseTo(-7.983908, 6);
    expect(result.dms.endsWith("S")).toBe(true);
  });

  test("applies N reference to keep a positive magnitude positive", () => {
    const result = normalizeCoordinate(7.983908, "N", "lat");
    expect(result.decimal).toBeCloseTo(7.983908, 6);
  });

  test("applies W reference by negating a positive longitude", () => {
    const result = normalizeCoordinate(122.4194, "W", "lon");
    expect(result.decimal).toBeCloseTo(-122.4194, 6);
  });

  test("applies E reference to keep a positive longitude positive", () => {
    const result = normalizeCoordinate(112.621391, "E", "lon");
    expect(result.decimal).toBeCloseTo(112.621391, 6);
  });

  test("is a no-op without a ref (already-signed value from `exiftool -n`)", () => {
    const result = normalizeCoordinate(-7.983908, null, "lat");
    expect(result.decimal).toBeCloseTo(-7.983908, 6);
  });

  test("is case-insensitive and tolerant of surrounding whitespace", () => {
    const result = normalizeCoordinate(7.983908, " s ", "lat");
    expect(result.decimal).toBeCloseTo(-7.983908, 6);
  });
});

describe("coordinate validation", () => {
  test("accepts boundary latitudes", () => {
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
  });

  test("rejects out-of-range latitude", () => {
    expect(isValidLatitude(90.0001)).toBe(false);
    expect(isValidLatitude(-91)).toBe(false);
  });

  test("accepts boundary longitudes", () => {
    expect(isValidLongitude(180)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
  });

  test("rejects out-of-range longitude", () => {
    expect(isValidLongitude(180.0001)).toBe(false);
    expect(isValidLongitude(-200)).toBe(false);
  });

  test("rejects non-finite values", () => {
    expect(isValidLatitude(NaN)).toBe(false);
    expect(isValidLongitude(Infinity)).toBe(false);
  });
});
