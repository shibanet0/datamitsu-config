import type { TypedFlatConfigItem } from "../types";

/**
 * The preset only. `pnpm/json-enforce-catalog` used to be turned off here, in an unscoped block —
 * which AGENTS.md says not to do, and which broke the moment the composer started ignoring JSON in
 * unscoped blocks: the preset scopes itself to `package.json`, the turn-off did not, so the rule
 * came back on for exactly the file it targets. It lives in `src/lint-rules` now.
 */
export async function pnpm(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-pnpm");

  return [...plugin.configs.recommended];
}
