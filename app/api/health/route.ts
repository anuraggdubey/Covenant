import { NextResponse } from "next/server";
import { AlpacaReadClient } from "@/lib/alpaca/client";
import { getServerEnv } from "@/lib/env/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const env = getServerEnv();
    const readClient = new AlpacaReadClient();
    
    const clock = await readClient.getClock();
    const account = await readClient.getAccount();

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      mode: env.ALPACA_PAPER === "true" ? "PAPER_TRADING_LOCKED" : "UNKNOWN",
      alpaca: {
        connected: true,
        tradingBaseUrl: env.ALPACA_TRADING_BASE_URL,
        dataBaseUrl: env.ALPACA_DATA_BASE_URL,
        feed: env.ALPACA_DATA_FEED,
        marketOpen: clock.is_open,
        accountStatus: account.status,
        optionsApprovedLevel: account.options_approved_level,
        equity: account.equity,
      },
      invariants: {
        failClosed: true,
        powerlessAlpha: true,
        level3OptionsApproved: account.options_approved_level >= 3,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        status: "degraded",
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
