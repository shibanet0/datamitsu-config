/**
 * OCI bundle pin slot.
 *
 * The DEFAULT published config never carries a pin: the placeholder below parses to `undefined`, so
 * no `oci` key is emitted and store seeding stays opt-in. At release time scripts/inject-oci-pin.ts
 * produces the SEPARATE `datamitsu.config.oci-ghcr.js` variant — a copy of the built default with
 * the placeholder replaced by the freshly published ghcr.io bundle reference. Consumers enable
 * seeding by pointing getBeforeConfigs() at that variant (see docs/get-started/oci-bundle.md), and
 * can override the `oci` key in their own config layer (e.g. to pull through a corporate registry
 * mirror — the digest stays the same, so verification is unaffected).
 *
 * The config baked into the docker images keeps the placeholder too: a bundle must not
 * self-reference, and containers already carry the full store.
 */

// Replaced by scripts/inject-oci-pin.ts in the oci variant with a JSON string
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
