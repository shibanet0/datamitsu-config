// sqruff SQL config (INI). `dialect` is required — default to ANSI; switch to
// postgres/mysql/sqlite/etc. and add `[sqruff:...]` sections (rules, indentation)
// to tune. Existing sections/keys are preserved on reconcile.
export const sqruff: config.ManagedConfig = {
  content: (context) => {
    const sections = INI.parse(context.originalContent || "");
    const existing = INI.toRecord(sections);

    return INI.stringify([
      {
        name: "sqruff",
        properties: { dialect: "ansi", ...existing["sqruff"] },
      },
      ...sections.filter((section) => section.name !== "sqruff"),
    ]);
  },
  ejectable: true,
  scope: "git-root",
  tools: ["sqruff"],
};
