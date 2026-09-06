import React from "react";
import type { CameraInfo } from "../../../shared/types";
import Section, { Field } from "../Section";

export default function CameraCard({ camera }: { camera: CameraInfo | null }) {
  if (!camera) {
    return (
      <Section icon="📷" title="Camera">
        <p className="text-sm text-slate-500">No camera metadata available.</p>
      </Section>
    );
  }

  return (
    <Section icon="📷" title="Camera">
      <Field label="Make" value={camera.make} />
      <Field label="Model" value={camera.model} />
      <Field label="Lens Make" value={camera.lensMake} />
      <Field label="Lens Model" value={camera.lensModel} />
      <Field label="Lens Serial Number" value={camera.lensSerialNumber} />
      <Field label="Camera Serial Number" value={camera.serialNumber} />
      <Field label="Software" value={camera.software} />
      <Field label="Firmware" value={camera.firmware} />
      <Field label="Exposure Time" value={camera.exposureTime} />
      <Field label="F Number" value={camera.fNumber !== null ? `f/${camera.fNumber}` : null} />
      <Field label="ISO" value={camera.iso} />
      <Field label="Focal Length" value={camera.focalLength} />
      <Field label="Focal Length (35mm)" value={camera.focalLengthIn35mmFormat} />
      <Field label="Flash" value={camera.flash} />
      <Field label="White Balance" value={camera.whiteBalance} />
      <Field label="Exposure Program" value={camera.exposureProgram} />
      <Field label="Metering Mode" value={camera.meteringMode} />
    </Section>
  );
}
