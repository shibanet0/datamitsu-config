import nodeVersions from "../registries/nodeVersions.json";

export const prettierDeps = {
  "@prettier/plugin-xml": nodeVersions["@prettier/plugin-xml"].version,
  "prettier-plugin-embed": nodeVersions["prettier-plugin-embed"].version,
  "prettier-plugin-jsdoc": nodeVersions["prettier-plugin-jsdoc"].version,
  "prettier-plugin-sql": nodeVersions["prettier-plugin-sql"].version,
} as const;
