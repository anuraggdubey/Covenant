/**
 * Lane A's canonical-hash entry point.
 *
 * This file used to carry its own implementation. It now re-exports the one
 * in lib/canonical.ts, because two canonicalisers meant Lane A could hash a
 * snapshot one way and Lane B verify it another — every permit binding check
 * would then fail with no visible cause. Same bytes, same digest, one
 * implementation. See IMPLEMENTATION.md Decision Log, 31 Aug 2026.
 *
 * The exported names are unchanged, so no Lane A call site needs editing.
 */

export {
  canonicalJsonStringify,
  canonicalize,
  hashEquals,
  hashExcluding,
  hashObject,
  sha256Canonical,
  sha256Hex
} from "@/lib/canonical";
