import { resolve } from "../ignore/profile";
import { jsonExcludeProfile } from "../ignore/profiles/json-exclude";
import { yamlExcludeProfile } from "../ignore/profiles/yaml-exclude";

export const actionlintGlobs: string[] = [
  "**/.github/workflows/*.yml",
  "**/.github/workflows/*.yaml",
];

export const dockerfileGlobs: string[] = ["**/Dockerfile", "**/Dockerfile.*", "**/*.dockerfile"];

// docker-compose / compose files (dclint targets these). Mirrors dclint's own
// matcher: `(docker-)?compose(.<name>)?.ya?ml`.
export const composeGlobs: string[] = [
  "**/docker-compose.yml",
  "**/docker-compose.yaml",
  "**/docker-compose.*.yml",
  "**/docker-compose.*.yaml",
  "**/compose.yml",
  "**/compose.yaml",
  "**/compose.*.yml",
  "**/compose.*.yaml",
];

// Every input that changes a droast verdict, not only the Dockerfiles it reports on: compose and
// bake files decide each Dockerfile's build context, and the ignore files decide DF033/DF077. A
// change to an unlisted input skips the run and the check silently passes.
export const droastGlobs: string[] = [
  ...dockerfileGlobs,
  ...composeGlobs,
  "**/Containerfile",
  "**/Containerfile.*",
  "**/*.containerfile",
  "**/docker-bake.hcl",
  "**/docker-bake.json",
  "**/docker-bake.*.hcl",
  "**/docker-bake.*.json",
  "**/.dockerignore",
  "**/*.dockerignore",
  "**/.containerignore",
  "droast.toml",
];

// Rust: Cargo manifests + sources (cargo-deny re-checks the whole crate graph).
export const cargoGlobs: string[] = ["**/Cargo.toml", "**/Cargo.lock", "**/*.rs"];

// Go sources + module file (govulncheck scans the module).
export const goGlobs: string[] = ["**/*.go", "**/go.mod"];

export const sqlGlobs: string[] = ["**/*.sql"];

/**
 * What stylelint lints. Stylesheets, plus the three shapes that carry a `<style>` block — the
 * overrides that attach `postcss-html` to those live in src/apps/stylelint/index.ts.
 *
 * `.less` is deliberately absent. stylelint 17 bundles no syntax but its own CSS parser, so a
 * `.less` file needs `postcss-less` and a preset of its own, neither of which is adopted here — and
 * pointing stylelint at one without them fails to parse rather than reporting nothing. oxfmt still
 * formats `.less`; it is linting that is missing, and the gap is here rather than hidden behind a
 * glob that cannot work.
 */
export const stylelintGlobs: string[] = [
  "**/*.css",
  "**/*.scss",
  "**/*.html",
  "**/*.htm",
  "**/*.xhtml",
  "**/*.vue",
  "**/*.svelte",
];

// ty type-checks Python sources, stubs, and Jupyter notebooks (NOT markdown —
// ty's markdown support is only its internal `mdtest` format, not a user input).
export const tyGlobs: string[] = ["**/*.py", "**/*.pyi", "**/*.ipynb"];

export const dotenvLinterGlobs: string[] = ["**/*.env", "**/.env", "**/*.env.*", "**/.env.*"];

// The file types ESLint and prettier both read. Kept separate from `eslintGlobs` because the two
// tools diverge at exactly one extension: ESLint parses `.svelte` through `svelte-eslint-parser`,
// and prettier has no parser for it at all — `prettier --check a.svelte` fails with "No parser could
// be inferred", so a shared list would hand every component to a tool that cannot read it.
const scriptGlobs: string[] = [
  "**/*.js",
  "**/*.jsx",
  "**/*.mjs",
  "**/*.cjs",
  "**/*.ts",
  "**/*.mts",
  "**/*.cts",
  "**/*.tsx",
  "**/*.html",
  "**/*.json",
  "**/*.jsonc",
  "**/*.json5",
];

