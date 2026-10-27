const URL_RE = /https?:\/\/[^\s<]+[^\s<.,;:!?)"'\]]/gi;

/**
 * Split text into plain and link segments. Renders safely via React
 * elements – never innerHTML.
 */
export const linkify = (text) => {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    if (match.index > last) parts.push({ type: "text", value: text.slice(last, match.index) });
    parts.push({ type: "link", value: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
};
