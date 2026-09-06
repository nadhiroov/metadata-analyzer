import type { GpsCoordinate } from "../../shared/types";

/**
 * Converts a signed decimal degree value (already adjusted for N/S/E/W) into a
 * DMS string, e.g. -7.983908 => 7° 59' 2.07" S
 */
export function decimalToDms(
  decimal: number,
  kind: "lat" | "lon",
): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;

  const ref =
    kind === "lat" ? (decimal >= 0 ? "N" : "S") : decimal >= 0 ? "E" : "W";

  return `${degrees}° ${minutes}' ${seconds.toFixed(2)}" ${ref}`;
}

/**
 * ExifTool with -n returns signed decimal degrees directly (already applying
 * the N/S/E/W reference), but we accept an explicit ref to be defensive
 * against tags that report unsigned magnitudes with a separate Ref tag.
 */
export function normalizeCoordinate(
  rawValue: number,
  ref: string | null | undefined,
  kind: "lat" | "lon",
): GpsCoordinate {
  let decimal = rawValue;

  if (ref) {
    const normalizedRef = ref.trim().toUpperCase().charAt(0);
    const isNegativeRef =
      (kind === "lat" && normalizedRef === "S") ||
      (kind === "lon" && normalizedRef === "W");
    const isPositiveRef =
      (kind === "lat" && normalizedRef === "N") ||
      (kind === "lon" && normalizedRef === "E");

    if (isNegativeRef) {
      decimal = -Math.abs(rawValue);
    } else if (isPositiveRef) {
      decimal = Math.abs(rawValue);
    }
  }

  return {
    decimal,
    dms: decimalToDms(decimal, kind),
  };
}

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}
