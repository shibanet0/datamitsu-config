export const pyprojectToml: config.ConfigSetup = {
  content: (context) => {
    const data = TOML.parse(context.originalContent || "");

    return TOML.stringify({
      ...data,
      tool: data.tool
        ? (() => {
            const { tombi, ...rest } = data.tool;
            return Object.keys(rest).length > 0 ? rest : undefined;
          })()
        : undefined,
    });
  },
  projectTypes: ["python-package"],
};
