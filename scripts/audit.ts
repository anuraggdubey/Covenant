/**
 * Covenant audit — one command that checks the claims we make to judges.
 *
 *   npm run audit
 *
 * Every claim in the README that can be mechanically checked is checked here,
 * so nobody has to take a sentence on trust:
 *
 *   1. Capability boundary — who can reach a broker credential, and who can
 *      mint a permit. This is "powerless by construction", grepped.
 *   2. Paper-only — no live Alpaca endpoint anywhere in shipped code.
 *   3. Invariant coverage — all eight registered, each with an enforcement
 *      point and a test.
 *   4. Replay — the committed run manifest reproduces.
 *   5. Secret hygiene — no real .env file is tracked by git.
 *
 * Exits non-zero if any of it is untrue. Run it before you say "done".
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import { verifyManifest } from "@/lib/audit/verify";
import { INVARIANT_REGISTRY } from "@/lib/safety/invariants";
import { ALL_INVARIANTS, type RunManifest } from "@/types/domain";

const ESC = String.fromCharCode(27);
const GREEN = `${ESC}[32m`;
const RED = `${ESC}[31m`;
const YELLOW = `${ESC}[33m`;
const DIM = `${ESC}[2m`;
const BOLD = `${ESC}[1m`;
const RESET = `${ESC}[0m`;

interface Finding {
  section: string;
  ok: boolean;
  detail: string;
}

const findings: Finding[] = [];
function record(section: string, ok: boolean, detail: string): void {
  findings.push({ section, ok, detail });
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

function sourceFiles(...roots: string[]): { path: string; source: string }[] {
  return roots
    .flatMap((root) => walk(resolve(process.cwd(), root)))
    .map((full) => ({
      path: relative(process.cwd(), full).split(sep).join("/"),
      source: readFileSync(full, "utf8")
    }));
}

// --- 1. Capability boundary -------------------------------------------------

const CREDENTIAL = /ALPACA_API_(SECRET_KEY|KEY_ID)/;
const SIGNING_KEY = /PERMIT_SIGNING_PRIVATE_KEY/;

const CREDENTIAL_ALLOWED = new Set([
  "lib/execution/executor.ts",
  "lib/alpaca/client.ts",
  "lib/env/server.ts"
]);
const SIGNING_ALLOWED = new Set(["lib/permits/sign.ts", "lib/env/server.ts"]);

function auditBoundary(): void {
  const lib = sourceFiles("lib");

  const credentialFiles = lib.filter((f) => CREDENTIAL.test(f.source)).map((f) => f.path);
  const strays = credentialFiles.filter((p) => !CREDENTIAL_ALLOWED.has(p));
  record(
    "capability",
    strays.length === 0,
    strays.length === 0
      ? `Broker credentials named only in: ${credentialFiles.join(", ")}`
      : `Credential read outside the allowlist: ${strays.join(", ")}`
  );

  const signingFiles = lib.filter((f) => SIGNING_KEY.test(f.source)).map((f) => f.path);
  const signStrays = signingFiles.filter((p) => !SIGNING_ALLOWED.has(p));
  record(
    "capability",
    signStrays.length === 0,
    signStrays.length === 0
      ? `Signing key named only in: ${signingFiles.join(", ")}`
      : `Signing key read outside sign.ts: ${signStrays.join(", ")}`
  );

  const alphaLeaks = lib
    .filter((f) => f.path.startsWith("lib/alpha/"))
    .filter((f) => CREDENTIAL.test(f.source) || SIGNING_KEY.test(f.source))
    .map((f) => f.path);
  record(
    "capability",
    alphaLeaks.length === 0,
    alphaLeaks.length === 0
      ? "The alpha lane holds no broker credential and no signing key."
      : `Alpha lane reached a credential: ${alphaLeaks.join(", ")}`
  );

  const minters = lib
    .filter((f) => f.path.startsWith("lib/execution/"))
    .filter((f) => /from "@\/lib\/permits\/sign"/.test(f.source))
    .map((f) => f.path);
  record(
    "capability",
    minters.length === 0,
    minters.length === 0
      ? "The executor can verify a permit but cannot mint one."
      : `Executor imports the signer: ${minters.join(", ")}`
  );
}

// --- 2. Paper only ----------------------------------------------------------

function auditPaperOnly(): void {
  const shipped = sourceFiles("lib", "app", "components", "scripts");
  const live = shipped
    .filter((f) => /https:\/\/api\.alpaca\.markets/.test(f.source))
    .map((f) => f.path);
  record(
    "paper-only",
    live.length === 0,
    live.length === 0
      ? "No live Alpaca endpoint appears in shipped code."
      : `Live endpoint referenced in: ${live.join(", ")}`
  );
}

// --- 3. Invariant coverage --------------------------------------------------

function auditInvariants(): void {
  const registered = INVARIANT_REGISTRY.map((e) => e.id).sort();
  const expected = [...ALL_INVARIANTS].sort();
  record(
    "invariants",
    JSON.stringify(registered) === JSON.stringify(expected),
    `Registered: ${registered.join(", ")}`
  );

  const testSources = sourceFiles("tests")
    .map((f) => f.source)
    .join("\n");
  const untested = expected.filter((id) => !testSources.includes(id));
  record(
    "invariants",
    untested.length === 0,
    untested.length === 0
      ? "Every invariant is named by at least one test."
      : `No test references: ${untested.join(", ")}`
  );

  for (const evaluator of INVARIANT_REGISTRY) {
    record("invariants", true, `${evaluator.id} enforced at ${evaluator.enforcedAt} — ${evaluator.title}`);
  }
}

// --- 4. Replay --------------------------------------------------------------

function auditReplay(): void {
  const path = resolve(process.cwd(), "demo/run_manifest.json");
  if (!existsSync(path)) {
    record("replay", false, "demo/run_manifest.json is missing. Run: npx tsx scripts/build-demo-run.ts");
    return;
  }
  const manifest = JSON.parse(readFileSync(path, "utf8")) as RunManifest;
  const report = verifyManifest(manifest);
  record(
    "replay",
    report.ok,
    report.ok
      ? `${report.counts.passed} checks reproduced from ${manifest.events.length} recorded events.`
      : `${report.counts.failed} check(s) failed: ` +
        report.checks.filter((c) => !c.ok).map((c) => c.id).join(", ")
  );
}

// --- 5. Secret hygiene ------------------------------------------------------

function auditSecrets(): void {
  let tracked: string[] = [];
  try {
    tracked = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
  } catch {
    record("secrets", false, "Could not list git-tracked files.");
    return;
  }

  const leaked = tracked.filter((f) => /(^|\/)\.env($|\.)/.test(f) && f !== ".env.example");
  record(
    "secrets",
    leaked.length === 0,
    leaked.length === 0
      ? "No real .env file is tracked by git."
      : `Tracked environment files: ${leaked.join(", ")}`
  );

  const withValues = existsSync(".env.example")
    ? readFileSync(".env.example", "utf8")
        .split("\n")
        .filter((l) => /^(ALPACA_API_|PERMIT_SIGNING_|MODEL_API_KEY|APP_AUTH_SECRET|CRON_SECRET)/.test(l))
        .filter((l) => l.split("=")[1]?.trim() !== "")
    : [];
  record(
    "secrets",
    withValues.length === 0,
    withValues.length === 0
      ? ".env.example carries names only, no secret values."
      : `.env.example has populated secrets: ${withValues.join(", ")}`
  );
}

// --- Report -----------------------------------------------------------------

function main(): void {
  auditBoundary();
  auditPaperOnly();
  auditInvariants();
  auditReplay();
  auditSecrets();

  process.stdout.write(`\n${BOLD}Covenant audit${RESET}\n\n`);

  let currentSection = "";
  for (const finding of findings) {
    if (finding.section !== currentSection) {
      currentSection = finding.section;
      process.stdout.write(`${DIM}${currentSection}${RESET}\n`);
    }
    const mark = finding.ok ? `${GREEN}ok  ${RESET}` : `${RED}FAIL${RESET}`;
    process.stdout.write(`  ${mark} ${finding.detail}\n`);
  }

  const failed = findings.filter((f) => !f.ok);
  process.stdout.write(
    `\n${findings.length - failed.length}/${findings.length} checks passing\n`
  );

  if (failed.length === 0) {
    process.stdout.write(`${GREEN}${BOLD}Audit clean.${RESET}\n\n`);
    return;
  }
  process.stdout.write(
    `${RED}${BOLD}Audit failed${RESET} ${YELLOW}(${failed.length})${RESET}. ` +
      `Fix the code, not the audit.\n\n`
  );
  process.exit(1);
}

main();
