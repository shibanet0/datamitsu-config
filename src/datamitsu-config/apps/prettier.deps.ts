import fnmVersions from "../registries/fnmVersions.json";

export const prettierDeps = {
  "@prettier/plugin-xml": fnmVersions["@prettier/plugin-xml"].version,
  "prettier-plugin-embed": fnmVersions["prettier-plugin-embed"].version,
  "prettier-plugin-jsdoc": fnmVersions["prettier-plugin-jsdoc"].version,
  "prettier-plugin-sql": fnmVersions["prettier-plugin-sql"].version,
} as const;
