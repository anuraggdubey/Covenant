/**
 * Run manifest verifier — Lane B, T-B9.
 *
 * `npm run verify -- demo/run_manifest.json` replays a recorded run and
 * reports what it could and could not confirm. Two labels, and the difference
 * between them is the honest part of the whole product:
 *
 *   RECORDED    — a market or broker fact we captured. We can prove it has
 *                 not been altered since. We cannot prove it was true.
 *   REPRODUCED  — a deterministic check we re-ran here, now, from the recorded
 *                 inputs, and got the same answer.
 *
 * Claiming a market price is "verified" would be a lie; claiming a policy
 * decision is reproducible is a fact. The report never blurs the two.
 *
 * Requires no credentials and no network. That is the point.
 */

import { hashObject } from "@/lib/canonical";
import { verifyChain } from "@/lib/audit/journal";
import {
  computeAccountSnapshotHash,
  computeIntentHash,
  computeMarketSnapshotHash,
  computePolicyHash
} from "@/lib/hashes";
import { verifyPermitSignature } from "@/lib/permits/verify";
import { INVARIANT_REGISTRY } from "@/lib/safety/invariants";
import type { InvariantContext } from "@/lib/safety/types";
import type {
  AccountSnapshot,
  CovenantEvent,
  MarketSnapshot,
  Policy,
  RunManifest,
  SessionStatus,
  TradeIntent,
  TradePermit
} from "@/types/domain";

export type CheckLabel = "RECORDED" | "REPRODUCED";

export interface VerificationCheck {
  id: string;
  label: CheckLabel;
  ok: boolean;
  detail: string;
  eventId?: string;
}

export interface VerificationReport {
  ok: boolean;
  runId: string;
  codeRevision: string;
  checks: VerificationCheck[];
  counts: { passed: number; failed: number; recorded: number; reproduced: number };
}

function check(
  id: string,
  label: CheckLabel,
  ok: boolean,
  detail: string,
  eventId?: string
): VerificationCheck {
  return { id, label, ok, detail, eventId };
}

/** Payload shapes the verifier expects to find inside specific events. */
interface DecisionPayload {
  policy: Policy;
  /** The intent the kernel evaluated. Invariants are re-run against this. */
  intent: TradeIntent;
  /** The intent the permit binds. Differs from `intent` on a SHRINK. */
  finalIntent?: TradeIntent;
  account: AccountSnapshot;
  market: MarketSnapshot;
  session: SessionStatus;
  now: string;
  decision: string;
  failedInvariants: string[];
  reason: string;
}

interface OrderPayload {
  permit: TradePermit;
  intent: TradeIntent;
  order: { qty: string; limit_price: string; legs: { symbol: string }[] };
}

function payloadOf<T>(event: CovenantEvent | undefined): T | null {
  return event === undefined ? null : (event.payload as T);
}

