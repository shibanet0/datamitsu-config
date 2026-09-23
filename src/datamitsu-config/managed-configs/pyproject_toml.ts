import { indentSettings } from "../constants";

export const pyprojectToml: config.ManagedConfig = {
  content: (context) => {
    const data = TOML.parse(context.originalContent || "");

    // Strip the managed `[tool.tombi]` table, and seed a baseline `[tool.deptry]`
    // (deptry reads its config only from pyproject.toml). `extend_exclude` keeps
    // deptry's dependency scan off test dirs — tune per project. Existing keys win.
    const { tombi: _tombi, ...rest } = (data.tool ?? {}) as Record<string, unknown>;

    /**
     * Ruff reads its settings from here, and without them it used its own defaults — 88 columns and
     * four-space indentation — while every other formatter in the toolchain took its width and
     * indent from `indentSettings`. A repository with both Python and TypeScript therefore wrapped
     * at two different widths with nothing saying so.
     *
     * Only the two shared values, and only as a seed: a project that sets its own keeps them, the
     * same way every other table here behaves.
     */
    const ruff = {
      "indent-width": indentSettings.indentWidth,
      "line-length": indentSettings.lineWidth,
      ...(rest.ruff as object),
    };

    return TOML.stringify({
      ...data,
      tool: {
        ...rest,
        deptry: { extend_exclude: ["tests"], ...(rest.deptry as object) },
        ruff,
      },
    });
  },
  projectTypes: ["python-package"],
};
