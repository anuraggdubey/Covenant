export interface AlpacaAccountResponse {
  id: string;
  account_number: string;
  status: string;
  crypto_status?: string;
  currency: string;
  buying_power: string;
  regt_buying_power: string;
  daytrading_buying_power: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  last_equity: string;
  multiplier: string;
  initial_margin: string;
  maintenance_margin: string;
  last_maintenance_margin: string;
  sma: string;
  daytrade_count: number;
  balance_asof: string;
  pattern_day_trader: boolean;
  options_approved_level: number;
  options_trading_level: number;
}

export interface AlpacaClockResponse {
  timestamp: string;
  is_open: boolean;
  next_open: string;
  next_close: string;
}

export interface AlpacaAssetResponse {
  id: string;
  class: string;
  exchange: string;
  symbol: string;
  name: string;
  status: string;
  tradable: boolean;
  marginable: boolean;
  shortable: boolean;
  easy_to_borrow: boolean;
  fractionable: boolean;
  has_options?: boolean;
}

export interface AlpacaOptionQuote {
  ap: number; // ask price
  as: number; // ask size
  bp: number; // bid price
  bs: number; // bid size
  t: string;  // timestamp
}

export interface AlpacaOptionTrade {
  p: number;  // price
  s: number;  // size
  t: string;  // timestamp
  c?: string[]; // conditions
}

export interface AlpacaOptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface AlpacaOptionSnapshotItem {
  latestQuote?: AlpacaOptionQuote;
  latestTrade?: AlpacaOptionTrade;
  greeks?: AlpacaOptionGreeks;
  impliedVolatility?: number;
  open_interest?: number;
  openInterest?: number;
}

export interface AlpacaOptionSnapshotsResponse {
  snapshots: Record<string, AlpacaOptionSnapshotItem>;
  next_page_token?: string | null;
}

export interface AlpacaStockSnapshotResponse {
  latestTrade?: {
    p: number;
    s: number;
    t: string;
  };
  latestQuote?: {
    ap: number;
    as: number;
    bp: number;
    bs: number;
    t: string;
  };
  minuteBar?: {
    c: number;
    h: number;
    l: number;
    n: number;
    o: number;
    t: string;
    v: number;
    vw: number;
  };
  dailyBar?: {
    c: number;
    h: number;
    l: number;
    n: number;
    o: number;
    t: string;
    v: number;
    vw: number;
  };
  prevDailyBar?: {
    c: number;
    h: number;
    l: number;
    n: number;
    o: number;
    t: string;
    v: number;
    vw: number;
  };
}

export interface AlpacaBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  n: number;
  vw: number;
}

export interface AlpacaBarsResponse {
  bars: Record<string, AlpacaBar[]>;
  next_page_token?: string | null;
}
