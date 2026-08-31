import type { TypedFlatConfigItem } from "../types";

export async function perfectionist(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-perfectionist");

  return [
    {
      name: "shibanet0/perfectionist/rules",
      plugins: {
        perfectionist: plugin.default,
      },
      rules: {
        ...plugin.default.configs["recommended-natural"].rules,
        "perfectionist/sort-imports": [
          "error",
          {
            customGroups: [
              {
                elementNamePattern: ["^i18next$", "^i18next-.+"],
                groupName: "i18next",
              },
              {
                elementNamePattern: [
                  "^react$",
                  "^react-.+",
                  "^@react-.+",
                  "^swr$",

                  "^next$",
                  "^next/.+",
                  "^next-.+",
                  "^@next-.+",
                ],
                groupName: "react",
              },
              {
                elementNamePattern: ["^antd$", "^@ant-design.+"],
                groupName: "antd",
              },
              {
                elementNamePattern: [
                  "^fastify$",
                  "^@fastify.+",
                  "^@sinclair/typebox$",
                  "^typebox$",
                ],
                groupName: "fastify",
              },
              // {
              //   elementNamePattern: [
              //     String.raw`.+\.avif$`,
              //     String.raw`.+\.webp$`,
              //     String.raw`.+\.svg$`,
              //     String.raw`.+\.png$`,
              //     String.raw`.+\.jpg$`,
              //     String.raw`.+\.jpeg$`,
              //     String.raw`.+\.gif$`,
              //   ],
              //   groupName: "media/images",
              // },
            ],
            groups: [
              "i18next",
              "react",
              "antd",
              "fastify",
              // "media/images",

              "type-import",
              ["value-builtin", "value-external"],
              "type-internal",
              "value-internal",
              ["type-parent", "type-sibling", "type-index"],
              ["value-parent", "value-sibling", "value-index"],
              "ts-equals-import",
              "unknown",
            ],
            order: "asc",
            type: "alphabetical",
          },
        ],
      },
    },
    {
      rules: {
        // "perfectionist/sort-objects": "off",
        // "perfectionist/sort-variable-declarations": "off",
        // "perfectionist/sort-jsx-props": "off",
        // "perfectionist/sort-modules": "off",
        // "perfectionist/sort-classes": "off",
        // "perfectionist/sort-enums": "off",
      },
    },
    // After the general rules, not before: that block spreads `recommended-natural`, which switches
    // sort-objects on, so an exception placed ahead of it was silently overridden — flat config is
    // last-one-wins. A vanilla-extract style object is a CSS rule written as an object literal, and
    // vanilla-extract/concentric-order orders it the way stylesheets are read (outside in). Two
    // orderings of the same braces cannot both hold; this is the file type where the CSS one does.
    {
      files: ["**/*.css.ts"],
      name: "shibanet0/perfectionist/vanilla-extract/rules",
      plugins: {
        perfectionist: plugin.default,
      },
      rules: {
        "perfectionist/sort-objects": "off",
      },
    },
  ];
}
