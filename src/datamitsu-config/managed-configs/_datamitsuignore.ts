import { resolve } from "../../ignore/profile";
import { helmTemplatesProfile } from "../../ignore/profiles/helm-templates";

const yamlTools = ["sort-keys-yaml", "yamlfmt", "yamllint"];

export const datamitsuignore: config.ManagedConfig = {
  content: (context) => {
    const original = context.originalContent || "";
    const newline = original.includes("\r\n") ? "\r\n" : "\n";
    const lines = original.split(/\r?\n/);
    const missing = resolve(helmTemplatesProfile).filter(
      (pattern) =>
        !lines.some((line) => {
          const rule = line.split("#", 1)[0]!;
          const separator = rule.indexOf(":");
          if (separator === -1 || rule.slice(0, separator).trim() !== pattern) return false;
          const tools = rule
            .slice(separator + 1)
            .split(",")
            .map((tool) => tool.trim());
          return (
            tools.length === yamlTools.length && yamlTools.every((tool) => tools.includes(tool))
          );
        }),
    );
    if (missing.length === 0) return original;
    const separator = original && !original.endsWith("\n") ? newline : "";
    return (
      original +
      separator +
      missing.map((pattern) => `${pattern}: ${yamlTools.join(", ")}`).join(newline) +
      newline
    );
  },
  projectTypes: ["helm-chart"],
  scope: "project",
};
