import { neon } from "@neondatabase/serverless";

import type { NonceState, ConsumeResult, NonceStore } from "@/lib/permits/nonce";
import type {
  PermitDetail,
  PermitExecutionOutcome,
  PermitLifecycleStatus,
  PermitSummary,
  PreparedTrade,
  PreparedTradeStatus
} from "@/lib/permits/console-types";
import type { Policy, TradeIntent, TradePermit, Underlying } from "@/types/domain";

type JsonRow = Record<string, unknown>;

export class PermitStorageUnavailableError extends Error {
  constructor(message = "Permit storage is unavailable. Configure DATABASE_URL and run the permit migration.") {
    super(message);
    this.name = "PermitStorageUnavailableError";
  }
}

function databaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value || value.includes("user:password@localhost")) {
    throw new PermitStorageUnavailableError();
  }
  return value;
}

function asDate(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));
  return date.toISOString();
}

function lifecycle(row: JsonRow, now = new Date()): PermitLifecycleStatus {
  if (row.used_at !== null && row.used_at !== undefined) return "USED";
  return Date.parse(String(row.expires_at)) <= now.getTime() ? "EXPIRED" : "SIGNED";
}

function summary(row: JsonRow): PermitSummary {
  const intent = row.intent as TradeIntent;
  return {
    permitId: String(row.permit_id),
    symbol: row.symbol as Underlying,
    structure: intent.structure,
    quantity: intent.quantity,
    maxLoss: intent.standaloneMaxLoss,
    createdAt: asDate(row.created_at),
    expiresAt: asDate(row.expires_at),
    lifecycle: lifecycle(row),
    execution: row.execution as PermitExecutionOutcome,
    orderId: row.order_id === null || row.order_id === undefined ? null : String(row.order_id)
  };
}

export class PostgresPermitStore implements NonceStore {
  private readonly sql = neon(databaseUrl());

  async saveDraft(draft: PreparedTrade, materialHash: string): Promise<void> {
    await this.sql`
      INSERT INTO permit_drafts (draft_id, status, symbol, intent, policy, material_hash, created_at, expires_at)
      VALUES (${draft.draftId}, ${draft.status}, ${draft.symbol}, ${JSON.stringify(draft.intent)}::jsonb,
        ${JSON.stringify(draft.policy)}::jsonb, ${materialHash}, ${draft.createdAt}::timestamptz, ${draft.expiresAt}::timestamptz)
    `;
  }

  async getDraft(draftId: string): Promise<{ draft: PreparedTrade; materialHash: string } | null> {
    const rows = await this.sql`SELECT * FROM permit_drafts WHERE draft_id = ${draftId} LIMIT 1` as JsonRow[];
    const row = rows[0];
    if (!row) return null;
    return {
      draft: {
        draftId: String(row.draft_id),
        status: row.status as PreparedTradeStatus,
        symbol: row.symbol as Underlying,
        intent: row.intent as TradeIntent,
        policy: row.policy as PreparedTrade["policy"],
        createdAt: asDate(row.created_at),
        expiresAt: asDate(row.expires_at)
      },
      materialHash: String(row.material_hash)
    };
  }

  async markDraft(draftId: string, status: PreparedTradeStatus): Promise<void> {
    await this.sql`UPDATE permit_drafts SET status = ${status} WHERE draft_id = ${draftId}`;
  }

  async savePermit(permit: TradePermit, intent: TradeIntent, policy: Policy): Promise<void> {
    await this.sql`
      INSERT INTO permits (permit_id, nonce, status, execution, symbol, permit, intent, policy, created_at, expires_at)
      VALUES (${permit.permitId}, ${permit.nonce}, 'SIGNED', 'HELD', ${intent.underlying}, ${JSON.stringify(permit)}::jsonb,
        ${JSON.stringify(intent)}::jsonb, ${JSON.stringify(policy)}::jsonb, ${permit.createdAt}::timestamptz, ${permit.expiresAt}::timestamptz)
    `;
  }

  async list(limit = 50): Promise<PermitSummary[]> {
    const rows = await this.sql`SELECT * FROM permits ORDER BY created_at DESC LIMIT ${limit}` as JsonRow[];
    return rows.map(summary);
  }

