export const tombiToml: config.ManagedConfig = {
  content: (context) => {
    const data = TOML.parse(context.originalContent || "");

    return TOML.stringify(
      merge(
        {
          "toml-version": "v1.1.0",
        },
        data,
      ),
    );
  },
  otherFileNameList: ["tombi.toml", ".tombi.toml"],
  scope: "git-root",
  tools: ["tombi"],
};
