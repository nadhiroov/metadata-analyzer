import React from "react";
import type { DatesInfo } from "../../../shared/types";
import Section, { Field } from "../Section";

export default function DateCard({ dates }: { dates: DatesInfo }) {
  return (
    <Section icon="🕒" title="Date & Time">
      <Field label="Date Time Original" value={dates.dateTimeOriginal} />
      <Field label="Create Date" value={dates.createDate} />
      <Field label="Modify Date" value={dates.modifyDate} />
      <Field label="File Modify Date" value={dates.fileModifyDate} />
      <Field label="File Access Date" value={dates.fileAccessDate} />
      <Field label="GPS Date Stamp" value={dates.gpsDateStamp} />
      <Field label="GPS Time Stamp" value={dates.gpsTimeStamp} />
      <p className="mt-3 text-xs text-slate-600">
        Timestamps are shown exactly as reported by the file's metadata. No timezone is assumed when
        the source does not provide one.
      </p>
    </Section>
  );
}
