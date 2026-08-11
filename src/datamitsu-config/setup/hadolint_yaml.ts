export const hadolintYaml: config.ConfigSetup = {
  content: (context) => {
    const data = YAML.parse(context.originalContent || "");

    return YAML.stringify(
      Object.fromEntries(
        Object.entries({
          ...data,
          // hadolint exits non-zero on a finding of ANY severity by default, so a
          // new info- or style-level rule in a hadolint release breaks the build on
          // Dockerfiles nobody touched: 2.15.0 added DL3066 ("Non-numeric user-id"),
          // which flags every `USER root`. Gate the exit code on warning and above
          // — advisory rules stay reportable without turning a tool bump into a
          // build failure.
          "failure-threshold": "warning",
        }).sort(([a], [b]) => a.localeCompare(b)),
      ),
    );
  },
  otherFileNameList: [
    ".hadolint.yaml",
    "hadolint.yaml",
    ".config/hadolint.yaml",
    ".hadolint/hadolint.yaml",
  ],
  scope: "git-root",
  tools: ["hadolint"],
};
