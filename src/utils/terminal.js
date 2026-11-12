import stringWidth from "string-width";
import { stripVTControlCharacters } from "util";

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export function cleanText(value) {
  return stripVTControlCharacters(value).replace(/\s+/g, " ").trim();
}

export function wrapText(text, width) {
  const lines = [];
  let line = "";
  let used = 0;
  for (const { segment } of segmenter.segment(text)) {
    const size = stringWidth(segment);
    if (used + size > width && line) {
      lines.push(line);
      line = "";
      used = 0;
    }
    line += segment;
    used += size;
  }
  lines.push(line);
  return lines;
}

export function pad(text, width) {
  return text + " ".repeat(Math.max(0, width - stringWidth(text)));
}
