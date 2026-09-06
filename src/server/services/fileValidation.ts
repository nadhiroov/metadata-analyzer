export interface DetectedFileType {
  extension: string;
  mimeType: string;
  mediaKind: "image" | "video";
}

interface SignatureRule {
  extension: string;
  mimeType: string;
  mediaKind: "image" | "video";
  /** Returns true if the buffer's header matches this format. */
  matches: (bytes: Uint8Array) => boolean;
}

function bytesStartWith(bytes: Uint8Array, offset: number, pattern: number[]): boolean {
  if (bytes.length < offset + pattern.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (bytes[offset + i] !== pattern[i]) return false;
  }
  return true;
}

function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  if (bytes.length < offset + length) return "";
  return Array.from(bytes.slice(offset, offset + length))
    .map((b) => String.fromCharCode(b))
    .join("");
}

function includesAscii(bytes: Uint8Array, needle: string, scanLimit = 4096): boolean {
  const haystack = asciiAt(bytes, 0, Math.min(bytes.length, scanLimit));
  return haystack.includes(needle);
}

/**
 * ISO-BMFF (MP4/MOV/HEIC/AVIF/HEIF) files start with a 4-byte box size
 * followed by "ftyp" and a 4-byte major brand (space-padded, e.g. "qt  " or
 * "M4V "). Returns the trimmed, lowercased brand, or null if there's no
 * ftyp box at the start of the file.
 */
function ftypBrand(bytes: Uint8Array): string | null {
  if (!bytesStartWith(bytes, 4, [0x66, 0x74, 0x79, 0x70])) return null; // "ftyp"
  return asciiAt(bytes, 8, 4).trim().toLowerCase();
}

function isIsoBmffBrand(bytes: Uint8Array, brands: string[]): boolean {
  const brand = ftypBrand(bytes);
  return brand !== null && brands.includes(brand);
}

/** The very first box type, for legacy QuickTime files with no ftyp box. */
function firstBoxType(bytes: Uint8Array): string {
  return asciiAt(bytes, 4, 4).trim().toLowerCase();
}

const RULES: SignatureRule[] = [
  {
    extension: "jpg",
    mimeType: "image/jpeg",
    mediaKind: "image",
    matches: (b) => bytesStartWith(b, 0, [0xff, 0xd8, 0xff]),
  },
  {
    extension: "png",
    mimeType: "image/png",
    mediaKind: "image",
    matches: (b) => bytesStartWith(b, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    extension: "gif",
    mimeType: "image/gif",
    mediaKind: "image",
    matches: (b) => asciiAt(b, 0, 6) === "GIF87a" || asciiAt(b, 0, 6) === "GIF89a",
  },
  {
    extension: "webp",
    mimeType: "image/webp",
    mediaKind: "image",
    matches: (b) => asciiAt(b, 0, 4) === "RIFF" && asciiAt(b, 8, 4) === "WEBP",
  },
  {
    extension: "tiff",
    mimeType: "image/tiff",
    mediaKind: "image",
    matches: (b) =>
      bytesStartWith(b, 0, [0x49, 0x49, 0x2a, 0x00]) || // little-endian
      bytesStartWith(b, 0, [0x4d, 0x4d, 0x00, 0x2a]), // big-endian
  },
  {
    extension: "heic",
    mimeType: "image/heic",
    mediaKind: "image",
    matches: (b) => isIsoBmffBrand(b, ["heic", "heix", "hevc", "heim", "heis"]),
  },
  {
    extension: "heif",
    mimeType: "image/heif",
    mediaKind: "image",
    matches: (b) => isIsoBmffBrand(b, ["mif1", "msf1"]),
  },
  {
    extension: "avif",
    mimeType: "image/avif",
    mediaKind: "image",
    matches: (b) => isIsoBmffBrand(b, ["avif", "avis"]),
  },
  {
    extension: "m4v",
    mimeType: "video/x-m4v",
    mediaKind: "video",
    matches: (b) => isIsoBmffBrand(b, ["m4v"]),
  },
  {
    extension: "mp4",
    mimeType: "video/mp4",
    mediaKind: "video",
    matches: (b) => isIsoBmffBrand(b, ["isom", "iso2", "mp41", "mp42", "mp4v", "avc1", "dash", "m4a"]),
  },
  {
    extension: "mov",
    mimeType: "video/quicktime",
    mediaKind: "video",
    matches: (b) =>
      isIsoBmffBrand(b, ["qt"]) ||
      // Legacy QuickTime files predate the ftyp box and start directly with
      // one of these top-level box types.
      (ftypBrand(b) === null && ["moov", "free", "wide", "mdat", "pnot", "skip"].includes(firstBoxType(b))),
  },
  {
    extension: "avi",
    mimeType: "video/x-msvideo",
    mediaKind: "video",
    matches: (b) => asciiAt(b, 0, 4) === "RIFF" && asciiAt(b, 8, 4) === "AVI ",
  },
  {
    // WebM and MKV share the EBML magic; the DocType element (a short
    // ASCII string near the start) disambiguates them. Check WebM first.
    extension: "webm",
    mimeType: "video/webm",
    mediaKind: "video",
    matches: (b) => bytesStartWith(b, 0, [0x1a, 0x45, 0xdf, 0xa3]) && includesAscii(b, "webm"),
  },
  {
    extension: "mkv",
    mimeType: "video/x-matroska",
    mediaKind: "video",
    matches: (b) => bytesStartWith(b, 0, [0x1a, 0x45, 0xdf, 0xa3]),
  },
];

/**
 * Detects the real file type from its binary signature (magic bytes),
 * ignoring the client-supplied filename, extension, and MIME type — all of
 * which are untrusted. Returns null if the content doesn't match any
 * supported format.
 */
export function detectFileType(bytes: Uint8Array): DetectedFileType | null {
  for (const rule of RULES) {
    if (rule.matches(bytes)) {
      return {
        extension: rule.extension,
        mimeType: rule.mimeType,
        mediaKind: rule.mediaKind,
      };
    }
  }
  return null;
}

export function isSupportedFileType(bytes: Uint8Array): boolean {
  return detectFileType(bytes) !== null;
}
