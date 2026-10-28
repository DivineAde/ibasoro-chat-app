/**
 * Cut a window of `text` around the first match of `query` so a long message shows the
 * part that matters: { before, match, after } with "…" where text was trimmed.
 * Returns the start of the text, unhighlighted, if there is no match (e.g. matched a file name).
 */
export const snippet = (text = "", query = "", radius = 36) => {
  const flat = text.replace(/\s+/g, " ").trim();
  const i = query ? flat.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i === -1) return { before: flat.length > radius * 2 ? `${flat.slice(0, radius * 2)}…` : flat, match: "", after: "" };
  const from = Math.max(0, i - radius);
  const to = Math.min(flat.length, i + query.length + radius);
  return {
    before: (from > 0 ? "…" : "") + flat.slice(from, i),
    match: flat.slice(i, i + query.length),
    after: flat.slice(i + query.length, to) + (to < flat.length ? "…" : ""),
  };
};