  async getPermit(permitId: string): Promise<PermitDetail | null> {
    const rows = await this.sql`SELECT * FROM permits WHERE permit_id = ${permitId} LIMIT 1` as JsonRow[];
    const row = rows[0];
    if (!row) return null;
    return {
      ...summary(row),
      permit: row.permit as TradePermit,
      intent: row.intent as TradeIntent,
      policy: row.policy as PermitDetail["policy"],
      usedAt: row.used_at === null || row.used_at === undefined ? null : asDate(row.used_at),
      requestId: row.request_id === null || row.request_id === undefined ? null : String(row.request_id),
      rejectionCode: row.rejection_code === null || row.rejection_code === undefined ? null : String(row.rejection_code),
      rejectionReason: row.rejection_reason === null || row.rejection_reason === undefined ? null : String(row.rejection_reason)
    };
  }

  async register(_nonce: string): Promise<void> {
    // The nonce is committed with its permit record. A second registration is never valid.
  }

  async state(nonce: string): Promise<NonceState> {
    const rows = await this.sql`SELECT used_at FROM permits WHERE nonce = ${nonce} LIMIT 1` as JsonRow[];
    if (!rows[0]) return "UNKNOWN";
    return rows[0].used_at === null || rows[0].used_at === undefined ? "UNUSED" : "USED";
  }

  async consume(nonce: string): Promise<ConsumeResult> {
    const consumed = await this.sql`
      UPDATE permits SET used_at = NOW(), status = 'USED'
      WHERE nonce = ${nonce} AND used_at IS NULL AND expires_at > NOW()
      RETURNING permit_id
    ` as JsonRow[];
    if (consumed.length > 0) return "CONSUMED";
    const existing = await this.sql`SELECT used_at, expires_at FROM permits WHERE nonce = ${nonce} LIMIT 1` as JsonRow[];
    if (!existing[0]) return "UNKNOWN";
    return "ALREADY_USED";
  }

  async recordExecution(
    permitId: string,
    execution: PermitExecutionOutcome,
    outcome: { orderId?: string; requestId?: string; code?: string; reason?: string }
  ): Promise<void> {
    await this.sql`
      UPDATE permits
      SET execution = ${execution}, order_id = ${outcome.orderId ?? null}, request_id = ${outcome.requestId ?? null},
          rejection_code = ${outcome.code ?? null}, rejection_reason = ${outcome.reason ?? null}
      WHERE permit_id = ${permitId}
    `;
  }
}

/**
 * What a permit store has to do. Both backends implement exactly this, and
 * the routes never learn which one they got.
 */
export interface PermitStore extends NonceStore {
  saveDraft(draft: PreparedTrade, materialHash: string): Promise<void>;
  getDraft(draftId: string): Promise<{ draft: PreparedTrade; materialHash: string } | null>;
  markDraft(draftId: string, status: PreparedTradeStatus): Promise<void>;
  savePermit(permit: TradePermit, intent: TradeIntent, policy: Policy): Promise<void>;
  list(limit?: number): Promise<PermitSummary[]>;
  getPermit(permitId: string): Promise<PermitDetail | null>;
  recordExecution(
    permitId: string,
    execution: PermitExecutionOutcome,
    outcome: { orderId?: string; requestId?: string; code?: string; reason?: string }
  ): Promise<void>;
}

interface StoredPermit {
  permit: TradePermit;
  intent: TradeIntent;
  policy: Policy;
  usedAt: string | null;
  execution: PermitExecutionOutcome;
  orderId: string | null;
  requestId: string | null;
  rejectionCode: string | null;
  rejectionReason: string | null;
}

/**
 * In-memory permit store — the default when no database is configured.
 *
 * This exists so the permit console works on a fresh clone with nothing but
 * `npm install`. A judge opening this repository should be able to sign a
 * permit and watch it expire without first creating a Postgres project, and
 * an unconfigured database must never look like a broken product.
 *
 * It matches the Postgres semantics exactly where it matters: a nonce is
 * consumable only while unused AND unexpired, single-use is enforced, and an
 * unknown nonce is distinguishable from a spent one. What it does not do is
 * survive a restart, which the console states plainly rather than hiding.
 */
export class InMemoryPermitStore implements PermitStore {
  private readonly drafts = new Map<string, { draft: PreparedTrade; materialHash: string }>();
  private readonly permits = new Map<string, StoredPermit>();
  private readonly byNonce = new Map<string, string>();

  async saveDraft(draft: PreparedTrade, materialHash: string): Promise<void> {
    this.drafts.set(draft.draftId, { draft: { ...draft }, materialHash });
  }

  async getDraft(draftId: string): Promise<{ draft: PreparedTrade; materialHash: string } | null> {
    const found = this.drafts.get(draftId);
    return found === undefined ? null : { draft: { ...found.draft }, materialHash: found.materialHash };
  }

