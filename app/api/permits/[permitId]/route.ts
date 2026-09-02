import { NextResponse } from "next/server";

import { PermitStorageUnavailableError, getPermitStore } from "@/lib/storage/permit-store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ permitId: string }> }) {
  try {
    const { permitId } = await context.params;
    const permit = await getPermitStore().getPermit(permitId);
    return permit ? NextResponse.json({ permit, serverTime: new Date().toISOString() }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    const message = error instanceof PermitStorageUnavailableError ? error.message : "Permit details are unavailable.";
    return NextResponse.json({ error: "STORAGE_UNAVAILABLE", message }, { status: 503 });
  }
}
