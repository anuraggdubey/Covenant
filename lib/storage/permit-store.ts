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

export function getPermitStore(): PostgresPermitStore {
  return new PostgresPermitStore();
}
