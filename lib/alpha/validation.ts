import type { Underlying } from "@/types/domain";

export interface WalkForwardValidationStatus {
  symbol: Underlying;
  status: "NOT_AVAILABLE";
  provenance: "UNAVAILABLE";
  reason: string;
  requirements: string[];
}

/**
 * Lane C owns performance validation. Lane A must not manufacture historical
 * outcomes when no historical dataset and split manifest have been supplied.
 */
export function runWalkForwardValidation(
  symbol: Underlying
): WalkForwardValidationStatus {
  return {
    symbol,
    status: "NOT_AVAILABLE",
    provenance: "UNAVAILABLE",
    reason: "No verified historical dataset or out-of-sample split manifest has been committed.",
    requirements: [
      "At least two years of timestamped SPY/QQQ underlying bars",
      "Committed train/test boundaries with no look-ahead",
      "Deterministic costs and regime definitions",
      "Recorded dataset hash and code revision",
    ],
  };
}
