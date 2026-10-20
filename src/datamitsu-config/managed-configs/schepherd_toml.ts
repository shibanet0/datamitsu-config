import catalog from "../registries/schepherdCatalog.json";
import { plainKeysFirst } from "./droast_toml";

/**
 * The validator is taken from `JSONSCHEMA_BIN`, which the schepherd app binds to the managed
 * `jsonschema`. `--continue` because the validator otherwise stops at the first invalid document of
 * a batch and the rest of the files of that schema go unreported.
 */
const runner: Record<string, unknown> = {
  args: ["validate", "--json", "--continue", "{schema}", "{files...}"],
  command: "${JSONSCHEMA_BIN}",
  jobs: 4,
  mode: "batch",
};

export const schepherdToml: config.ManagedConfig = {
  /**
   * The digest always comes from this package: the operation's globs are generated from that exact
   * catalog, so a project pinning another one would hand the validator files nothing matches, and
   * miss files its catalog does. The repository is the project's to change — a mirror keeps the
   * catalog digest — and so is everything else, `[[mappings]]` and `[schemas]` included.
   */
  content: (context) => {
    const data = TOML.parse(context.originalContent || "") as Record<string, unknown>;
    const projectCatalog = (data.catalog ?? {}) as Record<string, unknown>;
    const projectRunner = (data.runner ?? {}) as Record<string, unknown>;

    return TOML.stringify(
      plainKeysFirst({
        ...data,
        catalog: {
          digest: catalog.digest,
          repository: projectCatalog.repository ?? catalog.repository,
        },
        config_version: 1,
        runner: plainKeysFirst({ ...runner, ...projectRunner }),
      }),
    );
  },
  ejectable: true,
  scope: "git-root",
  tools: ["schepherd"],
};
