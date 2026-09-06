import React from "react";
import type { AnalyzedMetadata, ResolvedLocation } from "../../../shared/types";
import Section, { Field } from "../Section";
import MapView from "./MapView";
import { googleMapsUrl, openStreetMapUrl } from "../../lib/format";

interface Props {
  gps: AnalyzedMetadata["gps"];
  location: ResolvedLocation | null;
}

export default function LocationCard({ gps, location }: Props) {
  if (!gps) {
    return (
      <Section icon="📍" title="Location">
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="font-medium text-slate-300">📍 No GPS information found</p>
          <p className="max-w-sm text-sm text-slate-500">
            This file does not contain usable GPS coordinates.
          </p>
        </div>
      </Section>
    );
  }

  const { latitude, longitude } = gps;

  return (
    <Section icon="📍" title="Location">
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
        <span>⚠</span>
        <span>This media contains GPS coordinates that may reveal where it was captured.</span>
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">GPS metadata</p>
      <Field label="Latitude" value={`${latitude.decimal.toFixed(6)} (${latitude.dms})`} />
      <Field label="Longitude" value={`${longitude.decimal.toFixed(6)} (${longitude.dms})`} />
      <Field label="Altitude" value={gps.altitude !== null ? `${gps.altitude} m` : null} />
      <Field label="Altitude Reference" value={gps.altitudeRef} />
      <Field label="GPS Date" value={gps.gpsDate} />
      <Field label="GPS Time" value={gps.gpsTime} />
      <Field label="GPS Speed" value={gps.gpsSpeed !== null ? `${gps.gpsSpeed} ${gps.gpsSpeedRef ?? ""}` : null} />
      <Field label="GPS Direction" value={gps.gpsDirection !== null ? `${gps.gpsDirection}° ${gps.gpsDirectionRef ?? ""}` : null} />
      <Field label="GPS Img Direction" value={gps.gpsImgDirection} />
      <Field label="GPS Track" value={gps.gpsTrack !== null ? `${gps.gpsTrack} ${gps.gpsTrackRef ?? ""}` : null} />
      <Field label="GPS Position" value={gps.gpsPosition} />

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-800">
        <MapView latitude={latitude.decimal} longitude={longitude.decimal} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={googleMapsUrl(latitude.decimal, longitude.decimal)}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
        >
          Open in Google Maps
        </a>
        <a
          href={openStreetMapUrl(latitude.decimal, longitude.decimal)}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
        >
          Open in OpenStreetMap
        </a>
      </div>

      {location && (
        <div className="mt-5 border-t border-slate-800 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Location resolved from GPS coordinates
          </p>
          <Field label="Country" value={location.country} />
          <Field label="State/Province" value={location.state} />
          <Field label="City" value={location.city} />
          <Field label="District" value={location.district} />
          <Field label="Village" value={location.village} />
          <Field label="Postal Code" value={location.postalCode} />
          <Field label="Display Name" value={location.displayName} />
        </div>
      )}
    </Section>
  );
}
