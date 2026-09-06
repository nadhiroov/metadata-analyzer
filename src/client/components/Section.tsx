import React, { useState } from "react";

interface Props {
  icon: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function Section({ icon, title, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <span>{icon}</span>
          {title}
        </span>
        <span className="text-slate-500">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="border-t border-slate-800 px-4 py-4">{children}</div>}
    </div>
  );
}

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="truncate font-mono text-slate-200">{value ?? "—"}</span>
    </div>
  );
}
