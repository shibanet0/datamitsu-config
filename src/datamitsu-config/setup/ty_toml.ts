// ty (Astral's Python type checker) config. Set rule severities under `[rules]`
// (error/warn/ignore) and module discovery under `[environment]`. ty.toml takes
// precedence over a `[tool.ty]` table in pyproject.toml.
export const tyToml: config.ConfigSetup = {
  content: (context) => {
    const data = TOML.parse(context.originalContent || "");

    return TOML.stringify({ ...data, rules: (data.rules as object) ?? {} });
  },
  otherFileNameList: [".ty.toml"],
  projectTypes: ["python-package"],
  scope: "project",
  tools: ["ty"],
};
