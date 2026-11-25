const managedConfigDir = ".datamitsu";
const agentsBundleLinkRoot = "ai/agents";
export const preferredStackFile = "references/preferred-stack.md";
export const preferredStackLink = `${agentsBundleLinkRoot}/${preferredStackFile}`;
export const preferredStackProjectPath = `${managedConfigDir}/${preferredStackLink}`;

export const skillsBundleLinkRoot = "ai/skills";
export const skillInstructionsPath = (name: string) =>
  `${managedConfigDir}/${skillsBundleLinkRoot}/${name}/instructions.md`;
