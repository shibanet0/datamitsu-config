export const valeIni: config.ConfigSetup = {
  // https://vale.sh/docs/vale-ini
  // Built-in "Vale" style only (Vale.Spelling/Repetition/Terms) — no `vale sync`,
  // no StylesPath, no network. Keeps Vale deterministic and offline like the rest
  // of datamitsu. Add Packages/BasedOnStyles overrides per-project if richer styles
  // are wanted.
  content: (context) => {
    const existing = INI.toRecord(INI.parse(context.originalContent || ""));

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
    ];

    return INI.stringify(data);
  },
  otherFileNameList: ["_vale.ini", "vale.ini"],
  scope: "git-root",
  tools: ["vale"],
};