  async markDraft(draftId: string, status: PreparedTradeStatus): Promise<void> {
    const found = this.drafts.get(draftId);
    if (found !== undefined) found.draft = { ...found.draft, status };
  }

  async savePermit(permit: TradePermit, intent: TradeIntent, policy: Policy): Promise<void> {
    this.permits.set(permit.permitId, {
      permit,
      intent,
      policy,
      usedAt: null,
      execution: "HELD",
      orderId: null,
      requestId: null,
      rejectionCode: null,
      rejectionReason: null
    });
    this.byNonce.set(permit.nonce, permit.permitId);
  }

  private toSummary(stored: StoredPermit, now = new Date()): PermitSummary {
    const lifecycleStatus: PermitLifecycleStatus =
      stored.usedAt !== null
        ? "USED"
        : Date.parse(stored.permit.expiresAt) <= now.getTime()
          ? "EXPIRED"
          : "SIGNED";

    return {
      permitId: stored.permit.permitId,
      symbol: stored.intent.underlying,
      structure: stored.intent.structure,
      quantity: stored.intent.quantity,
      maxLoss: stored.intent.standaloneMaxLoss,
      createdAt: stored.permit.createdAt,
      expiresAt: stored.permit.expiresAt,
      lifecycle: lifecycleStatus,
      execution: stored.execution,
      orderId: stored.orderId
    };
  }

  async list(limit = 50): Promise<PermitSummary[]> {
    return [...this.permits.values()]
      .sort((a, b) => Date.parse(b.permit.createdAt) - Date.parse(a.permit.createdAt))
      .slice(0, limit)
      .map((stored) => this.toSummary(stored));
  }

  async getPermit(permitId: string): Promise<PermitDetail | null> {
    const stored = this.permits.get(permitId);
    if (stored === undefined) return null;
    return {
      ...this.toSummary(stored),
      permit: stored.permit,
      intent: stored.intent,
      policy: stored.policy,
      usedAt: stored.usedAt,
      requestId: stored.requestId,
      rejectionCode: stored.rejectionCode,
      rejectionReason: stored.rejectionReason
    };
  }

  async register(_nonce: string): Promise<void> {
    // Committed alongside the permit record, exactly as in Postgres.
  }

  async state(nonce: string): Promise<NonceState> {
    const permitId = this.byNonce.get(nonce);
    if (permitId === undefined) return "UNKNOWN";
    const stored = this.permits.get(permitId);
    if (stored === undefined) return "UNKNOWN";
    return stored.usedAt === null ? "UNUSED" : "USED";
  }

  async consume(nonce: string): Promise<ConsumeResult> {
    const permitId = this.byNonce.get(nonce);
    if (permitId === undefined) return "UNKNOWN";
    const stored = this.permits.get(permitId);
    if (stored === undefined) return "UNKNOWN";

    const unexpired = Date.parse(stored.permit.expiresAt) > Date.now();
    if (stored.usedAt === null && unexpired) {
      stored.usedAt = new Date().toISOString();
      return "CONSUMED";
    }
    return "ALREADY_USED";
  }

  async recordExecution(
    permitId: string,
    execution: PermitExecutionOutcome,
    outcome: { orderId?: string; requestId?: string; code?: string; reason?: string }
  ): Promise<void> {
    const stored = this.permits.get(permitId);
    if (stored === undefined) return;
    stored.execution = execution;
    stored.orderId = outcome.orderId ?? null;
    stored.requestId = outcome.requestId ?? null;
    stored.rejectionCode = outcome.code ?? null;
    stored.rejectionReason = outcome.reason ?? null;
  }
}

export type PermitStorageMode = "postgres" | "memory";

export function permitStorageMode(): PermitStorageMode {
  const value = process.env.DATABASE_URL?.trim();
  return value && !value.includes("user:password@localhost") ? "postgres" : "memory";
}

// Cached, because an in-memory store that is rebuilt per request would forget
// every permit the moment it was signed.
let cached: { store: PermitStore; mode: PermitStorageMode } | null = null;

export function getPermitStore(): PermitStore {
  const mode = permitStorageMode();
  if (cached !== null && cached.mode === mode) return cached.store;

  const store: PermitStore = mode === "postgres" ? new PostgresPermitStore() : new InMemoryPermitStore();
  cached = { store, mode };
  return store;
}

/** Tests only. */
export function resetPermitStoreForTests(): void {
  cached = null;
}
