import React from "react";
import type { AnalyzedMetadata } from "../../../shared/types";
import Section, { Field } from "../Section";
import { formatBytes } from "../../lib/format";

export function FileInfoCard({ file }: { file: AnalyzedMetadata["file"] }) {
  return (
    <Section icon="🗂️" title="File Information">
      <Field label="File name" value={file.name} />
      <Field label="File size" value={formatBytes(file.size)} />
      <Field label="MIME type" value={file.mimeType} />
      <Field label="Extension" value={file.extension} />
      <Field label="File modify time" value={file.fileModifyDate} />
      <Field label="SHA-256" value={<span className="text-xs">{file.sha256}</span>} />
    </Section>
  );
}

export function ImageInfoCard({ image }: { image: AnalyzedMetadata["image"] }) {
  if (!image) return null;
  return (
    <Section icon="🖼️" title="Image Information">
      <Field label="Width" value={image.width ? `${image.width}px` : null} />
      <Field label="Height" value={image.height ? `${image.height}px` : null} />
      <Field label="Image size" value={image.imageSize} />
      <Field label="Orientation" value={image.orientation} />
      <Field label="Color space" value={image.colorSpace} />
      <Field label="ICC profile" value={image.iccProfile} />
      <Field label="Compression" value={image.compression} />
      <Field label="Bit depth" value={image.bitDepth} />
      <Field label="DPI (X)" value={image.dpiX} />
      <Field label="DPI (Y)" value={image.dpiY} />
    </Section>
  );
}

export function VideoInfoCard({ video }: { video: AnalyzedMetadata["video"] }) {
  if (!video) return null;
  return (
    <Section icon="🎬" title="Video Metadata">
      <Field label="Duration" value={video.duration} />
      <Field label="Width" value={video.width ? `${video.width}px` : null} />
      <Field label="Height" value={video.height ? `${video.height}px` : null} />
      <Field label="Video codec" value={video.videoCodec} />
      <Field label="Audio codec" value={video.audioCodec} />
      <Field label="Frame rate" value={video.frameRate ? `${video.frameRate} fps` : null} />
      <Field label="Bit rate" value={video.bitRate} />
      <Field label="Encoder" value={video.encoder} />
      <Field label="Container format" value={video.containerFormat} />
      <Field label="Rotation" value={video.rotation !== null ? `${video.rotation}°` : null} />
    </Section>
  );
}
