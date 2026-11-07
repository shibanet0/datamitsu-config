/**
 * Worktrunk (`wt`) project config. One post-start hook carries the invoking worktree's warm
 * datamitsu cache into the worktree `wt switch --create` just made: a new worktree is a new
 * absolute root, so without this its first lint run is cold even at the same commit.
 *
 * The hook runs in the new worktree with `{{ base_worktree_path }}` bound to the base it was
 * created from — exactly the root `datamitsu cache copy --source` wants. The path is passed as a
 * positional argument rather than interpolated into the shell body: wt substitutes template
 * variables before the shell parses the command, so a path with spaces would otherwise split into
 * several arguments.
 *
 * Post-start is background and once-per-worktree, which is the shape datamitsu's copy wants: it
 * takes ~20 ms and never blocks. wt asks the project to approve its commands on first run; the
 * approval is remembered per command.
 */
export const HOOK_NAME = "datamitsu-cache-copy";

export const HOOK_COMMAND =
  "sh -c 'datamitsu cache copy --source \"$1\"' sh '{{ base_worktree_path }}'";

export const wtToml: config.ManagedConfig = {
  content: (context) => {
    const data = TOML.parse(context.originalContent || "");
    const existing = data["post-start"];

    return TOML.stringify({
      ...data,
      "post-start": {
        ...(typeof existing === "object" && existing !== null ? existing : {}),
        [HOOK_NAME]: HOOK_COMMAND,
      },
    });
  },
  // wt reads the project config from the worktree a command runs in; the hook belongs to the
  // repository, not to a single package.
  scope: "git-root",
};
