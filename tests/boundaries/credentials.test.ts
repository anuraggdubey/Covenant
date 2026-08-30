/**
 * "Powerless by construction" as a test, not a claim.
 *
 * IMPLEMENTATION.md §1 non-negotiable 1 and §3. This test walks lib/ and
 * asserts the capability boundary holds structurally: exactly which files may
 * read a broker credential, exactly which file may read the signing key, and
 * that the alpha lane can reach neither.
 *
 * When Lane A lands lib/alpha/**, this test starts guarding it automatically.
 * If someone moves a credential read, this fails before review does.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

const LIB_ROOT = join(process.cwd(), "lib");

const BROKER_CREDENTIAL_PATTERN = /ALPACA_API_(SECRET_KEY|KEY_ID)/;
const SIGNING_KEY_PATTERN = /PERMIT_SIGNING_PRIVATE_KEY/;

/** The only files permitted to read Alpaca credentials. */
const BROKER_CREDENTIAL_ALLOWLIST = new Set(["lib/execution/executor.ts", "lib/alpaca/client.ts"]);

/** The only file permitted to read the permit signing private key. */
const SIGNING_KEY_ALLOWLIST = new Set(["lib/permits/sign.ts"]);

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out = out.concat(walk(full));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

function libFiles(): { path: string; source: string }[] {
  return walk(LIB_ROOT).map((full) => ({
    path: relative(process.cwd(), full).split(sep).join("/"),
    source: readFileSync(full, "utf8")
  }));
}

describe("capability boundary", () => {
  it("only the executor and the read-path client may read Alpaca credentials", () => {
    const offenders = libFiles()
      .filter((f) => BROKER_CREDENTIAL_PATTERN.test(f.source))
      .map((f) => f.path)
      .filter((path) => !BROKER_CREDENTIAL_ALLOWLIST.has(path));

    expect(offenders).toEqual([]);
  });

  it("only lib/permits/sign.ts may read the permit signing private key", () => {
    const offenders = libFiles()
      .filter((f) => SIGNING_KEY_PATTERN.test(f.source))
      .map((f) => f.path)
      .filter((path) => !SIGNING_KEY_ALLOWLIST.has(path));

    expect(offenders).toEqual([]);
  });

  it("nothing under lib/alpha/** can reach a credential or the signing key", () => {
    const offenders = libFiles()
      .filter((f) => f.path.startsWith("lib/alpha/"))
      .filter((f) => BROKER_CREDENTIAL_PATTERN.test(f.source) || SIGNING_KEY_PATTERN.test(f.source))
      .map((f) => f.path);

    expect(offenders).toEqual([]);
  });

  it("the executor can verify a signature but never mint one", () => {
    const offenders = libFiles()
      .filter((f) => f.path.startsWith("lib/execution/"))
      .filter((f) => /from "@\/lib\/permits\/sign"/.test(f.source))
      .map((f) => f.path);

    expect(offenders).toEqual([]);
  });

  it("no live Alpaca endpoint appears anywhere in lib/", () => {
    const offenders = libFiles()
      .filter((f) => /https:\/\/api\.alpaca\.markets/.test(f.source))
      .map((f) => f.path);

    expect(offenders).toEqual([]);
  });
});
