import { execa, type Options, type ResultPromise } from "execa";
import { fileURLToPath } from "node:url";

export const getDatamitsuBinary = () =>
  fileURLToPath(import.meta.resolve("../../bin/datamitsu.js"));

export const datamitsuExec = <OptionsType extends Options = {}>(
  appName: string,
  args?: string[],
  options?: OptionsType,
): ResultPromise<OptionsType> => {
  // Execa's internal option merge type is not assignable with exact optional properties.
  return execa(
    `${getDatamitsuBinary()}`,
    ["exec", appName, "--", ...(args || [])],
    options,
  ) as unknown as ResultPromise<OptionsType>;
};
