import { execa, type Options } from "execa";
import { fileURLToPath } from "node:url";

export const getDatamitsuBinary = () =>
  fileURLToPath(import.meta.resolve("../../bin/datamitsu.js"));

export const datamitsuExec = (appName: string, args?: string[], options?: Options) => {
  return execa(`${getDatamitsuBinary()}`, ["exec", appName, "--", ...(args || [])], options);
};
