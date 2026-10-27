const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dflgmfevw";
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "chat-app";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/** Upload an image and resolve with its https URL. Throws a readable Error. */
export const uploadImage = async (file) => {
  if (!ALLOWED.includes(file.type)) throw new Error("Please choose a JPG, PNG or WebP image.");
  if (file.size > MAX_BYTES) throw new Error("That image is larger than 5 MB.");

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: "POST",
    body,
  });
  if (!res.ok) throw new Error("Upload failed. Please try again.");
  const data = await res.json();
  return data.secure_url || data.url;
};
