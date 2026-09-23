/**
 * Markdown gets a structural linter, not a second formatter.
 *
 * Oxfmt owns how a Markdown file looks — and it owns the fenced code inside it too: measured on a
 * file holding thirteen languages, it reformats `js`, `ts`, `tsx`, `json`, `css`, `yaml` and
 * `graphql` blocks, byte-identical to what prettier writes. What no formatter reports is the
 * structure: a fence with no language, a bare URL, a heading level that skips a step, a link whose
 * fragment does not exist, a table whose rows disagree on column count. That is the whole job here
 * — 42 findings on this repository's 45 Markdown files, none of which any other tool in the
 * toolchain reports.
 *
 * Every rule that decides what the file _looks_ like is therefore off, and the list below says
 * which of two reasons put it there. Leaving one on does not produce a second opinion, it produces
 * a loop: the formatter writes its form, the linter reports it, and `dm check` fails on a file `dm
 * fix` has just written.
 *
 * The types are written here rather than imported from the package. markdownlint-cli2 is a managed
 * binary, not a dependency of this repository or of a consuming project, so there is nothing to
 * import them from at build time — and pulling the package in as a devDependency to type a config
 * object of six keys is a poor trade.
 */

/**
 * The markdownlint-cli2 configuration object — the shape a `.markdownlint-cli2.mjs` exports.
 */
export interface Config {
  config?: MarkdownlintConfig;
  customRules?: string[];
  fix?: boolean;
  frontMatter?: string;
  gitignore?: boolean;
  globs?: string[];
  ignores?: string[];
  markdownItPlugins?: unknown[];
  modulePaths?: string[];
  noBanner?: boolean;
  noProgress?: boolean;
  outputFormatters?: unknown[];
  showFound?: boolean;
}

/**
 * The `config` object: markdownlint's own rule configuration.
 */
export interface MarkdownlintConfig {
  [rule: string]: null | RuleConfig | string | undefined;
  default?: boolean;
  extends?: null | string;
}

/**
 * A markdownlint rule: off, on, or on with options.
 */
export type RuleConfig = boolean | Record<string, unknown>;

/**
 * The rules `markdownlint/style/prettier` turns off, by code rather than by alias, because the
 * report prints codes. That preset cannot be `extends`-ed from here: `extends` resolves against the
 * config file, which is the consuming project's, and markdownlint lives in the managed app's own
 * install — the same trap documented in src/apps/stylelint/index.ts, minus stylelint's option of
 * resolving an absolute path, since a rule list is data and copying it keeps the decision readable
 * in the generated config.
 *
 * Checked against markdownlint 0.41.1's `style/prettier.json`: 23 rules, all of them here.
 */
const formatterOwnedRules: MarkdownlintConfig = {
  MD003: false, // heading-style
  MD005: false, // list-indent
  MD007: false, // ul-indent
  MD009: false, // no-trailing-spaces — and two of them are a hard line break, not trailing space
  MD010: false, // no-hard-tabs
  MD012: false, // no-multiple-blanks
  MD013: false, // line-length — `indentSettings.lineWidth` is the formatter's wrap target, not a cap
  MD018: false, // no-missing-space-atx
  MD019: false, // no-multiple-space-atx
  MD020: false, // no-missing-space-closed-atx
  MD021: false, // no-multiple-space-closed-atx
  MD022: false, // blanks-around-headings
  MD023: false, // heading-start-left
  MD027: false, // no-multiple-space-blockquote
  MD028: false, // no-blanks-blockquote
  MD029: false, // ol-prefix
  MD030: false, // list-marker-space
  MD031: false, // blanks-around-fences
  MD032: false, // blanks-around-lists
  MD035: false, // hr-style
  MD048: false, // code-fence-style
  MD049: false, // emphasis-style
  MD050: false, // strong-style
};

/**
 * Not in the upstream preset, off for the same reason: each is a decision about the shape of the
 * file, and the formatter already makes it. A newer markdownlint added the table ones, and the
 * preset has not caught up.
 */
