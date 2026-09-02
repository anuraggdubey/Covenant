/**
 * Last successful Candidate Lab payload.
 *
 * Alpaca still serves last quotes after the cash session, but a fetch can
 * still fail. The lab is allowed to show a labelled STALE copy of the last
 * good chain; the kernel continues to abstain on unverifiable state.
 */

import type { CandidateLabResponse } from "@/lib/alpha/candidate-lab-types";

let lastSuccess: CandidateLabResponse | null = null;

export function rememberCandidateLab(payload: CandidateLabResponse): void {
  lastSuccess = payload;
}

export function lastCandidateLab(): CandidateLabResponse | null {
  return lastSuccess;
}

export function clearCandidateLabCache(): void {
  lastSuccess = null;
}

/** Serve the last success as STALE cache. Does not mutate the stored copy. */
export function staleFromCache(now: string, warning: string): CandidateLabResponse | null {
  if (lastSuccess === null) return null;
  return {
    ...lastSuccess,
    timestamp: now,
    freshness: "STALE",
    source: "CACHE",
    warning
  };
}
