// delete-only configuration - removes deprecated config files without creating new ones
export const deprecatedConfigs: config.ConfigSetup = {
  deleteOnly: true,
  otherFileNameList: [
    ".babelrc",
    ".babelrc.js",
    "babel.config.js",
    ".lintstagedrc",
    ".lintstagedrc.json",
    ".lintstagedrc.yaml",
    ".lintstagedrc.yml",
    ".lintstagedrc.mjs",
    "lint-staged.config.mjs",
    ".lintstagedrc.cjs",
    "lint-staged.config.cjs",
    "lint-staged.config.js",
    ".lintstagedrc.js",
    ".husky",
    ".taplo.toml",
    "taplo.toml",
  ],
};
