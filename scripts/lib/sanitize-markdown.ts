import removeMd from "remove-markdown";

/**
 * Sanitizes markdown descriptions for use in markdown tables. Uses remove-markdown package to strip
 * formatting, then post-processes to handle table-breaking characters.
 */
export function sanitizeDescription(description: string | undefined, maxLength = 200): string {
  if (!description || description.trim() === "") {
    return "N/A";
  }

  // Use remove-markdown to strip all markdown syntax
  let sanitized = removeMd(description, {
    gfm: true, // GitHub-Flavored Markdown support
    useImgAltText: false, // Don't replace images with alt text, remove entirely
  });

  // Post-process for markdown table safety
  sanitized = sanitized
    .replaceAll("|", "") // Remove pipe characters (break table columns)
    .replaceAll(/\n+/g, " ") // Replace newlines with spaces (break table rows)
    .replaceAll(/\s+/g, " ") // Normalize whitespace
    .trim();

  // Return N/A if empty after sanitization
  if (sanitized === "") {
    return "N/A";
  }

  // Truncate if too long (preserve word boundaries)
  if (sanitized.length > maxLength) {
    const truncated = sanitized.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    sanitized =
      lastSpace > maxLength * 0.8 ? truncated.slice(0, lastSpace) + "..." : truncated + "...";
  }

  return sanitized;
}
