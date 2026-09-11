import type { TypedFlatConfigItem } from "../types";

export async function react(
  options:
    | undefined
    | {
        disabled?: boolean;
        version?: string;
      },
): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("@eslint-react/eslint-plugin");

  const recommended = plugin.default.configs.recommended;

  return [
    {
      ...recommended,
      name: "s0/react/rules",
      settings: {
        ...recommended.settings,
        "react-x": {
          ...(recommended.settings?.["react-x"] as Record<string, unknown> | undefined),
          version: options?.version || "detect",
        },
      },
    },
    {
      rules: {
        // These rules also ship in eslint-plugin-react-hooks, which stays the
        // authority for hook diagnostics — keep them off here to avoid double
        // reporting. @eslint-react offers the mirror preset
        // `disable-conflict-eslint-plugin-react-hooks` for the opposite choice.
      },
    },
  ];
}