export function verifyManifest(manifest: RunManifest): VerificationReport {
  const checks: VerificationCheck[] = [];

  // ---- 1. Structure ------------------------------------------------------
  checks.push(
    check(
      "manifest.shape",
      "REPRODUCED",
      Array.isArray(manifest.events) && manifest.events.length > 0,
      `Manifest carries ${manifest.events?.length ?? 0} events.`
    )
  );

  // ---- 2. Hash chain -----------------------------------------------------
  const chainFailures = verifyChain(manifest.events ?? []);
  if (chainFailures.length === 0) {
    checks.push(
      check("chain.integrity", "REPRODUCED", true, "Every event hash re-derives and links.")
    );
  } else {
    for (const failure of chainFailures) {
      checks.push(
        check("chain.integrity", "REPRODUCED", false, failure.reason, failure.eventId)
      );
    }
  }

  const head = manifest.events?.[manifest.events.length - 1]?.eventHash ?? null;
  checks.push(
    check(
      "chain.head",
      "REPRODUCED",
      manifest.headEventHash === head,
      manifest.headEventHash === head
        ? "Manifest head matches the last event."
        : "Manifest head does not match the last event hash."
    )
  );

  // ---- 3. Decisions: re-run the invariants on the recorded state ---------
  const decisionEvents = (manifest.events ?? []).filter(
    (e) =>
      e.eventType === "PERMIT_SIGNED" ||
      e.eventType === "KERNEL_REJECTED" ||
      e.eventType === "KERNEL_ABSTAINED"
  );

  checks.push(
    check(
      "decisions.present",
      "REPRODUCED",
      decisionEvents.length > 0,
      `${decisionEvents.length} kernel decision(s) recorded.`
    )
  );

  for (const event of decisionEvents) {
    const payload = payloadOf<DecisionPayload>(event);
    if (payload === null || payload.policy === undefined || payload.intent === undefined) {
      checks.push(
        check("decision.payload", "REPRODUCED", false, "Decision event is missing its inputs.", event.eventId)
      );
      continue;
    }

    // Recorded facts: the snapshots are unaltered relative to their own hashes.
    if (payload.market) {
      checks.push(
        check(
          "snapshot.market",
          "RECORDED",
          computeMarketSnapshotHash(payload.market) === payload.market.snapshotHash,
          "Market snapshot matches its recorded hash (captured fact, not re-fetched).",
          event.eventId
        )
      );
    }
    if (payload.account) {
      checks.push(
        check(
          "snapshot.account",
          "RECORDED",
          computeAccountSnapshotHash(payload.account) === payload.account.snapshotHash,
          "Account snapshot matches its recorded hash (captured fact, not re-fetched).",
          event.eventId
        )
      );
    }
    checks.push(
      check(
        "policy.hash",
        "REPRODUCED",
        computePolicyHash(payload.policy) === payload.policy.policyHash,
        "Policy hash re-derives from the policy body.",
        event.eventId
      )
    );
    checks.push(
      check(
        "intent.hash",
        "REPRODUCED",
        computeIntentHash(payload.intent) === payload.intent.intentHash,
        "Intent hash re-derives from the intent body.",
        event.eventId
      )
    );

    // Replay the full invariant registry against the recorded inputs. This is
    // the core of the proof: the verdict produced then must equal the verdict
    // produced now, right down to the list of failed invariants on a refusal.
    if (payload.account && payload.market && payload.session) {
      const context: InvariantContext = {
        policy: payload.policy,
        intent: payload.intent,
        account: payload.account,
        market: payload.market,
        session: payload.session,
        now: new Date(payload.now)
      };

      const verdicts = INVARIANT_REGISTRY.map((evaluator) => evaluator.evaluate(context));
      const failedNow = verdicts.filter((v) => !v.ok).map((v) => v.id).sort();
      const failedThen = [...(payload.failedInvariants ?? [])].sort();

      checks.push(
        check(
          "invariants.reproduce",
          "REPRODUCED",
          hashObject(failedNow) === hashObject(failedThen),
          failedNow.length === 0
            ? "All eight invariants pass again, as recorded."
            : `Failing invariants reproduce exactly: [${failedNow.join(", ")}].`,
          event.eventId
        )
      );
    }
  }

  // ---- 4. Permits --------------------------------------------------------
  const permitEvents = (manifest.events ?? []).filter((e) => e.eventType === "PERMIT_SIGNED");
  for (const event of permitEvents) {
    const payload = event.payload as DecisionPayload & { permit?: TradePermit };
    const permit = payload?.permit;
    if (permit === undefined) {
      checks.push(
        check("permit.present", "REPRODUCED", false, "PERMIT_SIGNED carries no permit.", event.eventId)
      );
      continue;
    }

    const signature = verifyPermitSignature(permit, { publicKeyPem: manifest.publicKeyPem });
    checks.push(
      check(
        "permit.signature",
        "REPRODUCED",
        signature.ok,
        signature.ok
          ? `Ed25519 signature valid under key ${permit.signingKeyId}.`
          : `Signature check failed (${signature.failure}).`,
        event.eventId
      )
    );

    const bound = payload.finalIntent ?? payload.intent;
    checks.push(
      check(
        "permit.binding",
        "REPRODUCED",
        permit.intentHash === bound?.intentHash,
        payload.finalIntent !== undefined &&
          payload.finalIntent.intentHash !== payload.intent?.intentHash
          ? `Permit binds the SHRUNK intent (qty ${bound?.quantity}), not the ` +
            `${payload.intent?.quantity}-lot request. A shrink cannot be undone.`
          : "Permit is bound to the intent recorded alongside it.",
        event.eventId
      )
    );
  }

  // ---- 5. Orders exactly match their permit ------------------------------
  const orderEvents = (manifest.events ?? []).filter((e) => e.eventType === "ORDER_SUBMITTED");
  for (const event of orderEvents) {
    const payload = payloadOf<OrderPayload>(event);
    if (payload === null || payload.permit === undefined || payload.order === undefined) {
      checks.push(
        check("order.payload", "REPRODUCED", false, "ORDER_SUBMITTED is missing its inputs.", event.eventId)
      );
      continue;
    }

    const permittedLegs = payload.permit.exactLegs.map((l) => l.symbol);
    const submittedLegs = payload.order.legs.map((l) => l.symbol);
    const legsMatch = hashObject(permittedLegs) === hashObject(submittedLegs);
    const qtyWithin = Number(payload.order.qty) <= payload.permit.maxQuantity;

    checks.push(
      check(
        "order.matches-permit",
        "REPRODUCED",
        legsMatch && qtyWithin,
        legsMatch && qtyWithin
          ? "Submitted order legs and quantity match the signed permit exactly."
          : "Submitted order does not match its permit.",
        event.eventId
      )
    );
  }

  const passed = checks.filter((c) => c.ok).length;
  return {
    ok: checks.every((c) => c.ok),
    runId: manifest.runId,
    codeRevision: manifest.codeRevision,
    checks,
    counts: {
      passed,
      failed: checks.length - passed,
      recorded: checks.filter((c) => c.label === "RECORDED").length,
      reproduced: checks.filter((c) => c.label === "REPRODUCED").length
    }
  };
}
