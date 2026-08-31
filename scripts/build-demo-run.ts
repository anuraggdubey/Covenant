/**
 * Regenerate demo/run_manifest.json.
 *
 *   npx tsx scripts/build-demo-run.ts
 *
 * Signs with a throwaway Ed25519 key that is never written anywhere: only the
 * public half goes into the manifest, which is all a verifier needs. Re-run
 * this whenever the kernel's behaviour legitimately changes, and commit the
 * result — the manifest is the artefact judges replay.
 */

import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { buildDemoRun } from "@/lib/audit/demo-run";
import { verifyManifest } from "@/lib/audit/verify";

async function main(): Promise<void> {
  const { privateKey } = generateKeyPairSync("ed25519");
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

  const manifest = await buildDemoRun(privateKeyPem);

  // Never ship a manifest that does not verify.
  const report = verifyManifest(manifest);
  if (!report.ok) {
    for (const failed of report.checks.filter((c) => !c.ok)) {
      process.stderr.write(`  FAIL ${failed.id} ${failed.eventId ?? ""} ${failed.detail}\n`);
    }
    throw new Error("Generated manifest does not verify. Refusing to write it.");
  }

  const target = resolve(process.cwd(), "demo/run_manifest.json");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  process.stdout.write(
    `Wrote demo/run_manifest.json — ${manifest.events.length} events, ` +
      `${report.counts.passed} checks passing.\n`
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
