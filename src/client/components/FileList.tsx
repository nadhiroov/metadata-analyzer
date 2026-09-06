import React from "react";
import type { FileEntry } from "../hooks/useAnalyze";
import { STAGE_LABELS } from "../lib/api";
import { formatBytes } from "../lib/format";

interface Props {
  entries: FileEntry[];
  onAnalyze: (id: string) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

const BUSY_STAGES = new Set(["uploading", "validating", "extracting", "analyzing-gps", "resolving-location"]);

export default function FileList({ entries, onAnalyze, onRemove, onSelect, selectedId }: Props) {
  if (entries.length === 0) return null;

  return (
    <div className="mt-6 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/40">
      {entries.map((entry) => {
        const isBusy = BUSY_STAGES.has(entry.stage);
        const isSelected = entry.id === selectedId;
        return (
          <div
            key={entry.id}
            className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors ${
              isSelected ? "bg-accent/5" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(entry.id)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              disabled={entry.stage !== "complete"}
            >
              <span className="text-lg">{entry.file.type.startsWith("video") ? "🎬" : "🖼️"}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-200">{entry.file.name}</span>
                <span className="block text-xs text-slate-500">
                  {formatBytes(entry.file.size)} · {entry.file.type || "unknown type"}
                </span>
              </span>
            </button>

            <div className="flex items-center gap-3">
              {entry.stage !== "idle" && (
                <span
                  className={`text-xs font-medium ${
                    entry.stage === "error"
                      ? "text-red-400"
                      : entry.stage === "complete"
                        ? "text-emerald-400"
                        : "text-accent"
                  }`}
                >
                  {STAGE_LABELS[entry.stage]}
                </span>
              )}
              <button
                type="button"
                onClick={() => onAnalyze(entry.id)}
                disabled={isBusy}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
              >
                {entry.stage === "complete" ? "Re-analyze" : "Analyze"}
              </button>
              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                disabled={isBusy}
                aria-label={`Remove ${entry.file.name}`}
                className="rounded-md px-2 py-1.5 text-xs text-slate-500 transition hover:bg-slate-800 hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
