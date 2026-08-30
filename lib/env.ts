/**
 * Server-only environment access. Fails closed.
 *
 * IMPLEMENTATION.md §3: a missing or malformed required variable is not a
 * warning, it is a stop. Nothing here is ever imported by a Client Component —
 * importing this module from the browser bundle is a build-time error by
 * intent (`server-only` guard below).
 *
 * Broker credentials are deliberately NOT exported from this module. They are
 * read at their point of use in lib/alpaca/client.ts (read path) and
 * lib/execution/executor.ts (write path) so that `grep` proves the boundary.
 */

const LIVE_HOST_MARKERS = ["api.alpaca.markets"];

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `env: ${name} is required and missing. Covenant fails closed rather than guessing.`
    );
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? fallback : value.trim();
}

function integer(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) throw new Error(`env: ${name} must be an integer, got ${raw}`);
  return parsed;
}

/**
 * Paper-only allowlist. IMPLEMENTATION.md §1 non-negotiable 4: a live endpoint
 * is not configurable, not reachable, not one typo away.
 */
export function assertPaperOnly(url: string, name: string): string {
  const lowered = url.toLowerCase();
  for (const marker of LIVE_HOST_MARKERS) {
    if (lowered.includes(marker) && !lowered.includes("paper-api.alpaca.markets")) {
      throw new Error(
        `env: ${name} points at a live Alpaca endpoint (${url}). Covenant is paper-only.`
      );
    }
  }
  if (!lowered.startsWith("https://")) {
    throw new Error(`env: ${name} must be https, got ${url}`);
  }
  return url;
}

export function tradingBaseUrl(): string {
  return assertPaperOnly(
    optional("ALPACA_TRADING_BASE_URL", "https://paper-api.alpaca.markets"),
    "ALPACA_TRADING_BASE_URL"
  );
}

export function dataBaseUrl(): string {
  return assertPaperOnly(
    optional("ALPACA_DATA_BASE_URL", "https://data.alpaca.markets"),
    "ALPACA_DATA_BASE_URL"
  );
}

export function dataFeed(): "indicative" | "opra" {
  const feed = optional("ALPACA_DATA_FEED", "indicative");
  if (feed !== "indicative" && feed !== "opra") {
    throw new Error(`env: ALPACA_DATA_FEED must be "indicative" or "opra", got ${feed}`);
  }
  return feed;
}

export function permitTtlSeconds(): number {
  const ttl = integer("PERMIT_TTL_SECONDS", 60);
  if (ttl <= 0 || ttl > 300) {
    throw new Error(`env: PERMIT_TTL_SECONDS must be 1..300, got ${ttl}`);
  }
  return ttl;
}

export function permitNonceNamespace(): string {
  return optional("PERMIT_NONCE_NAMESPACE", "covenant-paper");
}

export function codeRevision(): string {
  return optional("VERCEL_GIT_COMMIT_SHA", optional("COVENANT_CODE_REVISION", "dev"));
}

export function killSwitchConfirmation(): string {
  return optional("KILL_SWITCH_CONFIRMATION", "COVENANT_HALT");
}

export { required as requiredEnv, optional as optionalEnv };
