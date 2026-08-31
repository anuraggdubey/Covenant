---
version: alpha
name: Covenant
description: >-
  Design system for a proof-carrying options agent. An audit surface, not a
  trading terminal. Every token below is live in app/globals.css and is
  enforced by tests/design/design-tokens.test.ts.
colors:
  surface: "#ffffff"
  surface-subtle: "#f7f8fa"
  surface-sunken: "#f0f2f5"
  border: "#e4e7ec"
  border-strong: "#d0d5dd"
  text: "#0c111d"
  text-secondary: "#475467"
  text-muted: "#8b95a5"
  accent: "#1652f0"
  accent-hover: "#0f43cc"
  accent-subtle: "#eef3ff"
  success: "#067647"
  success-subtle: "#ecfdf3"
  warning: "#b54708"
  warning-subtle: "#fffaeb"
  danger: "#b42318"
  danger-subtle: "#fef3f2"
  info: "#5925dc"
  info-subtle: "#f4f3ff"
typography:
  h1:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: 600
    letterSpacing: "-0.022em"
  h2:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: 600
  h3:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: 600
  body:
    fontFamily: Inter
    fontSize: 0.875rem
    lineHeight: 1.55
  label-caps:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: 600
    letterSpacing: 0.08em
    textTransform: uppercase
  mono:
    fontFamily: ui-monospace
    fontSize: 0.8125rem
rounded:
  sm: 6px
  md: 10px
  full: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  card:
    background: "{colors.surface}"
    border: "{colors.border}"
    radius: "{rounded.md}"
    padding: "{spacing.lg}"
  badge:
    radius: "{rounded.full}"
    fontSize: "{typography.label-caps.fontSize}"
  button-primary:
    background: "{colors.accent}"
    color: "{colors.surface}"
    radius: "{rounded.sm}"
  button-secondary:
    background: "{colors.surface}"
    border: "{colors.border-strong}"
    radius: "{rounded.sm}"
  nav-item:
    color: "{colors.text-secondary}"
    activeColor: "{colors.accent}"
    activeBackground: "{colors.accent-subtle}"
---

## Overview

Covenant is a proof surface for a system whose entire pitch is restraint. It
refuses trades, bounds its own authority, and hands you evidence. The interface
has to look like it means that.

So the reference points are **Coinbase** (calm surfaces, one accent, crisp data
tables), **Ledger** (precision, high contrast, monospace for cryptographic
material), and **Google/Material** (type hierarchy, functional colour). Not a
trading terminal. No glow, no glassmorphism, no gradient used as decoration.

The argument is aesthetic as well as practical: a page that looks careful
supports a claim about being careful. A neon dashboard undercuts the sentence
"this agent can prove it never exceeded its mandate" no matter how true that
sentence is.

**Every token in the front matter above is live in `app/globals.css`.** A test
fails if the two drift apart, so this file is not documentation that rots — it
is the source the CSS is checked against.

## Colors

One accent. Everything else is either surface, text, or state. If you find
yourself reaching for a colour that is not below, the answer is almost always a
neutral.

