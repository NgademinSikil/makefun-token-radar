# Token Radar — token-radar-01 (make.fun)

A static, offline dashboard that ranks pre-token DeFi protocols by implied
launch value, with a concrete farm plan for every row. Built for the make.fun
bounty **token-radar-01** ($1,325, closes 14 Dec 2026). Local-only entry:
nothing here has been submitted, and no wallet or account was created.

## What it does

- Reads the sealed snapshot (`input/snapshot.json`, DefiLlama protocols as of
  2026-11-14, floor $50M TVL) and scores every pre-token protocol with one
  transparent model — no protocol name is special-cased.
- Board: all 40 watchlist protocols plus 160 early pre-token protocols below
  the floor, 200 rows, ranked by implied value.
- Dashboard (`dashboard/`, static, no network): Top-5 spotlight, search,
  category / chain / minimum-TVL filters, watchlist-only toggle, sortable
  columns, a detail view per protocol (model inputs, "why this rank", farm
  plan), a live-token view set aside with market caps, CSV export of the
  filtered board, and a how-to-use / honest-limits section.

## The model (radar-1)

```
implied = round( tvl_usd x 0.25
  x (1 + clamp(change_7d, -60, 120) / 100 x 0.5)
  x (0.6 + min(age_days, 1095) / 1095 x 0.4) )
```

- `base` — TVL x 0.25: a launch is worth a fraction of the value already
  locked in the protocol.
- `growth` — 7-day TVL change, clamped to [-60%, +120%], half weight:
  momentum raises the value, a falling TVL lowers it.
- `maturity` — 0.6 to 1.0 by age since first listing (unknown age = 365 days):
  a protocol that has run longer with no token is a more seasoned candidate.
- The dashboard recomputes every row with the same function and checks it
  against `board.json`, so page and data visibly agree.

## Farm plans

Six steps per protocol, derived from its own category, chains, TVL and age
(action, capital $50–$250, hold 30–60 days, weekly action, claim-safety and
logging steps). Each step states its cost and time. Plans are generic
derivations, not advice: verify on the protocol's own page before depositing,
and never pay anyone to claim.

## Honest limits

- The snapshot is frozen at 2026-11-14. A protocol may have launched a token
  since. "Records no token" means the snapshot records none — never that the
  protocol has none.
- Implied value is a model from TVL, growth and age alone. It is not a price,
  a prediction, or a promise of an airdrop. A high rank is not a
  recommendation to deposit.

## Run it (Node 22.18+)

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input token-radar-01-kit/input/snapshot.json
# then serve the output, e.g.:
python3 -m http.server 8000 --directory out
# open http://localhost:8000/dashboard/
```

`main.ts` writes `out/board.json`, `out/data.js`, copies `dashboard/` and
`screenshots/`, and writes `out/dossier.json` with the kit's vendored
`vendor/makefun-board.ts`. In the grader the snapshot is mounted at
`/input/snapshot.json` and the output goes to `/output`.

## Layout

- `main.ts` — entry point (Node 22, standard library only)
- `lib/model.ts` — snapshot parsing, scoring model, farm plans, gate checks
- `vendor/makefun-board.ts` — make.fun dossier builder, byte-for-byte from the kit
- `dashboard/` — `index.html`, `app.css`, `app.js` (no network requests)
- `screenshots/` — `1-board.png` (board), `2-detail.png` (detail view),
  `3-filtered.png` (filtered view), 1440x900 each, taken from this dashboard
- `token-radar-01-kit/` — the bounty kit as downloaded (rules, input snapshot)

## License

MIT (see `LICENSE`).
