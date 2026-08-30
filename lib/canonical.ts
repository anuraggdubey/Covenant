/**
 * Canonical JSON and hashing.
 *
 * Every hash in Covenant — policy, intent, snapshot, permit, event — is a
 * sha256 over this canonicalisation. If two processes disagree about byte
 * order, the replay verifier reports a false mismatch and the proof claim
 * dies. So: sorted keys, no whitespace, undefined dropped, non-finite
 * numbers rejected.
 */

import { createHash } from "node:crypto";

function toCanonical(value: unknown, path: string): unknown {
  if (value === null) return null;

  if (Array.isArray(value)) {
    return value.map((item, index) => toCanonical(item, `${path}[${index}]`));
  }

  switch (typeof value) {
    case "number":
      if (!Number.isFinite(value)) {
        throw new Error(`canonicalize: non-finite number at ${path}`);
      }
      return value;
    case "string":
    case "boolean":
      return value;
    case "bigint":
      return value.toString();
    case "undefined":
      throw new Error(`canonicalize: undefined at ${path}`);
    case "function":
    case "symbol":
      throw new Error(`canonicalize: unserialisable ${typeof value} at ${path}`);
    default:
      break;
  }

  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    const child = source[key];
    // A missing optional field and an explicitly-undefined one must hash alike.
    if (child === undefined) continue;
    out[key] = toCanonical(child, path === "" ? key : `${path}.${key}`);
  }
  return out;
}

/** Deterministic JSON: recursively sorted keys, no whitespace. */
export function canonicalize(value: unknown): string {
  return JSON.stringify(toCanonical(value, ""));
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function hashObject(value: unknown): string {
  return sha256Hex(canonicalize(value));
}

/**
 * Hash an object with some fields removed — used for self-referential hashes
 * (a permit's signature cannot cover its own signature field).
 */
export function hashExcluding<T extends object>(value: T, ...omit: (keyof T & string)[]): string {
  const clone: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const key of omit) delete clone[key];
  return hashObject(clone);
}

/** Constant-time-ish equality for hex digests. Avoids leaking position via early exit. */
export function hashEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
