// mdsf formats code blocks inside Markdown using external formatters. Map each
// language to the formatter(s) to run under `languages`; an empty map falls back
// to mdsf's built-in defaults. Any referenced formatter must be on PATH.
export const mdsfJson: config.ConfigSetup = {
  content: (context) => {
    const data = JSON.parse(context.originalContent || "{}");

    return `${JSON.stringify({ ...data, languages: data.languages ?? {} }, null, 2)}\n`;
  },
  otherFileNameList: ["mdsf.toml", "mdsf.yaml"],
  scope: "git-root",
  tools: ["mdsf"],
};
