/**
 * WorkTrunk runs the recorded launcher in the new worktree. Its dependency binaries can resolve
 * from the base worktree before the new worktree has installed dependencies.
 */
export const HOOK_NAME = "datamitsu-cache-copy";

const quoteShell = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

export const wtHookCommand = (binaryCommand: string): string =>
  `sh -c ${quoteShell(`PATH="$1/node_modules/.bin:$PATH" ${binaryCommand} cache copy --source "$1"`)} sh {{ base_worktree_path }}`;

export const wtToml: config.ManagedConfig = {
  content: (context) => {
    const data = TOML.parse(context.originalContent || "");
    const existing = data["post-start"];
    const managedHook = { [HOOK_NAME]: wtHookCommand(facts().binaryCommand) };
    const commands = typeof existing === "string" ? { project: existing } : existing;
    let postStart: unknown;
    if (Array.isArray(commands)) {
      const steps = commands.map((step: Record<string, unknown>) =>
        HOOK_NAME in step ? { ...step, ...managedHook } : step,
      );
      if (commands.every((step: Record<string, unknown>) => !(HOOK_NAME in step))) {
        const lastIndex = steps.length - 1;
        if (lastIndex < 0) steps.push(managedHook);
        else steps[lastIndex] = { ...steps[lastIndex], ...managedHook };
      }
      postStart = steps;
    } else {
      postStart = { ...commands, ...managedHook };
    }

    return TOML.stringify({
      ...data,
      "post-start": postStart,
    });
  },
  // wt reads the project config from the worktree a command runs in; the hook belongs to the
  // repository, not to a single package.
  scope: "git-root",
};
