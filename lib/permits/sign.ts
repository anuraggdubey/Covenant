/**
 * Permit signing — Lane B, T-B3.
 *
 * THIS IS THE ONLY FILE IN THE REPOSITORY THAT READS THE PERMIT SIGNING
 * PRIVATE KEY. IMPLEMENTATION.md §3. If you need a signature somewhere else,
 * you need this function, not the key.
 *
 * `grep -rn "PERMIT_SIGNING_PRIVATE_KEY" lib/` must return exactly one file.
 */

import { createPrivateKey, createPublicKey, randomBytes, randomUUID, sign } from "node:crypto";
import type { KeyObject } from "node:crypto";

import { hashExcluding, sha256Hex } from "@/lib/canonical";
import { permitNonceNamespace, permitTtlSeconds } from "@/lib/env";
import type { TradePermit } from "@/types/domain";

/** Everything a permit needs except the parts signing itself produces. */
export type PermitClaims = Omit<
  TradePermit,
  "permitId" | "nonce" | "createdAt" | "expiresAt" | "signingKeyId" | "signature"
>;

export interface SignOptions {
  /** PEM or base64-encoded PEM. Defaults to PERMIT_SIGNING_PRIVATE_KEY. */
  privateKeyPem?: string;
  /** Injected for deterministic tests and replay. Defaults to Date.now(). */
  now?: Date;
  ttlSeconds?: number;
}

function decodePem(raw: string, label: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("-----BEGIN")) return trimmed.replace(/\\n/g, "\n");
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    if (decoded.includes("-----BEGIN")) return decoded;
  } catch {
    // fall through to the shared error below
  }
  throw new Error(`${label}: expected a PEM key, or base64-encoded PEM. Run \`npm run keygen\`.`);
}

function loadPrivateKey(explicit?: string): KeyObject {
  const raw = explicit ?? process.env.PERMIT_SIGNING_PRIVATE_KEY;
  if (raw === undefined || raw.trim() === "") {
    throw new Error(
      "PERMIT_SIGNING_PRIVATE_KEY is missing. Covenant refuses to sign permits without it."
    );
  }
  const key = createPrivateKey(decodePem(raw, "PERMIT_SIGNING_PRIVATE_KEY"));
  if (key.asymmetricKeyType !== "ed25519") {
    throw new Error(`Permit signing key must be ed25519, got ${String(key.asymmetricKeyType)}`);
  }
  return key;
}

/**
 * Stable identifier for a key pair: sha256 of the public SPKI DER, truncated.
 * Lets the executor confirm it is verifying against the key that signed.
 */
export function keyIdFromPublicKey(publicKey: KeyObject): string {
  const der = publicKey.export({ type: "spki", format: "der" });
  return sha256Hex(der.toString("hex")).slice(0, 16);
}

/** The exact bytes a signature covers: the permit's hash with `signature` omitted. */
export function permitSigningPayload(permit: Omit<TradePermit, "signature">): string {
  return hashExcluding({ ...permit, signature: "" } as TradePermit, "signature");
}

export function newNonce(): string {
  return `${permitNonceNamespace()}:${randomBytes(16).toString("hex")}`;
}

/**
 * Produce a signed, short-lived permit for exactly these claims.
 *
 * The caller (the Safety Kernel, and only the Safety Kernel) is responsible
 * for having re-fetched state and evaluated every invariant first. Signing is
 * mechanical: it does not re-check policy.
 */
export function signPermit(claims: PermitClaims, options: SignOptions = {}): TradePermit {
  const privateKey = loadPrivateKey(options.privateKeyPem);
  const now = options.now ?? new Date();
  const ttl = options.ttlSeconds ?? permitTtlSeconds();

  const unsigned: Omit<TradePermit, "signature"> = {
    ...claims,
    permitId: randomUUID(),
    nonce: newNonce(),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttl * 1000).toISOString(),
    signingKeyId: keyIdFromPublicKey(createPublicKey(privateKey))
  };

  const signature = sign(null, Buffer.from(permitSigningPayload(unsigned), "utf8"), privateKey);

  return { ...unsigned, signature: signature.toString("base64") };
}

/** Exposed so `npm run keygen` and tests can derive the public half. */
export function publicKeyPemFromPrivate(privateKeyPem: string): string {
  const publicKey = createPublicKey(createPrivateKey(decodePem(privateKeyPem, "private key")));
  return publicKey.export({ type: "spki", format: "pem" }).toString();
}
