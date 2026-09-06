// Shared types between client and server. Keep dependency-free (no Node/Bun-only APIs).

export type MediaKind = "image" | "video" | "unknown";

export interface FileInfo {
  name: string;
  size: number;
  mimeType: string;
  extension: string;
  fileCreateDate: string | null;
  fileModifyDate: string | null;
  sha256: string;
}

export interface ImageInfo {
  width: number | null;
  height: number | null;
  imageSize: string | null;
  orientation: string | null;
  colorSpace: string | null;
  iccProfile: string | null;
  compression: string | null;
  bitDepth: number | null;
  dpiX: number | null;
  dpiY: number | null;
}

export interface VideoInfo {
  duration: string | null;
  width: number | null;
  height: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  frameRate: number | null;
  bitRate: string | null;
  encoder: string | null;
  containerFormat: string | null;
  rotation: number | null;
}

export interface CameraInfo {
  make: string | null;
  model: string | null;
  lensMake: string | null;
  lensModel: string | null;
  lensSerialNumber: string | null;
  serialNumber: string | null;
  software: string | null;
  firmware: string | null;
  exposureTime: string | null;
  fNumber: number | null;
  iso: number | null;
  focalLength: string | null;
  focalLengthIn35mmFormat: string | null;
  flash: string | null;
  whiteBalance: string | null;
  exposureProgram: string | null;
  meteringMode: string | null;
}

export interface DatesInfo {
  dateTimeOriginal: string | null;
  createDate: string | null;
  modifyDate: string | null;
  fileModifyDate: string | null;
  fileAccessDate: string | null;
  gpsDateStamp: string | null;
  gpsTimeStamp: string | null;
}

export interface GpsCoordinate {
  decimal: number;
  dms: string;
}

export interface GpsInfo {
  latitude: GpsCoordinate;
  longitude: GpsCoordinate;
  latitudeRef: "N" | "S" | null;
  longitudeRef: "E" | "W" | null;
  altitude: number | null;
  altitudeRef: string | null;
  gpsDate: string | null;
  gpsTime: string | null;
  gpsSpeed: number | null;
  gpsSpeedRef: string | null;
  gpsDirection: number | null;
  gpsDirectionRef: string | null;
  gpsImgDirection: number | null;
  gpsTrack: number | null;
  gpsTrackRef: string | null;
  gpsPosition: string | null;
}

export interface TechnicalInfo {
  [key: string]: string | number | boolean | null;
}

export interface AnalyzedMetadata {
  file: FileInfo;
  mediaKind: MediaKind;
  image: ImageInfo | null;
  video: VideoInfo | null;
  camera: CameraInfo | null;
  gps: GpsInfo | null;
  dates: DatesInfo;
  technical: TechnicalInfo;
  raw: Record<string, unknown>;
}

export interface ResolvedLocation {
  country: string | null;
  state: string | null;
  city: string | null;
  district: string | null;
  village: string | null;
  postalCode: string | null;
  displayName: string | null;
  source: string;
}

export interface AnalyzeSuccessResponse {
  success: true;
  file: {
    name: string;
    size: number;
    mimeType: string;
  };
  metadata: AnalyzedMetadata;
  gps: {
    latitude: number;
    longitude: number;
    altitude: number | null;
  } | null;
  location: ResolvedLocation | null;
}

export interface AnalyzeErrorResponse {
  success: false;
  error: string;
  reasons: string[];
}

export type AnalyzeResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse;

export const SUPPORTED_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "heic",
  "heif",
  "tiff",
  "tif",
  "webp",
  "gif",
  "avif",
] as const;

export const SUPPORTED_VIDEO_EXTENSIONS = [
  "mp4",
  "mov",
  "m4v",
  "avi",
  "mkv",
  "webm",
] as const;
