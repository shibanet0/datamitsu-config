import type { TypedFlatConfigItem } from "../types";

import { oxlintConfig } from "../../oxlint";

/**
 * Eslint-plugin-oxlint emits its "already covered by oxlint" turn-offs under the rule names of the
 * original ESLint plugins. Two of those plugins were swapped for forks that keep the rule names but
 * change the prefix, so the emitted names have to be rewritten or the duplicate suppression
 * silently stops matching and diagnostics get reported twice.
 *
 * `react/*` is deliberately not remapped: @eslint-react renamed the rules themselves, not just the
 * prefix, so there is no mechanical mapping.
 */
const PREFIX_REMAP: Record<string, string> = {
  "import/": "import-x/",
  "jsx-a11y/": "jsx-a11y-x/",
};

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

    return remapPrefixes([...oxlintRules]);
  }

  const oxlintRules = plugin.default.buildFromOxlintConfigFile(options.configFilePath);

  return remapPrefixes([...oxlintRules]);
}

function remapPrefixes(configs: TypedFlatConfigItem[]): TypedFlatConfigItem[] {
  return configs.map((config) => {
    if (!config.rules) {
      return config;
    }

    const rules: NonNullable<TypedFlatConfigItem["rules"]> = {};

    for (const [name, entry] of Object.entries(config.rules)) {
      const prefix = Object.keys(PREFIX_REMAP).find((p) => name.startsWith(p));

      rules[prefix ? PREFIX_REMAP[prefix] + name.slice(prefix.length) : name] = entry;
    }

    return { ...config, rules };
  });
}
