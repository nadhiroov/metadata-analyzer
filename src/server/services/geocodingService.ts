import type { ResolvedLocation } from "../../shared/types";

const GEOCODING_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CACHE_PRECISION = 4; // ~11m grid, enough to dedupe repeat lookups

interface CacheEntry {
  value: ResolvedLocation | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(CACHE_PRECISION)},${lon.toFixed(CACHE_PRECISION)}`;
}

function getCached(lat: number, lon: number): ResolvedLocation | null | undefined {
  const entry = cache.get(cacheKey(lat, lon));
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(cacheKey(lat, lon));
    return undefined;
  }
  return entry.value;
}

function setCached(lat: number, lon: number, value: ResolvedLocation | null): void {
  cache.set(cacheKey(lat, lon), { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function fetchWithTimeout(url: string, headers: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEOCODING_TIMEOUT_MS);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function reverseGeocodeNominatim(lat: number, lon: number): Promise<ResolvedLocation | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  const contactEmail = process.env.REVERSE_GEOCODING_CONTACT ?? "";
  const response = await fetchWithTimeout(url.toString(), {
    "User-Agent": `media-metadata-analyzer/1.0${contactEmail ? ` (${contactEmail})` : ""}`,
    Accept: "application/json",
  });

  if (!response.ok) return null;
  const data = (await response.json()) as {
    display_name?: string;
    address?: Record<string, string>;
  };

  const address = data.address ?? {};
  return {
    country: address.country ?? null,
    state: address.state ?? address.region ?? null,
    city: address.city ?? address.town ?? address.municipality ?? null,
    district: address.suburb ?? address.county ?? address.district ?? null,
    village: address.village ?? address.hamlet ?? null,
    postalCode: address.postcode ?? null,
    displayName: data.display_name ?? null,
    source: "nominatim",
  };
}

async function reverseGeocodeApiProvider(
  lat: number,
  lon: number,
  provider: string,
  apiKey: string,
): Promise<ResolvedLocation | null> {
  // Generic key-based providers (e.g. OpenCage, LocationIQ) share a similar
  // reverse-geocoding contract. Extend this switch as providers are added.
  if (provider === "opencage") {
    const url = new URL("https://api.opencagedata.com/geocode/v1/json");
    url.searchParams.set("q", `${lat},${lon}`);
    url.searchParams.set("key", apiKey);
    const response = await fetchWithTimeout(url.toString(), { Accept: "application/json" });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      results?: Array<{ formatted?: string; components?: Record<string, string> }>;
    };
    const result = data.results?.[0];
    if (!result) return null;
    const c = result.components ?? {};
    return {
      country: c.country ?? null,
      state: c.state ?? null,
      city: c.city ?? c.town ?? c.municipality ?? null,
      district: c.suburb ?? c.county ?? null,
      village: c.village ?? c.hamlet ?? null,
      postalCode: c.postcode ?? null,
      displayName: result.formatted ?? null,
      source: "opencage",
    };
  }

  return null;
}

/**
 * Resolves a human-readable location from GPS coordinates only — never sends
 * the original file to any third party. Returns null if reverse geocoding is
 * disabled, unconfigured, or the lookup fails; failures never throw so a
 * geocoding outage cannot break metadata analysis.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<ResolvedLocation | null> {
  const provider = (process.env.REVERSE_GEOCODING_PROVIDER ?? "").trim().toLowerCase();
  if (!provider || provider === "none") return null;

  const cached = getCached(lat, lon);
  if (cached !== undefined) return cached;

  try {
    let result: ResolvedLocation | null;
    if (provider === "nominatim" || provider === "openstreetmap") {
      result = await reverseGeocodeNominatim(lat, lon);
    } else {
      const apiKey = process.env.REVERSE_GEOCODING_API_KEY ?? "";
      if (!apiKey) {
        console.error(`Reverse geocoding provider "${provider}" requires REVERSE_GEOCODING_API_KEY`);
        return null;
      }
      result = await reverseGeocodeApiProvider(lat, lon, provider, apiKey);
    }
    setCached(lat, lon, result);
    return result;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return null;
  }
}
