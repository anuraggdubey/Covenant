import { parseOccSymbol } from "@/lib/alpha/occ";
import type {
  CandidateLabFilters,
  LadderRowView,
  RankedCandidateView,
  UnderlyingLabView
} from "@/lib/alpha/candidate-lab-types";

function parseBound(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return value;
}

function queryNeedle(filters: CandidateLabFilters): string {
  return filters.query.trim().toLowerCase();
}

function candidateStrikes(candidate: RankedCandidateView): number[] {
  const strikes: number[] = [];
  for (const leg of candidate.legs) {
    try {
      strikes.push(Number(parseOccSymbol(leg.symbol).strike));
    } catch {
      // Leave unparsed legs out of the numeric filter; text search still sees the symbol.
    }
  }
  return strikes;
}

function inStrikeWindow(strikes: number[], min: number | null, max: number | null): boolean {
  if (min === null && max === null) return true;
  if (strikes.length === 0) return false;
  return strikes.some((strike) => {
    if (min !== null && strike < min) return false;
    if (max !== null && strike > max) return false;
    return true;
  });
}

export function filtersAreActive(filters: CandidateLabFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.expiry !== "" ||
    filters.structure !== "" ||
    filters.strikeMin.trim() !== "" ||
    filters.strikeMax.trim() !== "" ||
    filters.maxLossMax.trim() !== ""
  );
}

export function candidateMatchesFilters(
  candidate: RankedCandidateView,
  filters: CandidateLabFilters
): boolean {
  const needle = queryNeedle(filters);
  if (needle !== "") {
    const haystack = [
      candidate.thesis,
      candidate.expiry,
      candidate.structure,
      ...candidate.legs.map((leg) => leg.symbol)
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  if (filters.expiry !== "" && candidate.expiry !== filters.expiry) return false;
  if (filters.structure !== "" && candidate.structure !== filters.structure) return false;

  const maxLossCap = parseBound(filters.maxLossMax);
  if (maxLossCap !== null && Number(candidate.standaloneMaxLoss) > maxLossCap) return false;

  return inStrikeWindow(
    candidateStrikes(candidate),
    parseBound(filters.strikeMin),
    parseBound(filters.strikeMax)
  );
}

export function ladderRowMatchesFilters(row: LadderRowView, filters: CandidateLabFilters): boolean {
  const strike = Number(row.strike);
  const min = parseBound(filters.strikeMin);
  const max = parseBound(filters.strikeMax);
  if (min !== null && Number.isFinite(strike) && strike < min) return false;
  if (max !== null && Number.isFinite(strike) && strike > max) return false;

  const needle = queryNeedle(filters);
  if (needle === "") return true;

  const haystack = [row.strike, row.call?.symbol ?? "", row.put?.symbol ?? ""].join(" ").toLowerCase();
  return haystack.includes(needle);
}

export function filterRankedCandidates(
  candidates: RankedCandidateView[],
  filters: CandidateLabFilters
): RankedCandidateView[] {
  return candidates.filter((candidate) => candidateMatchesFilters(candidate, filters));
}

export function filterLadderRows(rows: LadderRowView[], filters: CandidateLabFilters): LadderRowView[] {
  return rows.filter((row) => ladderRowMatchesFilters(row, filters));
}

export function expirationsOf(view: UnderlyingLabView | undefined): string[] {
  return view?.expirations ?? [];
}
