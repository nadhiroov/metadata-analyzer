import React from "react";
import type { AnalyzeResponse } from "../../shared/types";
import ErrorView from "./ErrorView";
import LocationCard from "./metadata/LocationCard";
import CameraCard from "./metadata/CameraCard";
import DateCard from "./metadata/DateCard";
import TechnicalCard from "./metadata/TechnicalCard";
import RawMetadataExplorer from "./metadata/RawMetadataExplorer";
import ExportBar from "./metadata/ExportBar";
import { FileInfoCard, ImageInfoCard, VideoInfoCard } from "./metadata/FileImageCard";
import { formatBytes } from "../lib/format";

export default function ResultView({ result }: { result: AnalyzeResponse }) {
  if (!result.success) {
    return <ErrorView error={result.error} reasons={result.reasons} />;
  }

  const { metadata } = result;
  const baseFilename = result.file.name.replace(/\.[^./]+$/, "") || "metadata";

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="truncate text-lg font-semibold text-slate-100">{result.file.name}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {metadata.file.extension.toUpperCase()}
          {metadata.image?.width && metadata.image?.height ? ` • ${metadata.image.width} × ${metadata.image.height}` : ""}
          {` • ${formatBytes(result.file.size)}`}
        </p>
      </div>

      <ExportBar data={result} />
      <LocationCard gps={metadata.gps} location={result.location} />
      <FileInfoCard file={metadata.file} />
      <ImageInfoCard image={metadata.image} />
      <VideoInfoCard video={metadata.video} />
      <CameraCard camera={metadata.camera} />
      <DateCard dates={metadata.dates} />
      <TechnicalCard technical={metadata.technical} />
      <RawMetadataExplorer raw={metadata.raw} baseFilename={baseFilename} />
    </div>
  );
}
