import { api } from "./api";

// Used only when the server has no Cloudinary credentials: the unsigned preset
// the app already used for profile photos.
const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dflgmfevw";
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "chat-app";
const RESOURCE = { image: "image", voice: "video", file: "raw" }; // Cloudinary files audio under "video"

export class UploadError extends Error {}

const abortError = () => Object.assign(new Error("Upload cancelled"), { name: "AbortError" });

/** Ask our server to sign an upload. `null` means "not configured" (501). */
const sign = async (kind) => {
  try {
    return (await api.post("/upload/sign", { kind })).data;
  } catch (error) {
    if (error.response?.status === 501) return null;
    throw error;
  }
};

/** multipart POST with real progress (fetch can't report upload progress). */
const post = (url, form, { onProgress, signal } = {}) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let body = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) return resolve(body);
      reject(new UploadError(body.error?.message || "Upload failed. Please try again."));
    };
    xhr.onerror = () => reject(new UploadError("Can't reach the upload service. Check your connection."));
    signal?.addEventListener("abort", () => {
      xhr.abort();
      reject(abortError());
    });
    xhr.send(form);
  });

/**
 * Upload a file straight to Cloudinary. Resolves `{ url, size }`.
 * Signed through our API when configured; unsigned preset otherwise.
 */
export const uploadFile = async (file, kind, options = {}) => {
  const signed = await sign(kind);
  const form = new FormData();
  form.append("file", file);

  let url;
  if (signed) {
    Object.entries(signed.fields).forEach(([key, value]) => form.append(key, value));
    url = signed.uploadUrl;
  } else {
    form.append("upload_preset", PRESET);
    url = `https://api.cloudinary.com/v1_1/${CLOUD}/${RESOURCE[kind]}/upload`;
  }

  const result = await post(url, form, options);
  return { url: result.secure_url, size: result.bytes };
};
