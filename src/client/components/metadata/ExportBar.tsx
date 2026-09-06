import React, { useState } from "react";
import type { AnalyzeSuccessResponse } from "../../../shared/types";
import { downloadTextFile, flattenForExport, toCsv } from "../../lib/format";

export default function ExportBar({ data }: { data: AnalyzeSuccessResponse }) {
  const [copied, setCopied] = useState<string | null>(null);

  const notify = (label: string) => {
    setCopied(label);
    setTimeout(() => setCopied((c) => (c === label ? null : c)), 1200);
  };

  const baseFilename = data.file.name.replace(/\.[^./]+$/, "") || "metadata";

  const copyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    notify("json");
  };

  const copyGps = async () => {
    if (!data.gps) return;
    await navigator.clipboard.writeText(`${data.gps.latitude}, ${data.gps.longitude}`);
    notify("gps");
  };

  const downloadJson = () => {
    downloadTextFile(`${baseFilename}.analysis.json`, JSON.stringify(data, null, 2), "application/json");
  };

  const downloadCsv = () => {
    downloadTextFile(
      `${baseFilename}.analysis.csv`,
      toCsv(flattenForExport(data as unknown as Record<string, unknown>)),
      "text/csv",
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Export</span>
      <button onClick={copyJson} type="button" className="export-btn">
        {copied === "json" ? "Copied!" : "Copy JSON"}
      </button>
      <button onClick={downloadJson} type="button" className="export-btn">
        Download JSON
      </button>
      <button onClick={downloadCsv} type="button" className="export-btn">
        Download CSV
      </button>
      {data.gps && (
        <button onClick={copyGps} type="button" className="export-btn">
          {copied === "gps" ? "Copied!" : "Copy GPS coordinates"}
        </button>
      )}
    </div>
  );
}
