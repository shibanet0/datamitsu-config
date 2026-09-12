export { fixtureEnvironment } from "../../test-support/env";

export function testUpstream(): string | undefined {
  return process.env.DATAMITSU_TEST_LEFTHOOK_UPSTREAM;
}
