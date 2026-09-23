import type { Config } from "stylelint";

const asArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * Adds the caller's config to the base instead of replacing the keys it names — the same decision,
 * for the same reason, as `src/apps/oxlint/index.ts`.
 *
 * A spread was the obvious implementation and the wrong one. Everything that makes a component
 * parse lives in `overrides`, so `defineConfig({ overrides: [{ files: ["*.css"], rules: … }] })` —
 * the shape anyone would write to adjust one file type — dropped the `postcss-html` wiring along
 * with it. Measured: `.svelte` then fails with `Unknown word <script>`, `.vue` with `Unknown word
 * </style>`, and `.scss` with `Invalid double-slash CSS comment`. A config that silences a rule
 * should not silently stop parsing three languages.
 *
 * Objects merge key by key, arrays append, and the caller still wins wherever they name the same
 * key — `extends` and `overrides` are ordered last-wins in stylelint, so appending is what makes
 * the caller's entry decide. Replacing wholesale is the function form of `defineConfig`.
 *
 * It lives in its own module so the merge can be tested without resolving the presets: `index.ts`
 * turns every preset name into an absolute path in the managed app's install, which exists where
 * stylelint runs and not in this repository.
 */
export function mergeConfig(base: Config, config?: Config): Config {
  if (!config) {
    return base;
  }

  const merged: Config = { ...base, ...config };

  if (base.rules && config.rules) {
    merged.rules = { ...base.rules, ...config.rules };
  }

  if (base.overrides && config.overrides) {
    merged.overrides = [...base.overrides, ...config.overrides];
  }

  for (const key of ["extends", "plugins", "ignoreFiles"] as const) {
    if (base[key] && config[key]) {
      merged[key] = [...asArray(base[key]), ...asArray(config[key])] as never;
    }
  }

  return merged;
}
