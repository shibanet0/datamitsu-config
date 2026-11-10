import catalog from "../registries/schepherdCatalog.json";
import {
  schepherdDefaultProcessorOrder as defaultProcessors,
  schepherdDefaultProcessors as processors,
} from "../schepherd-processors";
import { plainKeysFirst } from "./droast_toml";

const legacyRunner = {
  args: ["validate", "--json", "--continue", "{schema}", "{files...}"],
  command: "${JSONSCHEMA_BIN}",
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
    const hasBases = Array.isArray(data.extends) && data.extends.length > 0;
    const hasProcessors = data.processors !== undefined || projectRunner.processors !== undefined;
    const hasLegacyRunner = ["command", "args", "mode"].some((key) => key in projectRunner);
    const effectiveLegacyRunner =
      !hasBases && !hasProcessors ? { ...legacyRunner, ...projectRunner } : projectRunner;
    const isManagedLegacyRunner =
      effectiveLegacyRunner.command === legacyRunner.command &&
      effectiveLegacyRunner.mode === legacyRunner.mode &&
      Array.isArray(effectiveLegacyRunner.args) &&
      effectiveLegacyRunner.args.length === legacyRunner.args.length &&
      effectiveLegacyRunner.args.every((arg, index) => arg === legacyRunner.args[index]);
    const migrateLegacyRunner = isManagedLegacyRunner && (!hasBases || hasProcessors);
    const seedProcessors = !hasBases && !hasProcessors && (!hasLegacyRunner || migrateLegacyRunner);
    const runner: Record<string, unknown> = {
      ...(!hasBases && !hasProcessors && hasLegacyRunner && !migrateLegacyRunner
        ? legacyRunner
        : {}),
      jobs: 4,
      ...projectRunner,
    };

    if (hasProcessors && hasLegacyRunner && !isManagedLegacyRunner) {
      throw new Error(
        "schepherd.toml: custom runner.command/args/mode cannot coexist with processors; move the legacy command into a custom processor or remove the processor configuration",
      );
    }

    if (migrateLegacyRunner) {
      delete runner.command;
      delete runner.args;
      delete runner.mode;
    }

    if (seedProcessors) {
      runner.processors = defaultProcessors;
    }

    return TOML.stringify(
      plainKeysFirst({
        ...data,
        catalog: {
          ...projectCatalog,
          digest: catalog.digest,
          repository: projectCatalog.repository ?? catalog.repository,
        },
        config_version: 1,
        ...(seedProcessors ? { processors: { ...processors } } : {}),
        runner: plainKeysFirst(runner),
      }),
    );
  },
  ejectable: true,
  scope: "git-root",
  tools: ["schepherd"],
};
