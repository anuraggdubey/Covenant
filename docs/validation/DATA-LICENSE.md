# Validation Data License and Provenance

The normalized SPY and QQQ adjusted-close files in `data/` are derived from Kaggle datasets whose data cards designate them **CC0: Public Domain**.

| Symbol | Dataset | License | Raw SHA-256 |
| --- | --- | --- | --- |
| SPY | [SPY Daily Stock Info (01/1993 - 12/2023)](https://www.kaggle.com/datasets/seansaliga/spy-start-10312023/data) | CC0: Public Domain | `0de2f3b2230c39096b3d97ec4ecc40bf1baaeb633f2ec92eb359632861d637c9` |
| QQQ | [Invesco QQQ Trust (QQQ) Stock Performance](https://www.kaggle.com/datasets/nitirajkulkarni/qqq-stock-performance) | CC0: Public Domain | `2504a52643118df7637e116b2cb966327a67e6d3c2f96bd708fa1743ab733419` |

The repository stores only `date` and `adjustedClose` for the fixed overlapping period 2019-01-02 through 2023-12-27. `prepare-cc0-data.mjs` documents the deterministic transformation from the named raw files. `source-manifest-v2.json` pins the raw and normalized hashes, row counts, date bounds, source pages, retrieval time, and license.

The data license does not convert historical prices into Alpaca evidence. These files support independent underlying-signal research only.
