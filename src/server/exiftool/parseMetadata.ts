import type {
  AnalyzedMetadata,
  CameraInfo,
  DatesInfo,
  GpsInfo,
  ImageInfo,
  MediaKind,
  TechnicalInfo,
  VideoInfo,
} from "../../shared/types";
import { isValidLatitude, isValidLongitude, normalizeCoordinate } from "./gps";

type RawTags = Record<string, unknown>;

function str(tags: RawTags, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = tags[key];
    if (value === undefined || value === null || value === "") continue;
    return String(value);
  }
  return null;
}

function num(tags: RawTags, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = tags[key];
    if (value === undefined || value === null || value === "") continue;
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Tags already surfaced in dedicated categories; excluded from `technical`. */
const CATEGORIZED_TAG_NAMES = new Set([
  "SourceFile",
  "FileName",
  "FileSize",
  "FileModifyDate",
  "FileAccessDate",
  "FileInodeChangeDate",
  "FileType",
  "FileTypeExtension",
  "MIMEType",
  "ImageWidth",
  "ImageHeight",
  "ExifImageWidth",
  "ExifImageHeight",
  "ImageSize",
  "Orientation",
  "ColorSpace",
  "ICCProfileName",
  "ProfileDescription",
  "Compression",
  "BitDepth",
  "BitsPerSample",
  "XResolution",
  "YResolution",
  "ResolutionUnit",
  "Make",
  "Model",
  "LensMake",
  "LensModel",
  "LensSerialNumber",
  "SerialNumber",
  "InternalSerialNumber",
  "Software",
  "FirmwareVersion",
  "ExposureTime",
  "FNumber",
  "ISO",
  "FocalLength",
  "FocalLengthIn35mmFormat",
  "Flash",
  "WhiteBalance",
  "ExposureProgram",
  "MeteringMode",
  "DateTimeOriginal",
  "CreateDate",
  "ModifyDate",
  "GPSDateStamp",
  "GPSTimeStamp",
  "GPSLatitude",
  "GPSLongitude",
  "GPSLatitudeRef",
  "GPSLongitudeRef",
  "GPSAltitude",
  "GPSAltitudeRef",
  "GPSDateTime",
  "GPSSpeed",
  "GPSSpeedRef",
  "GPSImgDirection",
  "GPSImgDirectionRef",
  "GPSTrack",
  "GPSTrackRef",
  "GPSPosition",
  "Duration",
  "VideoFrameRate",
  "AvgBitrate",
  "CompressorID",
  "CompressorName",
  "AudioFormat",
  "Encoder",
  "MajorBrand",
  "Rotation",
  "TrackCreateDate",
  "TrackModifyDate",
]);

function detectMediaKind(tags: RawTags): MediaKind {
  const mimeType = String(tags.MIMEType ?? "");
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  const fileType = String(tags.FileType ?? "").toLowerCase();
  const videoTypes = ["mp4", "mov", "m4v", "avi", "mkv", "webm", "quicktime"];
  if (videoTypes.some((t) => fileType.includes(t))) return "video";
  return "image";
}

function buildImageInfo(tags: RawTags, mediaKind: MediaKind): ImageInfo | null {
  if (mediaKind !== "image") return null;
  return {
    width: num(tags, "ImageWidth", "ExifImageWidth"),
    height: num(tags, "ImageHeight", "ExifImageHeight"),
    imageSize: str(tags, "ImageSize"),
    orientation: str(tags, "Orientation"),
    colorSpace: str(tags, "ColorSpace"),
    iccProfile: str(tags, "ProfileDescription", "ICCProfileName"),
    compression: str(tags, "Compression"),
    bitDepth: num(tags, "BitDepth", "BitsPerSample"),
    dpiX: num(tags, "XResolution"),
    dpiY: num(tags, "YResolution"),
  };
}

function buildVideoInfo(tags: RawTags, mediaKind: MediaKind): VideoInfo | null {
  if (mediaKind !== "video") return null;
  return {
    duration: str(tags, "Duration"),
    width: num(tags, "ImageWidth", "SourceImageWidth"),
    height: num(tags, "ImageHeight", "SourceImageHeight"),
    videoCodec: str(tags, "CompressorName", "CompressorID", "VideoCodec"),
    audioCodec: str(tags, "AudioFormat", "AudioCodec"),
    frameRate: num(tags, "VideoFrameRate"),
    bitRate: str(tags, "AvgBitrate"),
    encoder: str(tags, "Encoder"),
    containerFormat: str(tags, "MajorBrand", "FileType"),
    rotation: num(tags, "Rotation"),
  };
}

function buildCameraInfo(tags: RawTags): CameraInfo | null {
  const make = str(tags, "Make");
  const model = str(tags, "Model");
  if (!make && !model) return null;
  return {
    make,
    model,
    lensMake: str(tags, "LensMake"),
    lensModel: str(tags, "LensModel"),
    lensSerialNumber: str(tags, "LensSerialNumber"),
    serialNumber: str(tags, "SerialNumber", "InternalSerialNumber"),
    software: str(tags, "Software"),
    firmware: str(tags, "FirmwareVersion"),
    exposureTime: str(tags, "ExposureTime"),
    fNumber: num(tags, "FNumber"),
    iso: num(tags, "ISO"),
    focalLength: str(tags, "FocalLength"),
    focalLengthIn35mmFormat: str(tags, "FocalLengthIn35mmFormat"),
    flash: str(tags, "Flash"),
    whiteBalance: str(tags, "WhiteBalance"),
    exposureProgram: str(tags, "ExposureProgram"),
    meteringMode: str(tags, "MeteringMode"),
  };
}

function buildDatesInfo(tags: RawTags): DatesInfo {
  return {
    dateTimeOriginal: str(tags, "DateTimeOriginal"),
    createDate: str(tags, "CreateDate", "TrackCreateDate"),
    modifyDate: str(tags, "ModifyDate", "TrackModifyDate"),
    fileModifyDate: str(tags, "FileModifyDate"),
    fileAccessDate: str(tags, "FileAccessDate"),
    gpsDateStamp: str(tags, "GPSDateStamp"),
    gpsTimeStamp: str(tags, "GPSTimeStamp"),
  };
}

/**
 * Builds GPS info from ExifTool output produced with `-n` (signed decimal
 * degrees, no reference letters baked in beyond the sign already applied).
 * We still read *Ref tags when present since some containers keep them
 * separate even under -n.
 */
function buildGpsInfo(tags: RawTags): GpsInfo | null {
  const rawLat = num(tags, "GPSLatitude");
  const rawLon = num(tags, "GPSLongitude");

  if (rawLat === null || rawLon === null) return null;
  if (!isValidLatitude(rawLat) || !isValidLongitude(rawLon)) return null;

  const latRef = str(tags, "GPSLatitudeRef");
  const lonRef = str(tags, "GPSLongitudeRef");

  const latitude = normalizeCoordinate(rawLat, latRef, "lat");
  const longitude = normalizeCoordinate(rawLon, lonRef, "lon");

  return {
    latitude,
    longitude,
    latitudeRef: latitude.decimal >= 0 ? "N" : "S",
    longitudeRef: longitude.decimal >= 0 ? "E" : "W",
    altitude: num(tags, "GPSAltitude"),
    altitudeRef: str(tags, "GPSAltitudeRef"),
    gpsDate: str(tags, "GPSDateStamp", "GPSDateTime"),
    gpsTime: str(tags, "GPSTimeStamp"),
    gpsSpeed: num(tags, "GPSSpeed"),
    gpsSpeedRef: str(tags, "GPSSpeedRef"),
    gpsDirection: num(tags, "GPSImgDirection", "GPSTrack"),
    gpsDirectionRef: str(tags, "GPSImgDirectionRef", "GPSTrackRef"),
    gpsImgDirection: num(tags, "GPSImgDirection"),
    gpsTrack: num(tags, "GPSTrack"),
    gpsTrackRef: str(tags, "GPSTrackRef"),
    gpsPosition: str(tags, "GPSPosition"),
  };
}

function buildTechnicalInfo(tags: RawTags): TechnicalInfo {
  const technical: TechnicalInfo = {};
  for (const [key, value] of Object.entries(tags)) {
    if (CATEGORIZED_TAG_NAMES.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "object") continue;
    technical[key] = value as string | number | boolean;
  }
  return technical;
}

/**
 * Never expose the server's filesystem layout to clients: ExifTool reports
 * the randomized temp path we wrote the upload to (SourceFile, Directory)
 * and the randomized temp filename (FileName). Strip the path tags and
 * replace FileName with the client-supplied display name everywhere the raw
 * tags are surfaced, including inside `raw`.
 */
const SERVER_PATH_TAG_NAMES = ["SourceFile", "Directory", "FilePath", "BaseName"];

function sanitizeServerPaths(tags: RawTags, displayName: string): RawTags {
  const sanitized: RawTags = { ...tags, FileName: displayName };
  for (const key of SERVER_PATH_TAG_NAMES) delete sanitized[key];
  return sanitized;
}

export function parseExifToolOutput(
  rawTags: RawTags,
  fileMeta: {
    name: string;
    size: number;
    mimeType: string;
    extension: string;
    sha256: string;
  },
): AnalyzedMetadata {
  const tags = sanitizeServerPaths(rawTags, fileMeta.name);
  const mediaKind = detectMediaKind(tags);

  return {
    file: {
      name: fileMeta.name,
      size: fileMeta.size,
      mimeType: fileMeta.mimeType,
      extension: fileMeta.extension,
      fileCreateDate: str(tags, "FileCreateDate"),
      fileModifyDate: str(tags, "FileModifyDate"),
      sha256: fileMeta.sha256,
    },
    mediaKind,
    image: buildImageInfo(tags, mediaKind),
    video: buildVideoInfo(tags, mediaKind),
    camera: buildCameraInfo(tags),
    gps: buildGpsInfo(tags),
    dates: buildDatesInfo(tags),
    technical: buildTechnicalInfo(tags),
    raw: tags,
  };
}
