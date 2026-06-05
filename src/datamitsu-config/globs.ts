export const dockerfileGlobs: string[] = ["**/Dockerfile", "**/Dockerfile.*", "**/*.dockerfile"];

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

export const jsonGlobs: string[] = ["**/*.json"];
export const jsonExcludeGlobs: string[] = ["**/package.json", "**/package-lock.json"];

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
  "**/*.yaml",
  "**/*.yml",
  "**/*.toml",
];

export const packageJsonGlobs: string[] = ["**/package.json"];

export const prettierGlobs: string[] = [...eslintGlobs, "**/*.d.ts", "**/*.md"];

export const propertiesGlobs: string[] = ["**/*.properties"];

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
export const yamlExcludeGlobs: string[] = ["**/pnpm-lock.yaml"];
