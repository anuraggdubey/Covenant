import { NextRequest, NextResponse } from "next/server";

import { PermitStorageUnavailableError, getPermitStore } from "@/lib/storage/permit-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const value = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10);
  const limit = Number.isInteger(value) ? Math.min(Math.max(value, 1), 100) : 50;
  try {
    return NextResponse.json({ permits: await getPermitStore().list(limit), serverTime: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof PermitStorageUnavailableError ? error.message : "Permit history is unavailable.";
    return NextResponse.json({ error: "STORAGE_UNAVAILABLE", message }, { status: 503 });
  }
}
