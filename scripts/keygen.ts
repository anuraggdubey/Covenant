/**
 * Generate an Ed25519 permit signing key pair.
 *
 *   npm run keygen
 *
 * Paste the output into .env.local. Never commit the private half; .gitignore
 * already excludes .env.* apart from .env.example.
 */

import { generateKeyPairSync } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");

const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();

const encode = (pem: string): string => Buffer.from(pem, "utf8").toString("base64");

process.stdout.write("# Covenant permit signing keys — add to .env.local, never commit\n");
process.stdout.write(`PERMIT_SIGNING_PRIVATE_KEY=${encode(privatePem)}\n`);
process.stdout.write(`PERMIT_SIGNING_PUBLIC_KEY=${encode(publicPem)}\n`);
