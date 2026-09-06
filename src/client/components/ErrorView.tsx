import React from "react";

export default function ErrorView({ error, reasons }: { error: string; reasons: string[] }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
      <p className="font-medium text-red-300">{error}</p>
      {reasons.length > 0 && (
        <>
          <p className="mt-3 text-sm text-slate-400">Possible reasons:</p>
          <ul className="mt-1 list-inside list-disc text-sm text-slate-400">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
