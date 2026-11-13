export function resolveLayerSubtree(
  entry: { kind: string; subtree: string },
  storeRootRelative: string,
  rawName: string,
): string | undefined {
  const copyRoot = `${storeRootRelative}/${entry.subtree}/`;
  const name = rawName.replace(/^\.?\//, "");
  if (!name.startsWith(copyRoot)) return undefined;

  const relative = name.slice(copyRoot.length);
  if (entry.kind === "python-data") {
    const pythonRoot = /^([0-9a-f]{32})\/python(?:\/|$)/.exec(relative);
    return pythonRoot ? `${entry.subtree}/${pythonRoot[1]}/python` : undefined;
  }

  const child = relative.split("/")[0];
  return child ? `${entry.subtree}/${child}` : undefined;
}
