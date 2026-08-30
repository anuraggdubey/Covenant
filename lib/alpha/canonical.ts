import { createHash } from "node:crypto";

/**
 * Deterministically serializes a JavaScript object to canonical JSON.
 * - Keys are recursively sorted in lexicographical order.
 * - Excludes undefined fields and any specified excluded keys (e.g. hash fields).
 */
export function canonicalJsonStringify(obj: unknown, excludeKeys: string[] = []): string {
  return JSON.stringify(sortObject(obj, excludeKeys));
}

function sortObject(obj: unknown, excludeKeys: string[]): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sortObject(item, excludeKeys));
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>)
    .filter((key) => !excludeKeys.includes(key))
    .sort();

  const result: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== undefined) {
      result[key] = sortObject(val, excludeKeys);
    }
  }

  return result;
}

/**
 * Computes SHA-256 hash of canonical JSON string.
 */
export function sha256Canonical(obj: unknown, excludeKeys: string[] = []): string {
  const canonicalStr = canonicalJsonStringify(obj, excludeKeys);
  return createHash("sha256").update(canonicalStr, "utf8").digest("hex");
}
