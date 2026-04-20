import type { TypedFlatConfigItem } from "../types";

import { oxlintConfig } from "../../oxlint";

export async function oxlint(
  options:
    | undefined
    | {
        configFilePath?: string;
        disabled?: boolean;
      },
): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-oxlint");

  if (!options?.configFilePath) {
    const oxlintRules = plugin.default.buildFromOxlintConfig(
      oxlintConfig as Parameters<typeof plugin.default.buildFromOxlintConfig>[0],
    );

    return [...oxlintRules];
  }

  const oxlintRules = plugin.default.buildFromOxlintConfigFile(options.configFilePath);

  return [...oxlintRules];
}
