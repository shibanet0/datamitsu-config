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

// ty type-checks Python sources, stubs, and Jupyter notebooks (NOT markdown —
// ty's markdown support is only its internal `mdtest` format, not a user input).
export const tyGlobs: string[] = ["**/*.py", "**/*.pyi", "**/*.ipynb"];

export const dotenvLinterGlobs: string[] = ["**/*.env", "**/.env", "**/*.env.*", "**/.env.*"];

export const eslintGlobs: string[] = [
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

// oxfmt formats by file type, independent of project type. Covers the languages
// oxfmt supports out of the box (https://oxc.rs/compatibility.html). Svelte and
// Astro are intentionally omitted — they require extra deps/plugins to format.
// YAML is omitted because yamlfmt owns it: the two disagree on flow-mapping spacing (`{ a: 1 }`
// against `{a: 1}`, which yq's key sorter also writes), so with both on a file `dm fix` leaves one
// form and the other's check fails.
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
  "**/*.html",
  "**/*.vue",
  "**/*.graphql",
  "**/*.gql",
  "**/*.md",
  "**/*.mdx",
  "**/*.toml",
];

export const packageJsonGlobs: string[] = ["**/package.json"];

export const prettierGlobs: string[] = [...eslintGlobs, "**/*.d.ts", "**/*.md"];

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
