export function safeJsonParse(content: string | undefined): Record<string, any> {
  try {
    return JSON.parse(content || "{}");
  } catch {
    return {};
  }
}

// Normalizes file content to end with exactly one `\n`. Without this, files
// written by `dm init` differ from the same files after prettier/editor save,
// causing a phantom diff on every subsequent `dm` run.
export function withTrailingNewline(content: string): string {
  return content.replace(/\n*$/, "\n");
}