- **accent (#1652f0):** the only non-state colour. Links, active nav, primary
  buttons, and monospace field names. Use it sparingly enough that it still
  means "this is interactive or this is the key value".
- **success (#067647) / warning (#b54708) / danger (#b42318):** deliberately
  desaturated next to the accent. These map to decisions, not moods — success
  is `APPROVE`, warning is `SHRINK` or `ABSTAIN`, danger is `VETO` or a failed
  check. Never use them for emphasis.
- **info (#5925dc):** reserved for `RECORDED` provenance labels.
- **text-muted (#8b95a5):** labels, timestamps, hashes at rest. If a whole
  block is muted, ask whether it should be on the page at all.
- **surface-sunken (#f0f2f5):** code blocks, table hovers, inset panels.

Dark mode redefines every one of these under `prefers-color-scheme: dark`. No
colour is defined in only one scheme.

## Typography

Inter for everything except cryptographic material, which is monospace. That
split is load-bearing: hashes, permit ids, OCC contract symbols and nonces are
*data to be compared character by character*, and a proportional font makes
that harder. `.mono` also sets `word-break: break-all` so a 64-char digest
never blows out a table.

`font-variant-numeric: tabular-nums` is set on `body`. Figures in a column must
not jump width when they change.

The `label-caps` style is the small uppercase eyebrow above a section. Use it
for section kickers and table headers, never for body copy.

## Layout

- `.page-container` — 1200px max, 32px vertical rhythm, one per page.
- `.grid-2` / `.grid-3` / `.grid-4` — auto-fit, so they collapse on their own.
  Do not add breakpoints for these.
- Spacing is an 8px scale. 4px exists for tight pairs (label above value).
- Wide content lives in `.table-scroll`. **The page body must never scroll
  horizontally** — the table scrolls inside its own box instead.

## Elevation & Depth

Two levels, and that is the whole system:

- `--shadow-sm` on `.glass-panel` — every ordinary card.
- `--shadow` + `--border-strong` on `.glass-panel-glow` — reserved for the ONE
  panel per page carrying the headline claim.

If everything is elevated, nothing is. Resist adding a third level.

> Naming note: `.glass-panel` is a legacy class name from the previous
> glassmorphism palette. It is a plain card now. The name is kept because eight
> pages reference it and a rename buys nothing.

## Shapes

`rounded.sm` (6px) for controls — buttons, inputs, nav items. `rounded.md`
(10px) for containers. `rounded.full` for badges only. Nothing else is round.

## Components

**Badges** carry a dot as well as a colour, so decision state survives
greyscale printing and colour-blind readers. `.badge-emerald` / `-amber` /
`-rose` / `-cyan` map to success / warning / danger / accent.

**Tables** are the primary data surface — this product is mostly evidence, and
evidence is tabular. Header row is `label-caps`, rows separate with a 1px
border, hover fills with `surface-subtle`. Put the *result* column first: a
reader scanning a verification report wants pass/fail before they want detail.

**Buttons.** One primary per view. Everything else is secondary. There is no
tertiary or ghost variant, and adding one needs a Decision Log entry.

**Telemetry bar** takes label-then-value children and styles them structurally
(`:first-child`, `:nth-child(2)`), so existing markup gets the treatment
without new classes.

## Do's and Don'ts

**Do**

- Reach for a neutral before a colour.
- Set every hash, id, nonce and contract symbol in `.mono`.
- Put failures above passes in any results list.
- State what a number cannot prove next to the number. The `RECORDED` vs
  `REPRODUCED` split on the Proof Explorer is the model for this.
- Use `color-mix(in srgb, var(--token) 22%, transparent)` for tinted borders
  rather than inventing a new hex.

**Don't**

- **No background audio or music. Ever.** Autoplaying sound in a financial
  dashboard is an accessibility failure and a credibility failure: it reads as
  a landing page, not an audit tool, and judges will be scrubbing a screen
  recording with their own audio. Music belongs in the 90-second submission
  video, where it is scored against narration. It does not belong in the app.
- **No decorative background video.** Same reasoning, plus weight. A short
  click-to-play demo recording embedded on the Overview page is fine and
  useful; an autoplaying hero loop is noise that competes with the data.
- No glow, neon, glassmorphism, or gradient-as-decoration. This is the exact
  aesthetic we moved away from and it actively undercuts the product's claim.
- No hardcoded hex or `rgba()` in a component. Use a token. A sweep already
  removed twelve files' worth; do not reintroduce it.
- No animation beyond 120ms colour transitions. `prefers-reduced-motion` is
  honoured globally and must stay that way.
- No emoji as UI iconography. They render differently per platform and read as
  unserious on a page making a security claim.
- Don't add a component library. See the note below.

## Why not Lumen, Tailwind, or a component library

Ledger's [Lumen](https://github.com/LedgerHQ/lumen) is the right *taste* for
this product and we borrow from it directly: token discipline, high contrast,
monospace for cryptographic values, and the practice of shipping design rules
that AI agents read (which is what this file is).

We do not install it. `@ledgerhq/lumen-ui-react` brings Tailwind, a Tailwind
preset, and Radix primitives into a codebase that uses none of them, and
re-theming eight working pages days before submission is a rewrite dressed up
as a polish pass. The cost is certain and the gain is cosmetic.

Take the ideas. Leave the dependency.
