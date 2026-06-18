/**
 * Title Case for field labels and headers — capitalizes words that start with a
 * lowercase letter; preserves acronyms and already-capitalized words (e.g. ID, Email).
 */
export function formatUILabel(label: string): string {
  return label.replace(/\b([a-z][\w']*)/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1)
  );
}

/** Title Case for UI copy (screen titles, section headers, labels, buttons). */
export function toTitleCase(label: string): string {
  return label
    .split(/\s+/)
    .map((word) => {
      if (word === "&") return word;
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) =>
            part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part
          )
          .join("-");
      }
      const lower = word.toLowerCase();
      if (lower === "vs") return "vs";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
