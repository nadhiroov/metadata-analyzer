import React, { useCallback, useRef, useState } from "react";

interface Props {
  onFiles: (files: FileList | File[]) => void;
}

export default function FileDropzone({ onFiles }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files);
    },
    [onFiles],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
        isDragging
          ? "border-accent bg-accent/10"
          : "border-slate-700 bg-slate-900/40 hover:border-slate-600"
      }`}
    >
      <div className="rounded-full bg-slate-800 p-3 text-2xl">📁</div>
      <div>
        <p className="text-sm font-medium text-slate-200">Drag & drop files here</p>
        <p className="mt-1 text-xs text-slate-500">
          Images (JPEG, PNG, HEIC, TIFF, WebP, GIF, AVIF) and videos (MP4, MOV, M4V, AVI, MKV, WebM)
        </p>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-accent-dim"
      >
        Choose Files
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
