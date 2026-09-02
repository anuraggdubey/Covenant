import { NextResponse } from "next/server";
import { explainCandidateWithAi, type CandidateContext } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const candidate = body?.candidate as CandidateContext;

    if (!candidate || !candidate.underlying || !candidate.structure) {
      return NextResponse.json(
        { error: "Candidate parameters are required." },
        { status: 400 }
      );
    }

    const explanation = await explainCandidateWithAi(candidate);

    return NextResponse.json({
      explanation,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("AI Candidate Explanation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI explanation failed." },
      { status: 500 }
    );
  }
}
