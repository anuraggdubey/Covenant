/**
 * Operator-activated policy for this process.
 *
 * The model cannot activate a policy. Mandate Studio's Activate button is an
 * operator action: compile must be READY, then materialise + activate.
 * executeTick reads this store; tests pass an explicit policy and still win.
 */

import { activate, compileMandate, materialisePolicy, type CompileOptions } from "@/lib/mandates/compile";
import type { Policy } from "@/types/domain";

let operatorActivePolicy: Policy | null = null;

export function getOperatorActivePolicy(): Policy | null {
  return operatorActivePolicy;
}

export function clearOperatorActivePolicy(): void {
  operatorActivePolicy = null;
}

export function setOperatorActivePolicy(policy: Policy): void {
  if (policy.status !== "ACTIVE") {
    throw new Error(`[FAIL-CLOSED] Only an ACTIVE policy can be installed (got ${policy.status}).`);
  }
  operatorActivePolicy = policy;
}

export function activateMandateFromText(
  mandateText: string,
  now: string,
  meta?: { id?: string; version?: number },
  options?: CompileOptions
): Policy {
  const trimmed = mandateText.trim();
  if (trimmed.length === 0) {
    throw new Error("mandateText is required.");
  }
  const compiled = compileMandate(trimmed, options);
  const draft = materialisePolicy(compiled, {
    id: meta?.id ?? `pol_operator_${now.replace(/[:.]/g, "").slice(0, 15)}`,
    version: meta?.version ?? 1,
    createdAt: now
  });
  const live = activate(draft, now);
  setOperatorActivePolicy(live);
  return live;
}
