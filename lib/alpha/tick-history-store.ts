/**
 * Cross-process tick history — Lane A.
 *
 * `npm run tick` and the Next.js dev server are separate Node processes. An
 * in-memory array alone means Proof Explorer never sees CLI ticks. This file
 * appends each tick to a local JSON journal both processes can read.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const MAX_TICK_HISTORY = 100;

function historyPath(): string {
  return process.env.COVENANT_TICK_HISTORY_PATH ?? join(process.cwd(), ".covenant", "tick-history.json");
}

function readDisk<T>(): T[] {
  try {
    const raw = readFileSync(/* turbopackIgnore: true */ historyPath(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeDisk<T>(entries: readonly T[]): void {
  const path = historyPath();
  mkdirSync(dirname(path), { recursive: true });
  const content = JSON.stringify(entries, null, 0);
  const tmp = `${path}.tmp`;
  try {
    writeFileSync(tmp, content, "utf8");
    renameSync(tmp, path);
  } catch {
    // Windows can block rename when the target is open elsewhere; direct write is fine for a dev journal.
    writeFileSync(path, content, "utf8");
    try {
      renameSync(tmp, path);
    } catch {
      /* tmp may already be gone */
    }
  }
}

/** Load tick history from the on-disk journal. */
export function loadPersistedTickHistory<T>(): T[] {
  return readDisk<T>();
}

/** Append one tick and keep the journal capped. */
export function appendPersistedTick<T>(result: T): T[] {
  const merged = [...readDisk<T>(), result].slice(-MAX_TICK_HISTORY);
  writeDisk(merged);
  return merged;
}

/** Clear the on-disk journal (tests and local resets). */
export function clearPersistedTickHistory(): void {
  writeDisk([]);
}
