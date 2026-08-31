/**
 * Hash-chained event journal — Lane B, T-B5.
 *
 * Append-only. Every event carries the hash of the one before it, so removing
 * or editing a past event breaks every hash after it. This is what makes the
 * Proof Explorer's claim checkable rather than decorative: you cannot quietly
 * drop the veto you would rather judges did not see.
 *
 * Deliberately not a database. The journal is a value; persistence is someone
 * else's problem, and a run manifest is just this list plus the public key
 * needed to check it.
 */

import { sha256Canonical } from "@/lib/canonical";
import type { CovenantEvent, EventType, RunManifest } from "@/types/domain";

export interface JournalOptions {
  codeRevision?: string;
  /** Injected so a demo run and its replay produce identical timestamps. */
  clock?: () => Date;
  actor?: string;
}

/** The exact fields a chain link commits to. Payload enters via its hash. */
function computeEventHash(event: Omit<CovenantEvent, "eventHash" | "payload">): string {
  return sha256Canonical({
    eventId: event.eventId,
    eventType: event.eventType,
    payloadHash: event.payloadHash,
    previousEventHash: event.previousEventHash,
    timestamp: event.timestamp,
    codeRevision: event.codeRevision,
    actor: event.actor
  });
}

export class EventJournal {
  private readonly events: CovenantEvent[] = [];
  private readonly codeRevision: string;
  private readonly clock: () => Date;
  private readonly defaultActor: string;

  constructor(options: JournalOptions = {}) {
    this.codeRevision =
      options.codeRevision ?? process.env.COVENANT_CODE_REVISION ?? "dev";
    this.clock = options.clock ?? (() => new Date());
    this.defaultActor = options.actor ?? "covenant";
  }

  append(eventType: EventType, payload: unknown, actor?: string): CovenantEvent {
    const previousEventHash = this.headHash();
    const base = {
      // Sequential rather than random: a replay must reproduce these exactly.
      eventId: `evt-${String(this.events.length + 1).padStart(4, "0")}`,
      eventType,
      payloadHash: sha256Canonical(payload),
      previousEventHash,
      timestamp: this.clock().toISOString(),
      codeRevision: this.codeRevision,
      actor: actor ?? this.defaultActor
    };

    const event: CovenantEvent = { ...base, payload, eventHash: computeEventHash(base) };
    this.events.push(event);
    return event;
  }

  headHash(): string | null {
    const last = this.events[this.events.length - 1];
    return last === undefined ? null : last.eventHash;
  }

  all(): readonly CovenantEvent[] {
    return this.events;
  }

  find(eventType: EventType): CovenantEvent | undefined {
    return this.events.find((event) => event.eventType === eventType);
  }

  toManifest(fields: Omit<RunManifest, "events" | "headEventHash" | "codeRevision">): RunManifest {
    return {
      ...fields,
      codeRevision: this.codeRevision,
      events: [...this.events],
      headEventHash: this.headHash()
    };
  }
}

export interface ChainFailure {
  eventId: string;
  reason: string;
}

/**
 * Re-derive every hash in the chain.
 *
 * Returns every break rather than the first, so a tampered manifest tells you
 * the full blast radius instead of making you re-run after each fix.
 */
export function verifyChain(events: readonly CovenantEvent[]): ChainFailure[] {
  const failures: ChainFailure[] = [];
  let previous: string | null = null;

  events.forEach((event, index) => {
    if (event.payloadHash !== sha256Canonical(event.payload)) {
      failures.push({
        eventId: event.eventId,
        reason: "payload does not match its recorded payloadHash"
      });
    }

    if (event.previousEventHash !== previous) {
      failures.push({
        eventId: event.eventId,
        reason:
          previous === null
            ? "first event must have a null previousEventHash"
            : `previousEventHash does not point at ${events[index - 1]?.eventId ?? "the prior event"}`
      });
    }

    const expected = computeEventHash(event);
    if (event.eventHash !== expected) {
      failures.push({ eventId: event.eventId, reason: "eventHash does not match its own fields" });
    }

    previous = event.eventHash;
  });

  return failures;
}
