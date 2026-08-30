import { NextResponse } from "next/server";
import { executeTick } from "@/lib/alpha/loop";
import { getServerEnv } from "@/lib/env/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleTick(request);
}

export async function POST(request: Request) {
  return handleTick(request);
}

async function handleTick(request: Request) {
  try {
    const env = getServerEnv();

    // Verify CRON_SECRET if configured
    if (env.CRON_SECRET) {
      const authHeader = request.headers.get("Authorization");
      const url = new URL(request.url);
      const queryKey = url.searchParams.get("key");

      const expectedBearer = `Bearer ${env.CRON_SECRET}`;
      if (authHeader !== expectedBearer && queryKey !== env.CRON_SECRET) {
        return NextResponse.json(
          { error: "Unauthorized: Invalid or missing CRON_SECRET" },
          { status: 401 }
        );
      }
    }

    const result = await executeTick();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Tick execution failed",
        details: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
