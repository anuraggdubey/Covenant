/**
 * One-command replay verifier — Lane B, T-B9.
 *
 *   npm run verify -- demo/run_manifest.json
 *
 * No credentials. No network. Exits non-zero if anything fails to reproduce.
 *
 * Read the two labels carefully, because the distinction is the honest part:
 * RECORDED means we can prove a captured fact has not been altered; it does
 * not mean we can prove it was true. REPRODUCED means we re-ran the check
 * here and got the same answer.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { verifyManifest, type VerificationCheck } from "@/lib/audit/verify";
import type { RunManifest } from "@/types/domain";

const ESC = String.fromCharCode(27);
const GREEN = `${ESC}[32m`;
const RED = `${ESC}[31m`;
const DIM = `${ESC}[2m`;
const BOLD = `${ESC}[1m`;
const RESET = `${ESC}[0m`;

function line(check: VerificationCheck): string {
  const mark = check.ok ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
  const where = check.eventId === undefined ? "" : `${DIM}${check.eventId}${RESET} `;
  return `  ${mark}  ${DIM}[${check.label}]${RESET} ${where}${check.id} — ${check.detail}`;
}

function main(): void {
  const target = process.argv[2];
  if (target === undefined) {
    process.stderr.write("usage: npm run verify -- <path-to-run_manifest.json>\n");
    process.exit(2);
  }

  const path = resolve(process.cwd(), target);
  let manifest: RunManifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8")) as RunManifest;
  } catch (error) {
    process.stderr.write(
      `Could not read a run manifest at ${target}: ` +
        `${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exit(2);
    return;
  }

  const report = verifyManifest(manifest);

  process.stdout.write(`\n${BOLD}Covenant replay verification${RESET}\n`);
  process.stdout.write(`${DIM}manifest${RESET} ${target}\n`);
  process.stdout.write(`${DIM}run${RESET}      ${report.runId}\n`);
  process.stdout.write(`${DIM}revision${RESET} ${report.codeRevision}\n\n`);

  // Failures first — a verifier nobody scrolls is a verifier nobody reads.
  const failed = report.checks.filter((c) => !c.ok);
  const passed = report.checks.filter((c) => c.ok);
  for (const check of failed) process.stdout.write(`${line(check)}\n`);
  if (failed.length > 0) process.stdout.write("\n");
  for (const check of passed) process.stdout.write(`${line(check)}\n`);

  process.stdout.write(
    `\n${report.counts.passed} passed, ${report.counts.failed} failed ` +
      `${DIM}(${report.counts.reproduced} reproduced, ${report.counts.recorded} recorded)${RESET}\n`
  );

  if (report.ok) {
    process.stdout.write(`${GREEN}${BOLD}Verified.${RESET} Every deterministic check reproduced.\n\n`);
    return;
  }

  process.stdout.write(`${RED}${BOLD}Verification failed.${RESET}\n\n`);
  process.exit(1);
}

main();
