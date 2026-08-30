import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/covenant"),

  ALPACA_TRADING_BASE_URL: z.string().url().default("https://paper-api.alpaca.markets"),
  ALPACA_DATA_BASE_URL: z.string().url().default("https://data.alpaca.markets"),
  ALPACA_API_KEY_ID: z.string().optional().default(""),
  ALPACA_API_SECRET_KEY: z.string().optional().default(""),
  ALPACA_PAPER: z.enum(["true", "false"]).default("true"),
  ALPACA_MOCK_MODE: z.enum(["true", "false"]).default("false"),
  ALPACA_DATA_FEED: z.enum(["indicative", "opra"]).default("indicative"),
  ALPACA_STOCK_DATA_FEED: z.enum(["iex", "sip"]).default("iex"),
  ALPACA_ALLOWED_UNDERLYINGS: z.string().default("SPY,QQQ"),
  ALPACA_OPTIONS_LEVEL_REQUIRED: z.coerce.number().int().min(1).max(3).default(3),

  PERMIT_SIGNING_PRIVATE_KEY: z.string().optional().default(""),
  PERMIT_SIGNING_PUBLIC_KEY: z.string().optional().default(""),
  PERMIT_TTL_SECONDS: z.coerce.number().positive().default(60),
  PERMIT_NONCE_NAMESPACE: z.string().default("covenant-paper"),

  MODEL_PROVIDER: z.string().optional().default(""),
  MODEL_API_KEY: z.string().optional().default(""),
  MODEL_NAME: z.string().optional().default(""),
  MODEL_TIMEOUT_MS: z.coerce.number().positive().default(30000),

  APP_AUTH_SECRET: z.string().optional().default(""),
  CRON_SECRET: z.string().optional().default(""),
  KILL_SWITCH_CONFIRMATION: z.string().default("COVENANT_HALT"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let serverEnv: ServerEnv | null = null;

function requireExactBaseUrl(rawUrl: string, expectedHostname: string, label: string): void {
  const url = new URL(rawUrl);
  const hasUnexpectedParts =
    url.protocol !== "https:" ||
    url.hostname !== expectedHostname ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    (url.pathname !== "" && url.pathname !== "/");

  if (hasUnexpectedParts) {
    throw new Error(`[FAIL-CLOSED] ${label} must be exactly https://${expectedHostname}.`);
  }
}

export function parseServerEnv(source: NodeJS.ProcessEnv): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(
      `[FAIL-CLOSED] Invalid server environment configuration:\n${JSON.stringify(result.error.format(), null, 2)}`
    );
  }

  const env = result.data;
  requireExactBaseUrl(env.ALPACA_TRADING_BASE_URL, "paper-api.alpaca.markets", "Alpaca trading URL");
  requireExactBaseUrl(env.ALPACA_DATA_BASE_URL, "data.alpaca.markets", "Alpaca data URL");

  if (env.ALPACA_PAPER !== "true") {
    throw new Error("[FAIL-CLOSED] Covenant is locked to Alpaca paper trading.");
  }

  const mockMode = env.ALPACA_MOCK_MODE === "true";
  const hasKey = env.ALPACA_API_KEY_ID.length > 0;
  const hasSecret = env.ALPACA_API_SECRET_KEY.length > 0;
  if (hasKey !== hasSecret) {
    throw new Error("[FAIL-CLOSED] Both Alpaca API credentials must be configured together.");
  }
  if (!mockMode && !hasKey) {
    throw new Error("[FAIL-CLOSED] Alpaca credentials are required unless ALPACA_MOCK_MODE=true.");
  }
  if (mockMode && env.NODE_ENV === "production") {
    throw new Error("[FAIL-CLOSED] Alpaca mock mode is forbidden in production.");
  }

  return env;
}

export function getServerEnv(): ServerEnv {
  if (!serverEnv) {
    serverEnv = parseServerEnv(process.env);
  }
  return serverEnv;
}

export function resetServerEnvForTests(): void {
  serverEnv = null;
}
