import type { TypedFlatConfigItem } from "../types";

export async function boundaries(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-boundaries");

  return [
    {
      plugins: { boundaries: plugin.default },
      settings: {
        // "boundaries/elements": [
        //   { type: "controllers", pattern: "controllers/*" },
        //   { type: "models", pattern: "models/*" },
        //   { type: "views", pattern: "views/*" }
        // ]
      },
    },
  ];
}
