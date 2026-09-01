/**
 * T-00 preflight — is the paper account actually ready to trade?
 *
 *   npm run preflight
 *
 * Read-only. It never places an order and never writes anything. It answers
 * the one question blocking the execution path: does Alpaca report an account
 * we are allowed to submit a multi-leg defined-risk spread through?
 *
 * Every check prints what to do when it fails, because a preflight that only
 * says "no" wastes the time it was meant to save.
 */

import dotenv from "dotenv";

// Load .env.local if present, else .env
dotenv.config({ path: ".env.local" });
dotenv.config();

import { getServerEnv } from "@/lib/env/server";

const ESC = String.fromCharCode(27);
const GREEN = `${ESC}[32m`;
const RED = `${ESC}[31m`;
const YELLOW = `${ESC}[33m`;
const DIM = `${ESC}[2m`;
const BOLD = `${ESC}[1m`;
const RESET = `${ESC}[0m`;

interface Check {
  label: string;
  ok: boolean;
  detail: string;
  fix?: string;
}

const checks: Check[] = [];
function add(label: string, ok: boolean, detail: string, fix?: string): void {
  checks.push({ label, ok, detail, fix });
}

interface AlpacaAccount {
  id: string;
  status: string;
  equity: string;
  cash: string;
  options_approved_level?: number;
  options_trading_level?: number;
  trading_blocked: boolean;
  account_blocked: boolean;
  pattern_day_trader?: boolean;
}

interface AlpacaClock {
  is_open: boolean;
  timestamp: string;
  next_open: string;
  next_close: string;
}

interface AlpacaAsset {
  symbol: string;
  tradable: boolean;
  status: string;
}

async function alpacaGet<T>(path: string): Promise<T> {
  const env = getServerEnv();
  const response = await fetch(`${env.ALPACA_TRADING_BASE_URL}${path}`, {
    headers: {
      "APCA-API-KEY-ID": env.ALPACA_API_KEY_ID,
      "APCA-API-SECRET-KEY": env.ALPACA_API_SECRET_KEY,
      accept: "application/json"
    }
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText} on ${path} ${body.slice(0, 160)}`);
  }
  return (await response.json()) as T;
}

async function main(): Promise<void> {
  process.stdout.write(`\n${BOLD}Covenant preflight — T-00${RESET}\n\n`);

  // 1. Credentials present at all.
  const keyId = process.env.ALPACA_API_KEY_ID ?? "";
  const secret = process.env.ALPACA_API_SECRET_KEY ?? "";
  if (keyId === "" || secret === "") {
    add(
      "API credentials",
      false,
      "ALPACA_API_KEY_ID / ALPACA_API_SECRET_KEY are not set.",
      "Create .env.local from .env.example, then paste your PAPER keys from " +
        "app.alpaca.markets (make sure the dashboard is switched to Paper, then " +
        "Home -> API Keys -> Generate). Restart the dev server afterwards."
    );
    report();
    return;
  }
  add("API credentials", true, `Key ${keyId.slice(0, 6)}… present.`);

  // 2. Paper endpoint, not live.
  let env;
  try {
    env = getServerEnv();
    add("Paper endpoint", true, env.ALPACA_TRADING_BASE_URL);
  } catch (error) {
    add(
      "Environment",
      false,
      error instanceof Error ? error.message : String(error),
      "Fix the offending variable in .env.local."
    );
    report();
    return;
  }

  // 3. The account itself.
  let account: AlpacaAccount;
  try {
    account = await alpacaGet<AlpacaAccount>("/v2/account");
  } catch (error) {
    add(
      "Account reachable",
      false,
      error instanceof Error ? error.message : String(error),
      "A 401/403 means the keys are wrong, or they are LIVE keys being sent to the " +
        "paper endpoint. Regenerate paper keys with the dashboard switched to Paper."
    );
    report();
    return;
  }

  add("Account reachable", true, `Account ${account.id}`);
  add(
    "Account active",
    account.status === "ACTIVE" && !account.trading_blocked && !account.account_blocked,
    `status=${account.status} trading_blocked=${account.trading_blocked}`,
    "An inactive or blocked account cannot submit orders."
  );

  const equity = Number.parseFloat(account.equity);
  add(
    "Equity is $100,000",
    Math.abs(equity - 100_000) < 1,
    `equity=$${account.equity}`,
    "The submission requires a fresh $100k paper account. Reset it from the dashboard: " +
      "Paper account -> Account -> Reset (this wipes history, so do it BEFORE the run)."
  );

  const level = account.options_approved_level ?? account.options_trading_level ?? 0;
  add(
    "Options Level 3",
    level >= 3,
    `options level = ${level}`,
    "Paper accounts get Level 3 automatically, so a lower number usually means the " +
      "options agreement has not been accepted on this account yet: dashboard -> " +
      "Account -> Configure -> enable options trading."
  );

  // 4. Clock, so COV-04 has a session to verify against.
  try {
    const clock = await alpacaGet<AlpacaClock>("/v2/clock");
    add(
      "Market clock",
      true,
      clock.is_open
        ? `open now, closes ${clock.next_close}`
        : `closed, next open ${clock.next_open}`
    );
    if (!clock.is_open) {
      add(
        "Market open",
        false,
        "The market is closed, so a live order will not fill.",
        "Not a blocker for wiring up: COV-08 abstains while closed, which is correct " +
          "behaviour. Run the real order during regular US market hours."
      );
    }
  } catch (error) {
    add("Market clock", false, error instanceof Error ? error.message : String(error));
  }

  // 5. The two symbols we are allowed to trade.
  for (const symbol of ["SPY", "QQQ"]) {
    try {
      const asset = await alpacaGet<AlpacaAsset>(`/v2/assets/${symbol}`);
      add(`${symbol} tradable`, asset.tradable, `status=${asset.status}`);
    } catch (error) {
      add(`${symbol} tradable`, false, error instanceof Error ? error.message : String(error));
    }
  }

  report(account);
}

function report(account?: AlpacaAccount): void {
  for (const check of checks) {
    const mark = check.ok ? `${GREEN}ok  ${RESET}` : `${RED}FAIL${RESET}`;
    process.stdout.write(`  ${mark} ${check.label.padEnd(20)} ${DIM}${check.detail}${RESET}\n`);
    if (!check.ok && check.fix !== undefined) {
      process.stdout.write(`       ${YELLOW}->${RESET} ${check.fix}\n`);
    }
  }

  const failed = checks.filter((c) => !c.ok);
  process.stdout.write(`\n${checks.length - failed.length}/${checks.length} ready\n`);

  if (failed.length === 0 && account !== undefined) {
    process.stdout.write(`${GREEN}${BOLD}Preflight clear.${RESET}\n\n`);
    process.stdout.write(`Record this in docs/day1-evidence.md — the submission needs it:\n`);
    process.stdout.write(`  Alpaca paper account ID: ${BOLD}${account.id}${RESET}\n\n`);
    process.stdout.write(`Then place the first permit-bound order:\n`);
    process.stdout.write(`  ${DIM}npm run tick${RESET}\n\n`);
    return;
  }

  process.stdout.write(`${RED}${BOLD}Not ready.${RESET} Fix the lines above, then re-run.\n\n`);
  process.exit(1);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
