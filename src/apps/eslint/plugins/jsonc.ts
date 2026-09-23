import type { TypedFlatConfigItem } from "../types";

import { GLOB_JSON, GLOB_JSON5, GLOB_JSONC } from "../globs";

/**
 * The JSON linter, scoped so its rules reach the files they exist for.
 *
 * Both upstream presets are three blocks: a plugin registration, a `files`-scoped block that
 * installs the `jsonc/x` language, and a third that carries all the actual rules with **no `files`
 * at all**. That third shape is exactly what `composer.setDefaultIgnores` targets, so it was being
 * stamped with `ignores: ["**\/*.json", "**\/*.json5", "**\/*.jsonc", …]` — the four globs it
 * exists for. The language block scoped itself and survived; the rule block did not, and 28 rules
 * were off on JSON and on everywhere else.
 *
 * Measured before the fix: `{"a": 1, "a": +3}` in a `.json` file reported nothing, while the preset
 * alone reports `no-dupe-keys`, `no-plus-sign` and `valid-json-number`. Inverted, those same rules
 * resolved _on_ for `.ts` files, where they can never match.
 *
 * Scoping every rule-bearing block here rather than opting out of the default ignores: the rules
 * are for these three extensions and nothing else, so saying so is both the fix and the
 * documentation.
 *
 * **Each dialect gets its own preset, and only its own extension.** Scoping all of them to all
 * three extensions was the same bug one level up: JSON5's preset deliberately leaves
 * `jsonc/quote-props`, `jsonc/quotes` and `jsonc/no-hexadecimal-numeric-literals` unset, because
 * JSON5 is the dialect where an unquoted key, a single-quoted string and `0xff` are legal — and
 * JSONC's preset, applied to the same files, set all three at error. `{ a: "hello" }` in a `.json5`
 * therefore failed `jsonc/quote-props` while both formatters wrote exactly that (measured: oxfmt
 * rewrites `{ "a": "hello" }` back to `{ a: "hello" }`), so ESLint and the formatter each undid the
 * other and `dm check` could not pass. A single `0xff` reported twice, under
 * `no-hexadecimal-numeric-literals` and `valid-json-number`, for the same reason.
 *
 * `recommended-with-json` is now included as well, scoped to `.json`, where comments really are an
 * error — the previous arrangement linted plain JSON with the dialect that permits them.
 */
export async function jsonc(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-jsonc");

  /**
   * The rule-bearing block of one preset, scoped to the one extension that dialect describes. Every
   * preset ships the same three blocks — a plugin registration, a `files`-scoped language block,
   * and the rules with no `files` — so only the last one is taken here; the other two are identical
   * across all three presets and are contributed once, by the JSON preset below.
   */
  const rulesFor = (
    preset:
      | "flat/recommended-with-json5"
      | "flat/recommended-with-json"
      | "flat/recommended-with-jsonc",
    files: string[],
  ): TypedFlatConfigItem[] =>
    plugin.configs[preset]
      .filter((block) => block.rules && !block.files)
      .map((block) => ({ ...block, files })) as TypedFlatConfigItem[];

  /**
   * What the JSON dialect forbids and JSONC permits — `jsonc/no-comments` and whatever the plugin
   * adds next. A later flat-config block can only override a rule it names, and the JSONC preset
   * does not name these at all (that is the whole difference between the two), so overriding the
   * JSON block for the files below means turning them off by name. Computed from the presets rather
   * than listed, so a plugin bump that moves a rule between the two dialects is followed here.
   */
  const rulesOf = (preset: "flat/recommended-with-json" | "flat/recommended-with-jsonc") =>
    Object.assign({}, ...plugin.configs[preset].map((block) => block.rules ?? {})) as Record<
      string,
      unknown
    >;

  const jsoncRules = rulesOf("flat/recommended-with-jsonc");
  const jsonOnlyRules = Object.fromEntries(
    Object.keys(rulesOf("flat/recommended-with-json"))
      .filter((rule) => !(rule in jsoncRules))
      .map((rule) => [rule, "off"]),
  );

  return [
    ...(plugin.configs["flat/recommended-with-json"].map((block) =>
      block.rules && !block.files ? { ...block, files: [GLOB_JSON] } : block,
    ) as TypedFlatConfigItem[]),
    // After the JSON block, so that for the files named in both it is this one that wins.
    ...rulesFor("flat/recommended-with-jsonc", [GLOB_JSONC, ...JSONC_BY_CONVENTION]),
    {
      files: JSONC_BY_CONVENTION,
      name: "s0/jsonc-by-convention",
      rules: jsonOnlyRules,
    } as TypedFlatConfigItem,
    ...rulesFor("flat/recommended-with-json5", [GLOB_JSON5]),
  ];
}

/**
 * Files that carry comments and a `.json` extension, by the convention of the tool that reads them.
 * TypeScript has documented comments in `tsconfig.json` since it shipped one, VS Code reads its own
 * settings as JSONC, and the devcontainer spec says the same.
 *
 * Without this list the strict JSON preset reported `jsonc/no-comments` on a `tsconfig.json` that
 * TypeScript itself accepts — a rule that is right about the format and wrong about the file.
 */
const JSONC_BY_CONVENTION = [
  "**/tsconfig.json",
  "**/tsconfig.*.json",
  "**/jsconfig.json",
  "**/jsconfig.*.json",
  "**/.vscode/*.json",
  "**/devcontainer.json",
  "**/.devcontainer/**/*.json",
];
