/**
 * Permit verification — Lane B, T-B3.
 *
 * Reads the PUBLIC key only. The executor can check a signature; it cannot
 * mint one. That asymmetry is the whole point of the capability split, so
 * never import lib/permits/sign.ts from lib/execution/**.
 */

import { createPublicKey, verify } from "node:crypto";
import type { KeyObject } from "node:crypto";

import { hashEquals } from "@/lib/canonical";
import type { TradePermit } from "@/types/domain";

import { keyIdFromPublicKey, permitSigningPayload } from "./sign";

export type SignatureFailure =
  | "PUBLIC_KEY_MISSING"
  | "KEY_ID_MISMATCH"
  | "SIGNATURE_MALFORMED"
  | "SIGNATURE_INVALID";

export type SignatureCheck = { ok: true } | { ok: false; failure: SignatureFailure };

function decodePem(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("-----BEGIN")) return trimmed.replace(/\\n/g, "\n");
  const decoded = Buffer.from(trimmed, "base64").toString("utf8");
  if (decoded.includes("-----BEGIN")) return decoded;
  throw new Error("PERMIT_SIGNING_PUBLIC_KEY: expected PEM or base64-encoded PEM.");
}

function loadPublicKey(explicit?: string): KeyObject | null {
  const raw = explicit ?? process.env.PERMIT_SIGNING_PUBLIC_KEY;
  if (raw === undefined || raw.trim() === "") return null;
  return createPublicKey(decodePem(raw));
}

/**
 * Verify a permit's Ed25519 signature and that it came from the key we expect.
 *
 * Returns a discriminated result rather than throwing: the executor turns
 * every failure into a rejection reason a judge can read on screen.
 */
export function verifyPermitSignature(
  permit: TradePermit,
  options: { publicKeyPem?: string } = {}
): SignatureCheck {
  const publicKey = loadPublicKey(options.publicKeyPem);
  if (publicKey === null) return { ok: false, failure: "PUBLIC_KEY_MISSING" };

  if (!hashEquals(permit.signingKeyId, keyIdFromPublicKey(publicKey))) {
    return { ok: false, failure: "KEY_ID_MISMATCH" };
  }

  let signatureBytes: Buffer;
  try {
    signatureBytes = Buffer.from(permit.signature, "base64");
    if (signatureBytes.length !== 64) return { ok: false, failure: "SIGNATURE_MALFORMED" };
  } catch {
    return { ok: false, failure: "SIGNATURE_MALFORMED" };
  }

  const payload = Buffer.from(permitSigningPayload(permit), "utf8");
  const valid = verify(null, payload, publicKey, signatureBytes);
  return valid ? { ok: true } : { ok: false, failure: "SIGNATURE_INVALID" };
}

/** TTL check, isolated so the expiry attack has one obvious place to live. */
export function isExpired(permit: TradePermit, now: Date = new Date()): boolean {
  const expiresAt = Date.parse(permit.expiresAt);
  if (!Number.isFinite(expiresAt)) return true; // unparseable TTL fails closed
  return now.getTime() >= expiresAt;
}
