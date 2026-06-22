export const hadolintYaml: config.ConfigSetup = {
  content: (context) => {
    const data = YAML.parse(context.originalContent || "");

    return YAML.stringify({
      ...data,
    });
  },
  otherFileNameList: [
    ".hadolint.yaml",
    "hadolint.yaml",
    ".config/hadolint.yaml",
    ".hadolint/hadolint.yaml",
  ],
  scope: "git-root",
  tools: ["hadolint"],
};
