import { NextRequest, NextResponse } from "next/server";

import { assertOperatorMutation } from "@/lib/operator/session";
import { PermitConsoleError, executePermit } from "@/lib/permits/console-service";
import { PermitStorageUnavailableError } from "@/lib/storage/permit-store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ permitId: string }> }) {
  try {
    await assertOperatorMutation(request);
    const { permitId } = await context.params;
    return NextResponse.json({ permit: await executePermit(permitId), serverTime: new Date().toISOString() });
  } catch (error) {
    if (error instanceof PermitConsoleError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    if (error instanceof PermitStorageUnavailableError) return NextResponse.json({ error: "STORAGE_UNAVAILABLE", message: error.message }, { status: 503 });
    return NextResponse.json({ error: "UNAUTHORIZED", message: error instanceof Error ? error.message : "Request rejected." }, { status: 401 });
  }
}
