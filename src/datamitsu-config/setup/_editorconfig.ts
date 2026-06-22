import { indentSettings } from "../constants";

export const editorconfig: config.ConfigSetup = {
  content: (context) => {
    // https://editorconfig.org
    // https://github.com/editorconfig/editorconfig/wiki/EditorConfig-Properties
    const existing = INI.toRecord(INI.parse(context.originalContent || ""));

    // const baseParams: Record<string, string> = {
    //   indent_style: "tab",
    //   indent_size: "2",
    //   end_of_line: "lf",
    //   charset: "utf-8",
    //   max_line_length: "120",
    //   insert_final_newline: "true",
    //   trim_trailing_whitespace: "true",
    // };

    const data: INI.SectionEntry[] = [
      {
        name: "DEFAULT",
        properties: { root: "true" },
      },
      {
        name: "*",
        properties: {
          charset: "utf8",
          end_of_line: "lf",
          indent_size: String(indentSettings.indentWidth),
          insert_final_newline: "true",
          trim_trailing_whitespace: "true",
          ...existing["*"],
        },
      },
      // {
      //   name: "*",
      //   properties: { ...existing["*"], ...baseParams },
      // },
      // {
      //   name: "*.go",
      //   properties: {
      //     ...existing["*.go"],
      //     ...baseParams,
      //     indent_size: "2",
      //   },
      // },
      // {
      //   name: "*.{js,cjs,mjs,ts,cts,mts,tsx,ctsx,mtsx,scss}",
      //   properties: {
      //     ...existing["*.{js,cjs,mjs,ts,cts,mts,tsx,ctsx,mtsx,scss}"],
      //     ...baseParams,
      //     quote_type: "double",
      //   },
      // },
      // {
      //   name: "*.{kt,kts}",
      //   properties: {
      //     ...existing["*.{kt,kts}"],
      //     ...baseParams,
      //     indent_size: "2",
      //   },
      // },
      // {
      //   name: "*.md",
      //   properties: {
      //     ...existing["*.md"],
      //     indent_style: "space",
      //     trim_trailing_whitespace: "false",
      //   },
      // },
      {
        name: "GNUmakefile",
        properties: {
          indent_size: String(indentSettings.indentWidth),
          indent_style: "tab",
          ...existing["GNUmakefile"],
        },
      },
      {
        name: "Makefile",
        properties: {
          indent_size: String(indentSettings.indentWidth),
          indent_style: "tab",
          ...existing["Makefile"],
        },
      },
      // {
      //   name: "COMMIT_EDITMSG",
      //   properties: { ...existing["COMMIT_EDITMSG"], max_line_length: "0" },
      // },
      // {
      //   name: "*.{yml,yaml,json}",
      //   properties: {
      //     ...existing["*.{yml,json}"],
      //     indent_style: "space",
      //     indent_size: "2",
      //   },
      // },
    ];

    return INI.stringify(data);
  },
  scope: "git-root",
  tools: ["editorconfig-checker"],
};
