export const gitleaksToml: config.ConfigSetup = {
  content: (context) => {
    const data = TOML.parse(context.originalContent || "");

    const MANAGED_EXTEND_PATH = ".datamitsu/gitleaks-managed.toml";

    // oxlint-disable-next-line unicorn/consistent-function-scoping
    const isPlainObject = (value: unknown): value is Record<string, unknown> =>
      typeof value === "object" && value !== null && !Array.isArray(value);

    const existingExtend: Record<string, unknown> = isPlainObject(data.extend) ? data.extend : {};

    // Seed a title only if the user hasn't set one. Preserve whatever they typed.
    const title: string =
      typeof data.title === "string" && data.title.length > 0
        ? data.title
        : "Custom Gitleaks configuration";

    return TOML.stringify({
      ...data,
      extend: {
        ...existingExtend,
        path: MANAGED_EXTEND_PATH,
      },
      title,
      useDefault: undefined,
    });
  },
  otherFileNameList: ["gitleaks.toml"],
  scope: "git-root",
  tools: ["gitleaks"],
};
