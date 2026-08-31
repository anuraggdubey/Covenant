import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const corpus = JSON.parse(await readFile(join(directory, "corpus-v1.json"), "utf8"));
const profileDocument = JSON.parse(await readFile(join(directory, corpus.profileSource), "utf8"));

const expectedInvariants = Array.from({ length: 8 }, (_, index) => `COV-0${index + 1}`);
const legalUnderlyings = new Set(["SPY", "QQQ"]);
const legalStructures = new Set(["BULL_CALL_DEBIT", "BEAR_PUT_DEBIT", "CREDIT_VERTICAL"]);
const requiredRiskFields = [
  "perTradeMaxLossPct",
  "portfolioHeatMaxLossPct",
  "dailyHaltPct",
  "minDte",
  "maxDte",
  "minDelta",
  "maxDelta",
  "maxQuoteAgeMs",
  "maxBidAskWidthPct",
  "minOpenInterest",
  "minVolume",
  "duplicateExposureCooldownMinutes",
  "exitAttemptDeadlineMinutes",
];

assert.equal(corpus.schemaVersion, 1);
assert.equal(corpus.cases.length, 12, "T-C1 requires exactly 12 version-one cases");
assert.equal(new Set(corpus.cases.map((item) => item.id)).size, 12, "Mandate IDs must be unique");

const blocked = corpus.cases.filter((item) => item.expectedCompiledPolicy.status === "BLOCKED");
assert.equal(blocked.length, 4, "T-C1 requires exactly four expected contradictions");

const materialized = [];
for (const item of corpus.cases) {
  assert.match(item.id, /^M-\d{2}$/);
  assert.ok(item.mandateText.length >= 80, `${item.id} mandate text is too thin`);

  const expected = item.expectedCompiledPolicy;
  const baseRisk = profileDocument.profiles[expected.riskSettingsRef];
  assert.ok(baseRisk, `${item.id} references an unknown risk profile`);
  assert.equal(expected.riskProfile, expected.riskSettingsRef);
  assert.ok(expected.allowedUnderlyings.length > 0);
  assert.ok(expected.allowedUnderlyings.every((value) => legalUnderlyings.has(value)));
  assert.ok(expected.allowedStructures.length > 0);
  assert.ok(expected.allowedStructures.every((value) => legalStructures.has(value)));
  assert.equal(expected.missingStateAction, "ABSTAIN");
  assert.equal(expected.modelAuthority, "VETO_OR_SHRINK");
  assert.deepEqual(expected.invariants, expectedInvariants);

  const risk = { ...baseRisk, ...expected.riskOverrides };
  for (const field of requiredRiskFields) {
    assert.equal(typeof risk[field], "number", `${item.id} is missing ${field}`);
    assert.ok(Number.isFinite(risk[field]), `${item.id} has a non-finite ${field}`);
  }

  if (expected.status === "READY") {
    assert.equal(item.expectedContradictions.length, 0, `${item.id} cannot be READY with contradictions`);
    assert.ok(risk.perTradeMaxLossPct > 0 && risk.perTradeMaxLossPct <= 0.01);
    assert.ok(risk.portfolioHeatMaxLossPct >= risk.perTradeMaxLossPct && risk.portfolioHeatMaxLossPct <= 0.04);
    assert.ok(risk.dailyHaltPct < 0);
    assert.ok(risk.minDte <= risk.maxDte);
    assert.ok(risk.minDelta <= risk.maxDelta);
  } else {
    assert.ok(item.expectedContradictions.length > 0, `${item.id} must name its blocker`);
  }

  materialized.push({
    id: item.id,
    status: expected.status,
    riskProfile: expected.riskProfile,
    allowedUnderlyings: expected.allowedUnderlyings,
    allowedStructures: expected.allowedStructures,
    ...risk,
    missingStateAction: expected.missingStateAction,
    modelAuthority: expected.modelAuthority,
    invariants: expected.invariants,
    contradictionCodes: item.expectedContradictions.map((entry) => entry.code),
  });
}

const contradictionCodes = blocked.flatMap((item) => item.expectedContradictions.map((entry) => entry.code));
assert.equal(new Set(contradictionCodes).size, 4, "Each blocked case should exercise a distinct contradiction class");

console.log(`PASS mandate corpus v1: ${materialized.length} cases, ${blocked.length} blocked, ${materialized.length - blocked.length} ready`);
for (const item of materialized) {
  console.log(`${item.id} ${item.status}${item.contradictionCodes.length ? ` [${item.contradictionCodes.join(",")}]` : ""}`);
}
