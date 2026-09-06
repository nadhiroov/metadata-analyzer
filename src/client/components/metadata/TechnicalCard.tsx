import React from "react";
import type { TechnicalInfo } from "../../../shared/types";
import Section, { Field } from "../Section";
import { formatKey, formatValue } from "../../lib/format";

export default function TechnicalCard({ technical }: { technical: TechnicalInfo }) {
  const entries = Object.entries(technical);

  return (
    <Section icon="⚙" title={`Technical Metadata (${entries.length})`} defaultOpen={false}>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">No additional technical metadata found.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto pr-2">
          {entries.map(([key, value]) => (
            <Field key={key} label={formatKey(key)} value={formatValue(value)} />
          ))}
        </div>
      )}
    </Section>
  );
}
