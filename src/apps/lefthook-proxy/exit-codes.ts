// cspell:ignore sysexits
/**
 * Exit codes the proxy adds on top of whatever upstream Lefthook returns. They start at the
 * sysexits.h range so they cannot be confused with a Lefthook command's own non-zero status.
 */

/**
 * The working tree could not be isolated, or could not be restored afterwards. Nothing was lost —
 * the transaction stash is retained and the recovery commands are printed — but the tree may be
 * missing the hidden changes until the backup is applied.
 */
export const restoreFailureExitCode = 70;

/**
 * The working tree is intact, but the installed Git hooks could not be re-pointed at the public
 * proxy. Hooks keep working; they just may call upstream Lefthook directly until the next
 * successful `lefthook install`, which means the next commit can run without isolation.
 */
export const hookBindingFailureExitCode = 71;

/**
 * Upstream Lefthook could not be found or could not be executed at all.
 */
export const upstreamMissingExitCode = 127;
