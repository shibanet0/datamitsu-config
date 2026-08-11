// pinact config (v3 schema). `files` selects which workflow/action files get their
// action refs pinned to commit SHAs; add `ignore`/`min_age` rules to tune. See
// github.com/suzuki-shunsuke/pinact/blob/main/docs/config.md.
export const pinactYaml: config.ConfigSetup = {
  content: (context) => {
    const data = YAML.parse(context.originalContent || "") ?? {};

    return YAML.stringify({
      files: data.files ?? [
        { pattern: ".github/workflows/*.yml" },
        { pattern: ".github/workflows/*.yaml" },
        { pattern: ".github/actions/*/action.yml" },
        { pattern: ".github/actions/*/action.yaml" },
      ],
      version: 3,
      ...data,
    });
  },
  otherFileNameList: ["pinact.yaml", ".pinact.yml", "pinact.yml"],
  scope: "git-root",
  tools: ["pinact"],
};
