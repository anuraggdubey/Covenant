import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { clearOperatorSession, matchesOperatorSecret, operatorSessionActive, setOperatorSession } from "@/lib/operator/session";

export const dynamic = "force-dynamic";

const schema = z.object({ secret: z.string().min(1).max(512) });

export async function GET() {
  return NextResponse.json({ authenticated: await operatorSessionActive() });
}

export async function POST(request: NextRequest) {
  try {
    const body = schema.safeParse(await request.json());
    if (!body.success || !matchesOperatorSecret(body.data.secret)) {
      return NextResponse.json({ error: "Invalid operator secret." }, { status: 401 });
    }
    const response = NextResponse.json({ authenticated: true });
    setOperatorSession(response);
    return response;
  } catch {
    return NextResponse.json({ error: "Operator unlock is unavailable." }, { status: 503 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  clearOperatorSession(response);
  return response;
}
