// zizmor (GitHub Actions static analysis) config. Suppress findings under
// `rules.<audit-id>.ignore` (e.g. per-file or file:line); an empty `rules` map
// keeps every audit active at default sensitivity. See docs.zizmor.sh/configuration.
export const githubZizmorYml: config.ConfigSetup = {
  content: (context) => {
    const data = YAML.parse(context.originalContent || "") ?? {};

    return YAML.stringify({ ...data, rules: data.rules ?? {} });
  },
  otherFileNameList: [".github/zizmor.yaml", "zizmor.yml", "zizmor.yaml"],
  scope: "git-root",
  tools: ["zizmor"],
};
