// ===========================================
// CATALOGUE AUTH (token gate)
// ===========================================
// Used by both /catalogo (HTML) and /api/catalogue (JSON) to enforce
// the same access control: requests must include CATALOGO_ACCESS_KEY
// either as the `?key=` query param OR as the `x-catalogo-key` header.
//
// SECURITY MODEL:
//   - The catalogue is intended for AI agents that you explicitly
//     authorize. It's NOT for the public.
//   - If CATALOGO_ACCESS_KEY is unset in env, the gate is DISABLED
//     and both endpoints behave as public. This is intentionally
//     permissive during local dev — set the env var in production.
//   - When the env var IS set, requests without a matching key get
//     a 404 (not 401) so the existence of the endpoint is hidden.

/**
 * Check whether the current request is authorized to access the catalogue.
 *
 * Returns true if:
 *   - CATALOGO_ACCESS_KEY is unset (dev mode — gate disabled), OR
 *   - The request includes `?key=VALUE` matching the env var, OR
 *   - The request includes `x-catalogo-key: VALUE` header matching.
 *
 * Returns false otherwise.
 */
export function isCatalogueAuthorized(params: {
  queryKey?: string | null;
  headerKey?: string | null;
}): boolean {
  const expected = process.env.CATALOGO_ACCESS_KEY;

  // Gate disabled — no key configured. Allow all access.
  // (In production, ALWAYS set CATALOGO_ACCESS_KEY to enable the gate.)
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[Catalogue] CATALOGO_ACCESS_KEY is not set in production — " +
          "catalogue endpoints are PUBLIC. Set the env var to enable the gate.",
      );
    }
    return true;
  }

  // Constant-time-ish comparison to avoid trivial timing attacks.
  // (Not a true constant-time impl, but good enough for a token gate
  // where the key is a long random string and the attack surface is
  // limited to "can you guess the key".)
  const provided = params.queryKey || params.headerKey;
  if (!provided) return false;
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Generate a fresh random access key suitable for CATALOGO_ACCESS_KEY.
 * Run this once and paste the output into your .env.local / Netlify env var.
 *
 *   bun run -e 'import { generateCatalogueKey } from "./src/lib/catalogue-auth"; console.log(generateCatalogueKey())'
 *
 * Or simpler — just use `openssl rand -hex 32` from the shell.
 */
export function generateCatalogueKey(): string {
  // Use Web Crypto (available in Node 18+ and on Netlify)
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
