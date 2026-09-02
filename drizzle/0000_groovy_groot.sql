CREATE TABLE "permit_drafts" (
	"draft_id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL CHECK ("status" IN ('READY', 'STALE', 'SIGNED', 'EXPIRED')),
	"symbol" text NOT NULL CHECK ("symbol" IN ('SPY', 'QQQ')),
	"intent" jsonb NOT NULL,
	"policy" jsonb NOT NULL,
	"material_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permits" (
	"permit_id" text PRIMARY KEY NOT NULL,
	"nonce" text NOT NULL,
	"status" text NOT NULL CHECK ("status" IN ('SIGNED', 'USED')),
	"execution" text NOT NULL CHECK ("execution" IN ('HELD', 'SUBMITTED', 'BROKER_ERROR', 'REJECTED', 'UNKNOWN')),
	"symbol" text NOT NULL CHECK ("symbol" IN ('SPY', 'QQQ')),
	"permit" jsonb NOT NULL,
	"intent" jsonb NOT NULL,
	"policy" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"order_id" text,
	"request_id" text,
	"rejection_code" text,
	"rejection_reason" text,
	CONSTRAINT "permits_nonce_unique" UNIQUE("nonce")
);
--> statement-breakpoint
CREATE INDEX "permits_created_at_idx" ON "permits" USING btree ("created_at" DESC);
--> statement-breakpoint
CREATE INDEX "permits_status_idx" ON "permits" USING btree ("status", "expires_at" DESC);
