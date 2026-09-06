import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalyzeResponse } from "../../shared/types";
import { analyzeFile, type ProgressStage } from "../lib/api";

export interface FileEntry {
  id: string;
  file: File;
  stage: ProgressStage;
  result: AnalyzeResponse | null;
}

let nextId = 0;

export function useAnalyze() {
  const [entries, setEntries] = useState<FileEntry[]>([]);

  // React's functional setState updaters run during the render phase, not
  // synchronously when called — so they can't be used to read current state
  // back out mid-function. This ref mirrors the latest entries for that.
  const entriesRef = useRef<FileEntry[]>(entries);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newEntries: FileEntry[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${nextId++}`,
      file,
      stage: "idle",
      result: null,
    }));
    setEntries((prev) => [...prev, ...newEntries]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const analyze = useCallback(async (id: string) => {
    const target = entriesRef.current.find((e) => e.id === id);
    if (!target) return;

    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, stage: "uploading", result: null } : e)));

    const result = await analyzeFile(target.file, (stage) => {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, stage } : e)));
    });

    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, stage: result.success ? "complete" : "error", result } : e)),
    );
  }, []);

  return { entries, addFiles, removeFile, analyze };
}
