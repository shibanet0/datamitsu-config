/**
 * OCI bundle pin for the published config.
 *
 * The bundle digest only exists AFTER the release workflow has built and pushed the docker images,
 * but the config ships INSIDE those images and on npm from the same workflow — so the pin cannot
 * live in the source. Instead the release publish steps run scripts/inject-oci-pin.ts, which
 * replaces the placeholder below in the BUILT datamitsu.config.js with the freshly published bundle
 * reference.
 *
 * Everywhere else the placeholder survives and parses to `undefined`, so no `oci` key is emitted:
 * local builds, PR builds, and — deliberately — the config baked into the docker images themselves
 * (a bundle must not self-reference, and containers already carry the full store).
 */

// Replaced by scripts/inject-oci-pin.ts at publish time with a JSON string
// literal like {"digest":"sha256:…","ref":"ghcr.io/…"}.
const OCI_BUNDLE_PIN = "__DATAMITSU_OCI_BUNDLE_PIN__";

function parsePin(raw: string): undefined | { digest: string; ref: string } {
  try {
    return JSON.parse(raw) as { digest: string; ref: string };
  } catch {
    return undefined;
  }
}

export const ociBundle = parsePin(OCI_BUNDLE_PIN);
