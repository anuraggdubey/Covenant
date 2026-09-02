import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { assertOperatorMutation } from "@/lib/operator/session";
import { PermitConsoleError, signPreparedPermit } from "@/lib/permits/console-service";
import { PermitStorageUnavailableError } from "@/lib/storage/permit-store";

export const dynamic = "force-dynamic";
const schema = z.object({ draftId: z.string().uuid() });

export async function POST(request: NextRequest) {
  try {
    await assertOperatorMutation(request);
    const body = schema.safeParse(await request.json());
    if (!body.success) return NextResponse.json({ error: "Invalid draft id." }, { status: 400 });
    return NextResponse.json(await signPreparedPermit(body.data.draftId));
  } catch (error) {
    if (error instanceof PermitConsoleError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    if (error instanceof PermitStorageUnavailableError) return NextResponse.json({ error: "STORAGE_UNAVAILABLE", message: error.message }, { status: 503 });
    return NextResponse.json({ error: "UNAUTHORIZED", message: error instanceof Error ? error.message : "Request rejected." }, { status: 401 });
  }
}
