# Judge Questions and Direct Answers

## What is the AI contribution?

The Alpha Engine ranks defined-risk candidates, and a model may draft mandate text or reduce confidence. Models cannot author contract symbols, activate policies, sign permits, increase quantity, widen a price band, or submit orders. Deterministic services own those authorities.

## What makes this different from a stop-loss wrapper?

The order writer receives a signed, short-lived, single-use capability bound to the exact policy, account snapshot, market snapshot, intent, legs, quantity ceiling, and price band. A changed order must fail before a broker call. The event chain and replay command make that claim inspectable.

## Is the strategy profitable?

We do not claim that. Lane C's 3.967-year out-of-sample check found modest positive mean signed outcomes after a 10 bp stress, but meaningful downside tails and regime dependence. That is underlying signal evidence, not options P&L. Covenant's demonstrated contribution is governed execution and verifiable abstention, not a fabricated return headline.

## Is this live trading?

No. It is Alpaca paper trading only. Paper fills and historical signal evidence do not represent live execution.

## Why SPY and QQQ only?

The narrow universe keeps liquidity assumptions, options-chain handling, mandate semantics, and judge-visible verification tractable during the hackathon. Expanding the universe before those guarantees are proven would weaken the product.

## Can the model override the Safety Kernel?

No. Its authority is the literal `VETO_OR_SHRINK`. It can reduce confidence or reject a candidate; it cannot turn an abstention into a trade or increase risk.

## What happens when data is missing?

The locked action is `ABSTAIN`. Missing or inconsistent state cannot be replaced with a neutral estimate or stale default.
