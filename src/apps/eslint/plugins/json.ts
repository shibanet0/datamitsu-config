import type { TypedFlatConfigItem } from "../types";

export async function json(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-json");

  return [
    // {
    //   files: ["**/*.json"],
    //   ...json.configs["recommended"],
    // },
    // {
    //   files: ["**/tsconfig*.json"],
    //   rules: {
    //     "json/*": ["error", { allowComments: true }],
    //   },
    // },

    {
      name: "shibanet0/json/rules",
      plugins: {
        json: plugin.default,
      },
      rules: {
        ...plugin.default.configs.recommended.rules,
      },
    },
  ];
}
