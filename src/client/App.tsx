import React, { useState } from "react";
import FileDropzone from "./components/FileDropzone";
import FileList from "./components/FileList";
import ResultView from "./components/ResultView";
import PrivacyNotice from "./components/PrivacyNotice";
import { useAnalyze } from "./hooks/useAnalyze";

export default function App() {
  const { entries, addFiles, removeFile, analyze } = useAnalyze();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleAnalyze = (id: string) => {
    setSelectedId(id);
    void analyze(id);
  };

  const selected = entries.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">Media Metadata Analyzer</h1>
        <p className="mt-1 text-sm text-slate-400">
          Analyze GPS, camera, and technical metadata from photos and videos.
        </p>
      </header>

      <FileDropzone onFiles={addFiles} />
      <PrivacyNotice />

      <FileList
        entries={entries}
        onAnalyze={handleAnalyze}
        onRemove={(id) => {
          removeFile(id);
          if (id === selectedId) setSelectedId(null);
        }}
        onSelect={setSelectedId}
        selectedId={selectedId}
      />

      {selected?.result && (
        <div className="mt-2">
          <ResultView result={selected.result} />
        </div>
      )}
    </div>
  );
}
