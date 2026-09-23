export const valeIni: config.ManagedConfig = {
  // https://vale.sh/docs/vale-ini
  // Built-in "Vale" style only (Vale.Spelling/Repetition/Terms) — no `vale sync`,
  // no StylesPath, no network. Keeps Vale deterministic and offline like the rest
  // of datamitsu. Add Packages/BasedOnStyles overrides per-project if richer styles
  // are wanted.
  content: (context) => {
    const sections = INI.parse(context.originalContent || "");
    const existing = INI.toRecord(sections);
    const managed = new Set(["*.{md,markdown}", "DEFAULT"]);

    const data: INI.SectionEntry[] = [
      {
        name: "DEFAULT",
        properties: {
          MinAlertLevel: "suggestion",
          ...existing["DEFAULT"],
        },
      },
      {
        name: "*.{md,markdown}",
        properties: {
          BasedOnStyles: "Vale",
          ...existing["*.{md,markdown}"],
        },
      },
      ...sections.filter((section) => !managed.has(section.name)),
    ];

    return INI.stringify(data);
  },
  ejectable: true,
  otherFileNameList: ["_vale.ini", "vale.ini"],
  scope: "git-root",
  tools: ["vale"],
};
