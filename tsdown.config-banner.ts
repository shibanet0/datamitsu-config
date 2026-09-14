export const tsdownConfigBanner: string = [
  "// @ts-nocheck",
  "// prettier-ignore",
  "/* eslint-disable */",
].join("\n");

/**
 * The banner for generated files that are **committed** — `agents.md.ts`, `skills.ts`,
 * `tsconfig.md.ts` and friends, as opposed to the bundles under `dist-*`.
 *
 * No `/* eslint-disable *\/` and no `@ts-nocheck`: those files are typechecked and linted like any
 * other source, and they pass. A blanket suppression on a file that is already clean is a
 * suppression nobody can evaluate — and with `reportUnusedDisableDirectives` on, both linters now
 * say so out loud.
 *
 * `prettier-ignore` stays. These files are megabyte-scale string literals; reformatting them is
 * pure churn.
 */
export const generatedSourceBanner: string = "// prettier-ignore";
