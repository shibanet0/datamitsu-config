import type { TypedFlatConfigItem } from "../types";

import { GLOB_JSON, GLOB_JSON5, GLOB_JSONC } from "../globs";

/**
 * Validates a file against whatever schema schemastore maps its name to.
 *
 * The preset installs parsers for JSON, YAML and TOML in `files`-scoped blocks, and then puts the
 * rule itself in an unscoped one — so `setDefaultIgnores` took it off every JSON file and left it
 * running on TypeScript, where it has nothing to validate. 852 of the catalogue's 1364 entries
 * match `.json`/`.jsonc`/`.json5`, which means `package.json` with `"version": 123` and
 * `tsconfig.json` with `"strict": "yes"` were never checked.
 *
 * JSON only, though the preset parses YAML and TOML as well. YAML 1.1 reads a bare `on:` as the
 * boolean `true`, so a GitHub workflow arrives at the validator with its trigger key renamed and
 * the schema rejects the whole document — 22 findings on one release workflow here, every one an
 * artefact of the parse rather than a fact about the file. The rule is right about JSON, where 852
 * of the catalogue's 1364 entries apply, and wrong about YAML for a reason nothing in this config
 * can fix.
 *
 * This also forecloses the plugin's other mode — validating a JS module's default export against a
 * schema — which nothing here uses.
 */
export async function jsonSchemaValidator(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-json-schema-validator");

  return (plugin.default.configs["flat/recommended"] as TypedFlatConfigItem[]).map((block) =>
    block.rules && !block.files ? { ...block, files: [GLOB_JSON, GLOB_JSON5, GLOB_JSONC] } : block,
  );
}
