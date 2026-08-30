import { NextResponse } from "next/server";
import { executeTick } from "@/lib/alpha/loop";
import { getServerEnv } from "@/lib/env/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleTick(request);
}

async function handleTick(request: Request) {
  try {
    const env = getServerEnv();

    if (!env.CRON_SECRET) {
      throw new Error("[FAIL-CLOSED] CRON_SECRET is required for the tick route.");
    }
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await executeTick();
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Tick execution failed", err);
    return NextResponse.json(
      {
        error: "Tick execution failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
