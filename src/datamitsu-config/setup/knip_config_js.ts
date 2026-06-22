import { env } from "../env";

export const knipConfigJs: config.ConfigSetup = {
  content: (context) => {
    return [
      `import { defineConfig } from "${tools.Path.forImport(
        tools.Path.join(context.datamitsuDir, "knip.config.js"),
      )}";`,
      "",
      `export default defineConfig(${
        env().DATAMITSU_DEV_MODE
          ? JSON.stringify(
              {
                ignoreBinaries: ["bin/datamitsu.js"],
                ignoreDependencies: [
                  "@commitlint/cli",
                  "syncpack",
                  "type-fest",
                  "@octokit/rest",
                  "publint",
                  "sort-package-json",
                  "eslint-config-prettier",
                  "eslint-plugin-array-func",
                  "eslint-plugin-import",
                  "eslint-plugin-json",
                  "eslint-plugin-json-schema-validator",
                  "eslint-plugin-jsx-a11y",
                  "eslint-plugin-n",
                  "eslint-plugin-no-use-extend-native",
                  "eslint-plugin-perfectionist",
                  "eslint-plugin-playwright",
                  "eslint-plugin-promise",
                  "eslint-plugin-react",
                  "eslint-plugin-react-hooks",
                  "eslint-plugin-react-perf",
                  "prettier-plugin-embed",
                  "prettier-plugin-jsdoc",
                  "prettier-plugin-sql",
                  "eslint-plugin-react-prefer-function-component",
                  "eslint-plugin-react-refresh",
                  "eslint-plugin-security",
                  "eslint-plugin-sonarjs",
                  "eslint-plugin-storybook",
                  "eslint-plugin-turbo",
                  "@prettier/plugin-xml",
                  "eslint-plugin-unicorn",
                  "eslint-plugin-unused-imports",
                  "@antebudimir/eslint-plugin-vanilla-extract",
                ],
              },
              null,
              2,
            )
          : ""
      });`,
      "",
    ].join("\n");
  },
  otherFileNameList: [
    "knip.json",
    "knip.jsonc",
    ".knip.json",
    ".knip.jsonc",
    "knip.ts",
    "knip.js",
    "knip.config.ts",
    "knip.config.js",
  ],
  projectTypes: ["npm-package"],
  scope: "git-root",
  tools: ["knip"],
};
