import type { TypedFlatConfigItem } from "../types";

export async function html(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-html");

  return [
    {
      files: ["**/*.html"],
      plugins: { html: plugin.default },
      settings: {
        "html/html-extensions": [".html"], // consider .html and .we files as HTML
      },
    },
  ];
}