export const eslintGlobs: string[] = [...scriptGlobs, "**/*.svelte"];

// Files whose edits should re-trigger `helm lint` for the enclosing chart.
export const helmGlobs: string[] = [
  "**/Chart.yaml",
  "**/values.yaml",
  "**/templates/**/*.yaml",
  "**/templates/**/*.yml",
  "**/templates/**/*.tpl",
];

export const jsonGlobs: string[] = ["**/*.json"];

export const makefileGlobs: string[] = ["**/Makefile", "**/GNUmakefile", "**/*.mk"];

export const markdownGlobs: string[] = ["**/*.md", "**/*.markdown"];
export const jsonExcludeGlobs: string[] = resolve(jsonExcludeProfile);

export const oxlintGlobs: string[] = [
  "**/*.js",
  "**/*.mjs",
  "**/*.cjs",
  "**/*.ts",
  "**/*.mts",
  "**/*.cts",
  "**/*.tsx",
  "**/*.jsx",
  "**/*.vue",
  "**/*.astro",
  "**/*.svelte",
];

// oxfmt formats by file type, independent of project type. This is every extension the pinned
// oxfmt understands (https://oxc.rs/docs/guide/usage/formatter/language-support.html), minus two
// exclusions:
//
// - Astro, which oxfmt does not support at all — there is no `.astro` in its extension table.
// - YAML, which yamlfmt owns: the two disagree on flow-mapping spacing (`{ a: 1 }` against
//   `{a: 1}`, which yq's key sorter also writes), so with both on a file `dm fix` leaves one form
//   and the other's check fails.
//
// `.svelte` is formatted by every project: the managed oxfmt app ships `svelte/compiler` and
// src/apps/oxfmt/index.ts sets `svelte: true` unconditionally. A repository with no components
// pays nothing for the glob — the plugin loads only when a `.svelte` file is actually formatted.
export const oxfmtGlobs: string[] = [
  "**/*.js",
  "**/*.jsx",
  "**/*.mjs",
  "**/*.cjs",
  "**/*.ts",
  "**/*.tsx",
  "**/*.mts",
  "**/*.cts",
  "**/*.d.ts",
  "**/*.json",
  "**/*.jsonc",
  "**/*.json5",
  "**/*.css",
  "**/*.scss",
  "**/*.less",
  "**/*.pcss",
  "**/*.postcss",
  "**/*.html",
  "**/*.htm",
  "**/*.xhtml",
  "**/*.vue",
  "**/*.svelte",
  "**/*.hbs",
  "**/*.handlebars",
  "**/*.mjml",
  "**/*.graphql",
  "**/*.gql",
  "**/*.graphqls",
  "**/*.md",
  "**/*.markdown",
  "**/*.mdx",
  "**/*.toml",
];

export const packageJsonGlobs: string[] = ["**/package.json"];

export const prettierGlobs: string[] = [...scriptGlobs, "**/*.d.ts", "**/*.md"];

export const propertiesGlobs: string[] = ["**/*.properties"];

export const protoGlobs: string[] = ["**/*.proto"];

export const shellGlobs: string[] = ["**/*.sh", "**/*.bash"];

export const tomlGlobs: string[] = ["**/*.toml"];

export const typescriptGlobs: string[] = [
  "**/*.d.ts",
  "**/*.ts",
  "**/*.mts",
  "**/*.cts",
  "**/*.tsx",
];

export const typstGlobs: string[] = ["**/*.typ"];

export const yamlGlobs: string[] = ["**/*.yaml", "**/*.yml"];
export const yamlExcludeGlobs: string[] = resolve(yamlExcludeProfile);

// Lefthook config files. Their command order is meaningful (execution order is
// by `priority`), so the `lefthook-sort` job owns their ordering — they are
// excluded from yq's alphabetical key sorter, which would otherwise scramble
// that order on every commit.
export const lefthookConfigGlobs: string[] = [
  "**/lefthook.y*ml",
  "**/.lefthook.y*ml",
  "**/.config/lefthook.y*ml",
];
