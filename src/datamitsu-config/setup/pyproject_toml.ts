export const pyprojectToml: config.ConfigSetup = {
  content: (context) => {
    const data = TOML.parse(context.originalContent || "");

    // Strip the managed `[tool.tombi]` table, and seed a baseline `[tool.deptry]`
    // (deptry reads its config only from pyproject.toml). `extend_exclude` keeps
    // deptry's dependency scan off test dirs — tune per project. Existing keys win.
    const { tombi: _tombi, ...rest } = (data.tool ?? {}) as Record<string, unknown>;

    return TOML.stringify({
      ...data,
      tool: {
        ...rest,
        deptry: { extend_exclude: ["tests"], ...(rest.deptry as object) },
      },
    });
  },
  projectTypes: ["python-package"],
};
