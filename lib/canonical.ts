/**
 * Canonical JSON and hashing — THE single implementation.
 *
 * Every hash in Covenant (policy, intent, snapshot, permit, event) is a sha256
 * over this canonicalisation. Two implementations would be a silent
 * catastrophe: Lane A would hash a snapshot one way, Lane B would verify it
 * another, and every permit binding check would fail for no visible reason.
 *
 * lib/alpha/canonical.ts re-exports from here for exactly that reason. If you
 * are about to write another canonicaliser, don't.
 *
 * Rules: keys sorted lexicographically at every level, no whitespace,
 * `undefined` dropped, excluded keys removed at every level, non-finite
 * numbers rejected.
 */

import { createHash } from "node:crypto";

function sortObject(value: unknown, excludeKeys: readonly string[], path: string): unknown {
  if (value === null) return null;

  if (Array.isArray(value)) {
    return value.map((item, index) => sortObject(item, excludeKeys, `${path}[${index}]`));
  }

  switch (typeof value) {
    case "number":
      if (!Number.isFinite(value)) {
        throw new Error(`canonicalize: non-finite number at ${path || "root"}`);
      }
      return value;
    case "string":
    case "boolean":
      return value;
    case "bigint":
      return value.toString();
    case "undefined":
      throw new Error(`canonicalize: undefined at ${path || "root"}`);
    case "function":
    case "symbol":
      throw new Error(`canonicalize: unserialisable ${typeof value} at ${path || "root"}`);
    default:
      break;
  }

  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    if (excludeKeys.includes(key)) continue;
    const child = source[key];
    // A missing optional field and an explicitly-undefined one must hash alike.
    if (child === undefined) continue;
    out[key] = sortObject(child, excludeKeys, path === "" ? key : `${path}.${key}`);
  }
  return out;
}

/** Deterministic JSON: recursively sorted keys, no whitespace. */
export function canonicalJsonStringify(value: unknown, excludeKeys: readonly string[] = []): string {
  return JSON.stringify(sortObject(value, excludeKeys, ""));
}

/** Alias kept for call sites that read better without the "JsonStringify". */
export const canonicalize = canonicalJsonStringify;

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** sha256 over the canonical form, with the named keys removed at every level. */
export function sha256Canonical(value: unknown, excludeKeys: readonly string[] = []): string {
  return sha256Hex(canonicalJsonStringify(value, excludeKeys));
}

export function hashObject(value: unknown): string {
  return sha256Canonical(value);
}

/**
 * Hash an object with some fields removed — used for self-referential hashes
 * (a permit's signature cannot cover its own signature field).
 */
export function hashExcluding<T extends object>(value: T, ...omit: (keyof T & string)[]): string {
  return sha256Canonical(value, omit);
}

/** Length-safe equality for hex digests, without an early-exit position leak. */
export function hashEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
