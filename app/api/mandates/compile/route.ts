import { NextResponse } from "next/server";
import { compileMandate } from "@/lib/mandates/compile";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mandateText = body?.mandateText;

    if (typeof mandateText !== "string" || mandateText.trim().length === 0) {
      return NextResponse.json(
        { error: "mandateText is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    const result = compileMandate(mandateText.trim());

    return NextResponse.json({
      status: result.draft.status,
      echo: result.echo,
      draft: {
        riskProfile: result.draft.riskProfile,
        allowedUnderlyings: result.draft.allowedUnderlyings,
        allowedStructures: result.draft.allowedStructures,
        missingStateAction: result.draft.missingStateAction,
        modelAuthority: result.draft.modelAuthority,
        invariants: result.draft.invariants,
        riskOverrides: result.draft.riskOverrides,
      },
      contradictions: result.contradictions.map((c) => ({
        code: c.code,
        fields: c.fields,
        reason: c.explanation,
      })),
    });
  } catch (err: unknown) {
    console.error("Mandate compile failed", err);
    return NextResponse.json(
      { error: "Failed to compile mandate" },
      { status: 500 }
    );
  }
}
