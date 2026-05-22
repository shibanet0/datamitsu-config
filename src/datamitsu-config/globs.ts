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
