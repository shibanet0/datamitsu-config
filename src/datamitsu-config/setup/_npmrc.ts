export const npmrc: config.ConfigSetup = {
  content: () => {
    const m: Record<string, string> = {
      registry: "https://registry.npmjs.org/",
    };

    return (
      Object.entries(m)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .reduce<Array<string>>((acc, [key, value]) => {
          acc.push(`${key}=${value}`);
          return acc;
        }, [])
        .join("\n") + "\n"
    );
  },
  projectTypes: ["npm-package"],
  scope: "git-root",
};
