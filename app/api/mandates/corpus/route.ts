import { NextResponse } from "next/server";
import corpus from "@/docs/mandates/corpus-v1.json";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(corpus);
}
