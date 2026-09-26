// zizmor (GitHub Actions static analysis) config. Suppress findings under
// `rules.<audit-id>.ignore` (e.g. per-file or file:line); an audit not named in `rules`
// runs at default sensitivity. See docs.zizmor.sh/configuration.
export const githubZizmorYml: config.ManagedConfig = {
  content: (context) => {
    const data = YAML.parse(context.originalContent || "") ?? {};

    // `self-repository` (zizmor 1.30) asks for `uses: $/…` instead of `uses: ./…`, and actionlint,
    // which runs by default, rejects `$/` until rhysd/actionlint#711 lands: a project that enables
    // zizmor would fail one tool or the other. Off until then; a project's own entry still wins.
    const rules = { "self-repository": { disable: true }, ...data.rules };

    return YAML.stringify({ ...data, rules });
  },
  otherFileNameList: [".github/zizmor.yaml", "zizmor.yml", "zizmor.yaml"],
  scope: "git-root",
  tools: ["zizmor"],
};
