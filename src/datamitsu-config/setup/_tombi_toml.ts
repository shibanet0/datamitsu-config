export const tombiToml: config.ConfigSetup = {
  content: (context) => {
    const data = TOML.parse(context.originalContent || "");

    return TOML.stringify({
      ...data,
      "toml-version": "v1.1.0",
    });
  },
  otherFileNameList: ["tombi.toml", ".tombi.toml"],
  scope: "git-root",
  tools: ["tombi"],
};
