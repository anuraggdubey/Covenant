import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/covenant"),
  
  // Alpaca Paper Trading & Market Data
  ALPACA_TRADING_BASE_URL: z.string().url().default("https://paper-api.alpaca.markets"),
  ALPACA_DATA_BASE_URL: z.string().url().default("https://data.alpaca.markets"),
  ALPACA_API_KEY_ID: z.string().optional().default(""),
  ALPACA_API_SECRET_KEY: z.string().optional().default(""),
  ALPACA_PAPER: z.enum(["true", "false"]).default("true"),
  ALPACA_DATA_FEED: z.enum(["indicative", "opra", "sip"]).default("indicative"),
  ALPACA_ALLOWED_UNDERLYINGS: z.string().default("SPY,QQQ"),
  ALPACA_OPTIONS_LEVEL_REQUIRED: z.coerce.number().default(3),

  // Permits & Nonce
  PERMIT_SIGNING_PRIVATE_KEY: z.string().optional().default(""),
  PERMIT_SIGNING_PUBLIC_KEY: z.string().optional().default(""),
  PERMIT_TTL_SECONDS: z.coerce.number().positive().default(60),
  PERMIT_NONCE_NAMESPACE: z.string().default("covenant-paper"),

  // Model Provider
  MODEL_PROVIDER: z.string().optional().default(""),
  MODEL_API_KEY: z.string().optional().default(""),
  MODEL_NAME: z.string().optional().default(""),
  MODEL_TIMEOUT_MS: z.coerce.number().positive().default(30000),

  // Auth & Cron
  APP_AUTH_SECRET: z.string().optional().default(""),
  CRON_SECRET: z.string().optional().default(""),
  KILL_SWITCH_CONFIRMATION: z.string().default("COVENANT_HALT"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let _serverEnv: ServerEnv | null = null;

/**
 * Validates server environment variables.
 * Fails closed if any environment variable violates constraints.
 */
export function getServerEnv(): ServerEnv {
  if (_serverEnv) {
    return _serverEnv;
  }

  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = JSON.stringify(result.error.format(), null, 2);
    throw new Error(`[FAIL-CLOSED] Invalid server environment configuration:\n${errorDetails}`);
  }

  // Enforce paper-trading only invariant: live URL is strictly forbidden
  if (
    result.data.ALPACA_TRADING_BASE_URL.includes("api.alpaca.markets") &&
    !result.data.ALPACA_TRADING_BASE_URL.includes("paper-api.alpaca.markets")
  ) {
    throw new Error(
      "[FAIL-CLOSED] Live trading URL detected! Covenant is locked to paper trading only."
    );
  }

  _serverEnv = result.data;
  return _serverEnv;
}
