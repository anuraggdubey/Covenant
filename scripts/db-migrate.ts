/**
 * Apply the permit schema to a Neon Postgres branch.
 *
 *   npm run db:migrate
 *
 * Reads DATABASE_URL from .env.local. Idempotent — every statement is
 * CREATE ... IF NOT EXISTS, so re-running is safe.
 *
 * Skipping this is fine: without DATABASE_URL the permit console uses an
 * in-memory store and still signs, expires and consumes permits correctly.
 * The database only adds persistence across restarts.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const ESC = String.fromCharCode(27);
const GREEN = `${ESC}[32m`;
const RED = `${ESC}[31m`;
const DIM = `${ESC}[2m`;
const RESET = `${ESC}[0m`;

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url.includes("user:password@localhost")) {
    process.stderr.write(
      `${RED}DATABASE_URL is not set.${RESET}\n\n` +
        "  1. Create a free project at https://console.neon.tech\n" +
        "  2. Copy its pooled connection string\n" +
        "  3. Put it in .env.local as DATABASE_URL=postgresql://...\n" +
        "  4. Run this again\n\n" +
        `${DIM}Covenant runs without it — the permit console falls back to in-memory storage.${RESET}\n`
    );
    process.exit(1);
  }

  const sql = neon(url);
  const file = resolve(process.cwd(), "lib/storage/migrations/001_permits.sql");
  const source = readFileSync(file, "utf8");

  // Split on statement boundaries, dropping comment-only fragments.
  const statements = source
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0 && !statement.split("\n").every((l) => l.trim().startsWith("--")));

  for (const statement of statements) {
    const label = statement.replace(/\s+/g, " ").slice(0, 68);
    await sql.query(statement);
    process.stdout.write(`  ${GREEN}ok${RESET}  ${DIM}${label}${RESET}\n`);
  }

  const tables = (await sql.query(
    "SELECT table_name FROM information_schema.tables WHERE table_name IN ('permits','permit_drafts')"
  )) as { table_name: string }[];

  process.stdout.write(
    `\n${GREEN}Migration applied.${RESET} Tables present: ${tables.map((t) => t.table_name).sort().join(", ")}\n` +
      `${DIM}Restart the dev server; the permit console will switch to Postgres automatically.${RESET}\n\n`
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${RED}Migration failed:${RESET} ${message}\n`);
  process.exit(1);
});
