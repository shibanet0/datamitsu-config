import type { TypedFlatConfigItem } from "../types";

export async function reactPerf(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-react-perf");

  return [
    {
      name: "shibanet0/react-perf/rules",
      plugins: {
        "react-perf": plugin.default,
      },
      rules: {
        ...plugin.default.configs.flat.recommended.rules,
      },
    },
  ];
}