const alsoFormatterOwnedRules: MarkdownlintConfig = {
  MD004: false, // ul-style — which bullet character
  MD047: false, // single-trailing-newline — the formatter writes it, editorconfig-checker verifies it
  MD055: false, // table-pipe-style
  MD058: false, // blanks-around-tables
  MD060: false, // table-column-style
};

/**
 * Editorial decisions, each one this package's rather than markdownlint's.
 *
 * `MD056` (table-column-count) stays on deliberately, next to the table rules above: a row with the
 * wrong number of cells renders wrong, which is a defect and not a style.
 */
const editorialRules: MarkdownlintConfig = {
  // no-duplicate-heading: two sections may each carry a "Why" heading under different parents; what
  // breaks a link is two of them under the same one.
  MD024: { siblings_only: true },
  // no-inline-html: the elements documentation genuinely needs, and nothing that would let a page
  // grow a layout. `<details>` in particular is how a long example is folded away on GitHub, and
  // `<p align="center">` is how every README that has a logo centres it — Markdown has no other way
  // to say either.
  MD033: {
    allowed_elements: [
      "br",
      "details",
      "img",
      "kbd",
      "p",
      "picture",
      "source",
      "sub",
      "summary",
      "sup",
    ],
  },
  // code-block-style: an indented block inside a list item is normal Markdown, and demanding one
  // style repository-wide is a preference no formatter enforces.
  MD046: false,
};

const baseConfig: Config = {
  config: {
    default: true,
    ...formatterOwnedRules,
    ...alsoFormatterOwnedRules,
    ...editorialRules,
  },
  /**
   * `fix` is off, and there is no `fix` operation in `tools.ts` either. markdownlint's fixes edit
   * prose — wrapping a bare URL in angle brackets, renumbering a list — rather than reflowing it,
   * so they are edits to the document, not a formatting pass, and `dm fix` is not where a document
   * gets edited. `dm exec markdownlint-cli2 -- --fix <glob>` stays available for the times that is
   * exactly what you want.
   */
  fix: false,
  gitignore: true,
  noBanner: true,
  noProgress: true,
};

const isFunction = (value: unknown): value is (base: Config) => Config =>
  typeof value === "function";

/**
 * Merges one level deep, so `defineConfig({ config: { MD041: false } })` keeps the rule decisions
 * above instead of replacing all of them with that one entry — the failure mode documented for
 * oxlint, stylelint and oxfmt in AGENTS.md, and the one anyone writing this call would hit first.
 * Replacing wholesale is the function form, where `base` is in hand.
 */
export const defineConfig = (config?: ((base: Config) => Config) | Config): Config => {
  if (config === undefined) {
    return baseConfig;
  }

  if (isFunction(config)) {
    return config(baseConfig);
  }

  return {
    ...baseConfig,
    ...config,
    config: mergeRules(baseConfig.config ?? {}, config.config ?? {}),
  };
};

/**
 * Merges rule by rule, and inside a rule option by option, with arrays appending.
 *
 * A shallow merge of `config` was one level too shallow: `{ MD033: { allowed_elements: ["a"] } }` —
 * the shape anyone writes to allow one more element — replaced the whole allow-list and silently
 * withdrew `details`, `summary` and `br`. That is the failure AGENTS.md describes for oxlint,
 * stylelint and oxfmt, one nesting level further in. Replacing outright is the function form, where
 * `base` is in hand and dropping it is visibly deliberate.
 */
const mergeRules = (
  base: MarkdownlintConfig,
  overrides: MarkdownlintConfig,
): MarkdownlintConfig => {
  const merged: MarkdownlintConfig = { ...base };

  for (const [rule, entry] of Object.entries(overrides)) {
    const current = merged[rule];

    merged[rule] =
      isOptions(current) && isOptions(entry) ? mergeOptions(current, entry) : (entry as RuleConfig);
  }

  return merged;
};

const isOptions = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const mergeOptions = (
  base: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> => {
  const merged: Record<string, unknown> = { ...base };

  for (const [option, value] of Object.entries(overrides)) {
    const current = merged[option];

    merged[option] =
      Array.isArray(current) && Array.isArray(value) ? [...current, ...value] : value;
  }

  return merged;
};
