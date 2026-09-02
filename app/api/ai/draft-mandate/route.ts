import { NextResponse } from "next/server";
import { draftMandateWithAi } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = body?.prompt;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "A non-empty prompt is required for the AI Mandate Copilot." },
        { status: 400 }
      );
    }

    const mandateText = await draftMandateWithAi(prompt.trim());

    return NextResponse.json({
      mandateText,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("AI Mandate Draft error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI drafting failed." },
      { status: 500 }
    );
  }
}
