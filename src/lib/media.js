/** Pure helpers for attachments and voice notes (no React). */

const MB = 1024 * 1024;
export const LIMITS = { image: 15 * MB, voice: 10 * MB, file: 25 * MB };
export const MAX_ATTACHMENTS = 6;
export const MAX_VOICE_SECONDS = 5 * 60;

// Files that run code when opened. Easy to rename, but a cheap speed bump.
const BLOCKED = /\.(exe|msi|bat|cmd|com|scr|pif|vbs|jar|ps1|sh|apk|dll|app|dmg)$/i;

export const formatBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`;
};

/** 75 → "1:15" */
export const formatDuration = (seconds = 0) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Photos render inline; everything else (including SVG) is a file. */
export const attachmentKind = (file) =>
  /^image\/(jpeg|png|webp|gif|avif|heic|heif)$/i.test(file.type) ? "image" : "file";

/** A user-facing reason the file can't be sent, or null if it's fine. */
export const checkFile = (file, kind) => {
  if (!file.size) return `“${file.name}” is empty.`;
  if (BLOCKED.test(file.name)) return `“${file.name}” can’t be sent for safety reasons.`;
  if (file.size > LIMITS[kind]) return `“${file.name}” is larger than ${Math.round(LIMITS[kind] / MB)} MB.`;
  return null;
};

/** File extension in capitals for the file tile: "report.final.pdf" → "PDF". */
export const extensionOf = (name = "") => {
  const i = name.lastIndexOf(".");
  return i > 0 && i < name.length - 1 ? name.slice(i + 1, i + 6).toUpperCase() : "FILE";
};

/**
 * Cloudinary stores audio as "video". Asking for an `.mp3` of the same asset
 * makes it play in every browser, including Safari, whatever we recorded in.
 */
export const playbackUrl = (url = "") =>
  /^https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(url) ? url.replace(/\.[a-z0-9]+$/i, ".mp3") : url;

/** Reduce raw amplitude samples (0–1) to `count` integer peaks (0–100) for display. */
export const normalizePeaks = (samples, count = 48) => {
  if (!samples.length) return Array(count).fill(8);
  const buckets = Array.from({ length: count }, (_, i) => {
    const from = Math.floor((i * samples.length) / count);
    const to = Math.max(from + 1, Math.floor(((i + 1) * samples.length) / count));
    return Math.max(...samples.slice(from, to));
  });
  const top = Math.max(...buckets, 0.0001);
  return buckets.map((v) => Math.max(8, Math.round((v / top) * 100)));
};

/** Stable fake waveform for voice notes that have none (older clients). */
export const pseudoPeaks = (seed = "", count = 48) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return Array.from({ length: count }, (_, i) => {
    h = Math.imul(h ^ (i + 1), 2246822519);
    return 18 + Math.abs(h % 70);
  });
};

/** Natural size of an image file, or {} if it can't be decoded. */
export const readImageSize = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    img.src = url;
  });

const MAX_EDGE = 2560;
const COMPRESS_ABOVE = 1.5 * MB;

/**
 * Shrink big photos before upload: phones produce 5–12 MB JPEGs that nobody
 * needs at full size. GIFs and small images are left untouched.
 * Resolves `{ file, width, height }`; falls back to the original on any problem.
 */
export const prepareImage = async (file) => {
  const original = { file, ...(await readImageSize(file)) };
  const { width = 0, height = 0 } = original;
  const compressible = /^image\/(jpeg|png|webp)$/i.test(file.type);
  if (!compressible || (file.size <= COMPRESS_ABOVE && Math.max(width, height) <= MAX_EDGE)) return original;

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return original;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return { file: new File([blob], name, { type: "image/jpeg" }), width: w, height: h };
  } catch {
    return original;
  }
};

/**
 * A right-sized, auto-format copy of a Cloudinary photo for the transcript.
 * Anything else (local previews, other hosts) is returned unchanged.
 */
export const thumbUrl = (url = "", width = 640) =>
  /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/v?\d/.test(url)
    ? url.replace("/image/upload/", `/image/upload/f_auto,q_auto,w_${width}/`)
    : url;
