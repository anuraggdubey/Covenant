import { z } from "zod";

const finiteNumber = z.number().finite();
const decimalString = z.string().min(1);

export type OptionDataFeed = "indicative" | "opra";
export type StockDataFeed = "iex" | "sip";

export const alpacaAccountSchema = z.object({
  id: z.string().min(1),
  account_number: z.string().min(1),
  status: z.string().min(1),
  crypto_status: z.string().optional(),
  currency: z.string().min(1),
  buying_power: decimalString,
  regt_buying_power: decimalString,
  daytrading_buying_power: decimalString.optional(),
  cash: decimalString,
  portfolio_value: decimalString,
  equity: decimalString,
  last_equity: decimalString,
  multiplier: decimalString,
  initial_margin: decimalString,
  maintenance_margin: decimalString,
  last_maintenance_margin: decimalString,
  sma: decimalString,
  daytrade_count: z.number().int().nonnegative().optional(),
  balance_asof: z.string().min(1),
  pattern_day_trader: z.boolean().optional(),
  options_approved_level: z.number().int().nonnegative(),
  options_trading_level: z.number().int().nonnegative(),
}).passthrough();

export type AlpacaAccountResponse = z.infer<typeof alpacaAccountSchema>;

export const alpacaClockSchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  is_open: z.boolean(),
  next_open: z.string().datetime({ offset: true }),
  next_close: z.string().datetime({ offset: true }),
}).passthrough();

export type AlpacaClockResponse = z.infer<typeof alpacaClockSchema>;

export const alpacaAssetSchema = z.object({
  id: z.string().min(1),
  class: z.string().min(1),
  exchange: z.string().min(1),
  symbol: z.string().min(1),
  name: z.string(),
  status: z.string().min(1),
  tradable: z.boolean(),
  marginable: z.boolean(),
  shortable: z.boolean(),
  easy_to_borrow: z.boolean(),
  fractionable: z.boolean(),
  has_options: z.boolean().optional(),
}).passthrough();

export type AlpacaAssetResponse = z.infer<typeof alpacaAssetSchema>;

export const alpacaQuoteSchema = z.object({
  ap: finiteNumber,
  as: z.number().int().nonnegative(),
  bp: finiteNumber,
  bs: z.number().int().nonnegative(),
  t: z.string().datetime({ offset: true }),
}).passthrough();

export type AlpacaOptionQuote = z.infer<typeof alpacaQuoteSchema>;

export const alpacaTradeSchema = z.object({
  p: finiteNumber,
  s: z.number().int().nonnegative(),
  t: z.string().datetime({ offset: true }),
  c: z.array(z.string()).optional(),
}).passthrough();

export type AlpacaOptionTrade = z.infer<typeof alpacaTradeSchema>;

export const alpacaGreeksSchema = z.object({
  delta: finiteNumber,
  gamma: finiteNumber,
  theta: finiteNumber,
  vega: finiteNumber,
}).passthrough();

export type AlpacaOptionGreeks = z.infer<typeof alpacaGreeksSchema>;

export const alpacaBarSchema = z.object({
  t: z.string().datetime({ offset: true }),
  o: finiteNumber,
  h: finiteNumber,
  l: finiteNumber,
  c: finiteNumber,
  v: z.number().nonnegative(),
  n: z.number().int().nonnegative(),
  vw: finiteNumber,
}).passthrough();

export type AlpacaBar = z.infer<typeof alpacaBarSchema>;

export const alpacaOptionSnapshotItemSchema = z.object({
  latestQuote: alpacaQuoteSchema.optional(),
  latestTrade: alpacaTradeSchema.optional(),
  dailyBar: alpacaBarSchema.optional(),
  greeks: alpacaGreeksSchema.optional(),
  impliedVolatility: finiteNumber.optional(),
  open_interest: z.number().int().nonnegative().optional(),
  openInterest: z.number().int().nonnegative().optional(),
}).passthrough();

export type AlpacaOptionSnapshotItem = z.infer<typeof alpacaOptionSnapshotItemSchema>;

export const alpacaOptionSnapshotsSchema = z.object({
  snapshots: z.record(z.string(), alpacaOptionSnapshotItemSchema),
  next_page_token: z.string().nullable().optional(),
}).passthrough();

export type AlpacaOptionSnapshotsResponse = z.infer<typeof alpacaOptionSnapshotsSchema>;

export const alpacaStockSnapshotSchema = z.object({
  latestTrade: alpacaTradeSchema.optional(),
  latestQuote: alpacaQuoteSchema.optional(),
  minuteBar: alpacaBarSchema.optional(),
  dailyBar: alpacaBarSchema.optional(),
  prevDailyBar: alpacaBarSchema.optional(),
}).passthrough();

export type AlpacaStockSnapshotResponse = z.infer<typeof alpacaStockSnapshotSchema>;

export const alpacaBarsSchema = z.object({
  bars: z.record(z.string(), z.array(alpacaBarSchema)),
  next_page_token: z.string().nullable().optional(),
}).passthrough();

export type AlpacaBarsResponse = z.infer<typeof alpacaBarsSchema>;
