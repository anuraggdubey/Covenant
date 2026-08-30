/**
 * Nonce store — Lane B, T-B3. Single-use permits.
 *
 * Lifecycle: the kernel `register`s a nonce when it signs a permit (state
 * UNUSED). The executor `consume`s it immediately before the broker call. A
 * nonce that was never registered is as bad as one already spent — both mean
 * the permit did not come from this kernel run.
 *
 * Timing note (IMPLEMENTATION.md §8, T-B3): the doc says "mark used only after
 * an accepted submission attempt". We consume after all validation passes and
 * immediately before the network call. That satisfies both halves: a permit
 * rejected in validation does not burn its nonce, and there is no window in
 * which the same nonce can be submitted twice.
 */

export type NonceState = "UNKNOWN" | "UNUSED" | "USED";

export type ConsumeResult = "CONSUMED" | "UNKNOWN" | "ALREADY_USED";

export interface NonceStore {
  register(nonce: string): Promise<void>;
  state(nonce: string): Promise<NonceState>;
  /** Atomic transition UNUSED -> USED. Anything else is a replay. */
  consume(nonce: string): Promise<ConsumeResult>;
}

/**
 * In-memory implementation. Correct for a single process, which is what the
 * demo, the tests, and the scheduled tick all are. Swap for a Postgres-backed
 * store when the executor runs in more than one process — the interface is
 * the contract, not this class.
 */
export class InMemoryNonceStore implements NonceStore {
  private readonly entries = new Map<string, NonceState>();

  async register(nonce: string): Promise<void> {
    if (this.entries.has(nonce)) {
      throw new Error(`nonce collision: ${nonce} was already registered`);
    }
    this.entries.set(nonce, "UNUSED");
  }

  async state(nonce: string): Promise<NonceState> {
    return this.entries.get(nonce) ?? "UNKNOWN";
  }

  async consume(nonce: string): Promise<ConsumeResult> {
    const current = this.entries.get(nonce);
    if (current === undefined) return "UNKNOWN";
    if (current === "USED") return "ALREADY_USED";
    this.entries.set(nonce, "USED");
    return "CONSUMED";
  }

  /** Test and demo helper. Never call this from production code. */
  reset(): void {
    this.entries.clear();
  }
}

/** Process-wide default. The kernel and executor must share one instance. */
export const defaultNonceStore = new InMemoryNonceStore();
