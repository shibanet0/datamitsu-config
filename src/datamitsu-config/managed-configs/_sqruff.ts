// sqruff SQL config (INI). `dialect` is required — default to ANSI; switch to
// postgres/mysql/sqlite/etc. and add `[sqruff:...]` sections (rules, indentation)
// to tune. Existing sections/keys are preserved on reconcile.
export const sqruff: config.ManagedConfig = {
  content: (context) => {
    const existing = INI.toRecord(INI.parse(context.originalContent || ""));

    return INI.stringify([
      {
        name: "sqruff",
        properties: { dialect: "ansi", ...existing["sqruff"] },
      },
    ]);
  },
  otherFileNameList: [".sqruffignore"],
  scope: "git-root",
  tools: ["sqruff"],
};
