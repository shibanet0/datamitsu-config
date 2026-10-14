export const bufYaml: config.ManagedConfig = {
  content: (context) => {
    const existing = YAML.parse(context.originalContent || "") || {};
    const version = existing.version || "v2";
    return YAML.stringify(
      merge(
        {
          breaking: { use: ["FILE"] },
          lint: { use: [version === "v2" ? "STANDARD" : "DEFAULT"] },
          version,
        },
        existing,
      ),
    );
  },
  projectTypes: ["protobuf-project"],
  scope: "project",
  tools: ["buf"],
};
