# OCI Bundle Seeding

Every release of this package also publishes its full tool store as an [OCI bundle](https://datamitsu.com/docs/guides/oci-bundles): a digest-pinned image on `ghcr.io` whose layers datamitsu can pull directly — no docker required. With seeding enabled, tools arrive as pre-installed store layers instead of being downloaded and built one by one, and a seeded store works fully offline.

Seeding is **opt-in**. The package ships two otherwise identical configs:

| File                           | `oci` pin                                                           | Use                                                 |
| ------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------- |
| `datamitsu.config.js`          | none                                                                | the default — tools download directly from upstream |
| `datamitsu.config.oci-ghcr.js` | `ghcr.io/shibanet0/datamitsu-config@sha256:…` of this exact release | opt-in bundle seeding                               |

The digest is coupled to the release it ships with: the bundle, the config, and the pin always come from the same build, so store paths match exactly.

## Enabling

Point your project config at the `oci-ghcr` variant instead of the default:

```ts title="datamitsu.config.ts"
function getBeforeConfigs() {
  return [{ path: "./node_modules/@shibanet0/datamitsu-config/datamitsu.config.oci-ghcr.js" }];
}
```

That is the only change. From then on:

```bash
pnpm dm check                       # missing tools seed from the bundle on demand
datamitsu store seed                # optional: pull the WHOLE bundle (airgap prep)
datamitsu store status              # what the bundle covers vs what needs the network
DATAMITSU_OFFLINE=1 pnpm dm check   # works offline once seeded
```

A bundle entry missing for your platform, or any network trouble, degrades gracefully: datamitsu warns and falls back to direct downloads. Integrity violations (content not matching the pinned digest) are fatal by design.

## Overriding the registry (mirrors, dependency proxies)

The `oci` declaration chains through config layers as a scalar — the last layer that sets it wins. To pull through a corporate mirror (GitLab Dependency Proxy, Harbor, …), override `ref` in your own config layer and keep the digest: content is verified against the digest chain, so the mirror needs **zero trust**.

```ts title="datamitsu.config.ts"
function getConfig(input) {
  return {
    ...input,
    oci: {
      ...input.oci,
      // mirror path; the digest from the variant config stays authoritative
      ref: "gitlab.example.com/my-group/dependency_proxy/containers/ghcr.io/shibanet0/datamitsu-config",
    },
  };
}
```

Config JS is sandboxed and cannot read environment variables, so registry selection is a config-layer decision; generate or template your root config if you need per-environment switching.

To disable seeding without touching configs: `--no-oci` on any command, or `DATAMITSU_NO_OCI=1`. To reset an inherited declaration entirely: `oci: undefined` in your layer.

## Air-gapped hosts

Seed the store while online, then run with the network off:

```bash
datamitsu store seed                                  # online machine, full pull
DATAMITSU_OFFLINE=1 pnpm dm check                     # air-gapped run
```

For a fully offline transfer, move the bundle as a standard OCI image layout (`crane pull --format=oci`, `oras copy`, `skopeo copy`) and import it:

```bash
datamitsu store import ./bundle-layout
```
