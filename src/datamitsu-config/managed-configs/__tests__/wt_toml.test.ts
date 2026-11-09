import { afterEach, describe, expect, it, vi } from "vitest";

import { HOOK_COMMAND, HOOK_NAME, wtToml } from "../wt_toml";

const stubToml = (value: Record<string, unknown>) => {
  vi.stubGlobal("TOML", {
    parse: () => structuredClone(value),
    stringify: (written: Record<string, unknown>) => JSON.stringify(written),
  });
};

const render = () =>
  JSON.parse(wtToml.content!({ originalContent: "ignored" } as never)!) as Record<string, unknown>;

describe("wt project configuration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("adds the cache-copy hook to a repository without one", () => {
    stubToml({ "list.full": true });
    const written = render();
    expect(written["list.full"]).toBe(true);
    const hooks = written["post-start"] as Record<string, string>;
    expect(hooks[HOOK_NAME]).toBe(HOOK_COMMAND);
  });

  it("keeps the project's own post-start commands", () => {
    stubToml({ "post-start": { [HOOK_NAME]: "tampered", server: "npm run dev" } });
    const written = render();
    const hooks = written["post-start"] as Record<string, string>;
    expect(hooks.server).toBe("npm run dev");
    expect(hooks[HOOK_NAME]).toBe(HOOK_COMMAND);
  });

  it("replaces a non-table post-start value with the hook table", () => {
    stubToml({ "post-start": "legacy string form" });
    const written = render();
    const hooks = written["post-start"] as Record<string, string>;
    expect(hooks[HOOK_NAME]).toBe(HOOK_COMMAND);
  });
});
