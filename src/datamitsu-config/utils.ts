export function safeJsonParse(content: string | undefined): Record<string, any> {
  try {
    return JSON.parse(content || "{}");
  } catch {
    return {};
  }
}
