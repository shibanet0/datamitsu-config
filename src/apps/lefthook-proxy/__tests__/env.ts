import { proxyEnvironment } from "../env.js";

export { fixtureEnvironment } from "../../test-support/env";

export function testUpstream(managedEnvironment: NodeJS.ProcessEnv): string | undefined {
  return (
    process.env.DATAMITSU_TEST_LEFTHOOK_UPSTREAM ?? proxyEnvironment(managedEnvironment).upstream
  );
}
