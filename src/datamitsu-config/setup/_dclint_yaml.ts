// dclint (Docker Compose linter) config. An empty `rules` map keeps every rule at
// its default; set a rule to 0/1/2 (off/warning/error) to tune. YAML validity and
// Compose-schema checks always run regardless of this file.
export const dclintYaml: config.ConfigSetup = {
  content: (context) => {
    const data = YAML.parse(context.originalContent || "") ?? {};

    return YAML.stringify({ ...data, rules: data.rules ?? {} });
  },
  otherFileNameList: [
    ".dclint.yml",
    ".dclintrc",
    ".dclintrc.yaml",
    ".dclintrc.yml",
    ".dclintrc.json",
  ],
  scope: "git-root",
  tools: ["dclint"],
};
