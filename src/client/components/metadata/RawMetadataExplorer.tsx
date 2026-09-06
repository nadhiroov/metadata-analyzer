import React, { useMemo, useState } from "react";
import Section from "../Section";
import { downloadTextFile, flattenForExport, formatValue, toCsv } from "../../lib/format";

interface Props {
  raw: Record<string, unknown>;
  baseFilename: string;
}

export default function RawMetadataExplorer({ raw, baseFilename }: Props) {
  const [query, setQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const rows = useMemo(() => flattenForExport(raw), [raw]);

  const filteredRows = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(([key, value]) => key.toLowerCase().includes(q) || value.toLowerCase().includes(q));
  }, [rows, query]);

  const copyValue = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1200);
  };

  const copyAllJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(raw, null, 2));
  };

  const downloadJson = () => {
    downloadTextFile(`${baseFilename}.metadata.json`, JSON.stringify(raw, null, 2), "application/json");
  };

  const downloadCsv = () => {
    downloadTextFile(`${baseFilename}.metadata.csv`, toCsv(rows), "text/csv");
  };

  return (
    <Section icon="🔍" title={`Raw Metadata (${rows.length} tags)`} defaultOpen={false}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search key or value..."
          className="min-w-[12rem] flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={copyAllJson}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          Copy JSON
        </button>
        <button
          type="button"
          onClick={downloadJson}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          Download JSON
        </button>
        <button
          type="button"
          onClick={downloadCsv}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          Download CSV
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-800">
        <table className="w-full text-sm">
          <tbody>
            {filteredRows.map(([key, value]) => (
              <tr key={key} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30">
                <td className="whitespace-nowrap px-3 py-1.5 align-top font-mono text-xs text-slate-500">{key}</td>
                <td className="px-3 py-1.5 align-top font-mono text-xs text-slate-200">{formatValue(value)}</td>
                <td className="px-3 py-1.5 align-top text-right">
                  <button
                    type="button"
                    onClick={() => copyValue(key, formatValue(value))}
                    className="text-xs text-slate-500 hover:text-accent"
                  >
                    {copiedKey === key ? "Copied" : "Copy"}
                  </button>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-sm text-slate-500">
                  No metadata tags match "{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
