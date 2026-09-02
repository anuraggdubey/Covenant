import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const permitDrafts = pgTable("permit_drafts", {
  draftId: text("draft_id").primaryKey(),
  status: text("status").notNull(),
  symbol: text("symbol").notNull(),
  intent: jsonb("intent").notNull(),
  policy: jsonb("policy").notNull(),
  materialHash: text("material_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
});

export const permits = pgTable("permits", {
  permitId: text("permit_id").primaryKey(),
  nonce: text("nonce").notNull().unique(),
  status: text("status").notNull(),
  execution: text("execution").notNull(),
  symbol: text("symbol").notNull(),
  permit: jsonb("permit").notNull(),
  intent: jsonb("intent").notNull(),
  policy: jsonb("policy").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  orderId: text("order_id"),
  requestId: text("request_id"),
  rejectionCode: text("rejection_code"),
  rejectionReason: text("rejection_reason")
});
