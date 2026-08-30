# Mandate Corpus v1

Lane C owns the expected behavior in this directory. Lane B owns the compiler and contradiction checks that must satisfy it.

## Contents

- `corpus-v1.json`: 12 plain-English mandates and their expected compiler outcomes.
- `risk-profiles-v1.json`: exact Conservative, Balanced, and Aggressive settings for a $100,000 paper account.
- `risk-profile-rationale-v1.md`: dollar translations, rationale per field, and calibration limitations.
- `validate-corpus.mjs`: zero-dependency structural validation for the corpus.

Each `expectedCompiledPolicy` is materialized by taking `riskSettingsRef` from the profile document and applying `riskOverrides`. This keeps shared profile numbers in one authoritative location while still making every expected output deterministic.

Run:

```bash
node docs/mandates/validate-corpus.mjs
```

Expected summary:

```text
PASS mandate corpus v1: 12 cases, 4 blocked, 8 ready
```

The four required blocker classes are:

| Case | Expected contradiction |
| --- | --- |
| M-09 | `FORCED_TRADE_CONFLICT` |
| M-10 | `UNDEFINED_RISK_SCOPE` |
| M-11 | `RANGE_INVERSION` |
| M-12 | `RISK_CAP_CONTRADICTION` |

`READY` here means the plain-English draft has a coherent expected policy candidate. It does not mean the policy is active. Activation remains blocked until Lane B validates the schema, resolves contradictions, passes Break Me, versions the policy, hashes it, and records explicit activation.
