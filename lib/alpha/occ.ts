import Decimal from "decimal.js";
import type { Underlying } from "@/types/domain";

export interface ParsedOccSymbol {
  underlying: Underlying;
  expiration: string; // YYYY-MM-DD
  type: "call" | "put";
  strike: string;     // e.g. "500.00"
}

/**
 * Parses an OCC standardized option contract symbol (e.g. SPY260116C00500000).
 */
export function parseOccSymbol(symbol: string): ParsedOccSymbol {
  const match = symbol.match(/^([A-Z]{1,6})(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/);
  if (!match) {
    throw new Error(`[FAIL-CLOSED] Invalid OCC option symbol format: ${symbol}`);
  }

  const [, rawRoot, rawYear, rawMonth, rawDay, rawType, rawStrike] = match;
  if (rawRoot !== "SPY" && rawRoot !== "QQQ") {
    throw new Error(`[FAIL-CLOSED] Unsupported underlying in symbol: ${rawRoot}`);
  }

  const expiration = `20${rawYear}-${rawMonth}-${rawDay}`;
  const type = rawType === "C" ? "call" : "put";
  
  // OCC strike has 3 implied decimal places: 00500000 -> 500.00
  const strikeDec = new Decimal(rawStrike).dividedBy(1000);
  const strike = strikeDec.toFixed(2);

  return {
    underlying: rawRoot as Underlying,
    expiration,
    type,
    strike,
  };
}

/**
 * Formats components into a valid OCC standard option contract symbol.
 * Example: formatOccSymbol("SPY", "2026-01-16", "call", "500.00") -> "SPY260116C00500000"
 */
export function formatOccSymbol(
  underlying: Underlying,
  expiration: string,
  type: "call" | "put",
  strike: string
): string {
  if (underlying !== "SPY" && underlying !== "QQQ") {
    throw new Error(`[FAIL-CLOSED] Unsupported underlying: ${underlying}`);
  }

  // Parse YYYY-MM-DD
  const dateParts = expiration.split("-");
  if (dateParts.length !== 3) {
    throw new Error(`[FAIL-CLOSED] Expiration date must be YYYY-MM-DD, got: ${expiration}`);
  }

  const year = dateParts[0].slice(-2);
  const month = dateParts[1].padStart(2, "0");
  const day = dateParts[2].padStart(2, "0");
  const typeChar = type === "call" ? "C" : "P";

  // Multiply strike by 1000 and pad to 8 digits
  const strikeDec = new Decimal(strike).times(1000);
  const strikeInt = strikeDec.round().toNumber();
  const strikeFormatted = String(strikeInt).padStart(8, "0");

  return `${underlying}${year}${month}${day}${typeChar}${strikeFormatted}`;
}
