// Radar model, rewritten from a blank page for the token-radar-01 bounty.
// One sealed snapshot goes in; one ranked board comes out. The board always
// covers every slug on the snapshot's watchlist, then adds up to 160
// pre-token protocols below the watchlist floor, picked by TVL, so the
// radar can surface launches before they are obvious. Protocols that
// already trade are kept apart as the live set and shown at the market's
// own values, never mixed into the ranking.
// A protocol counts as pre-token when its index entry records no token at
// all: no market cap, no CoinGecko id, no symbol. Implied value comes only
// from the snapshot's own figures, with the house constants below:
//   base      = tvl_usd times 0.25
//   growth    = change_7d clamped to the range -60..120
//   factor    = 1 + (growth / 100) times 0.5
//   maturity  = 0.6 + min(age_days, 1095) / 1095 times 0.4
//   implied   = max(1, round(base times factor times maturity))
// Age is unknown for a protocol with no listing date, and then 365 days is
// assumed. No protocol name is ever special-cased anywhere in this file:
// one function scores every row, and the farm plan follows from the
// protocol's own category, chain, TVL and age.

// The snapshot's protocol entry: exactly the ten fields the sealed input carries.
export interface SnapshotProtocol { // ten fields, exactly as sealed
    slug: string; // stable identifier from the snapshot index
    name: string; // display name as the snapshot spells it
    chains: string[]; // chains the protocol names, possibly none
    category: string | null; // DefiLlama category, or nothing when uncategorised
    tvl_usd: number; // total value locked, in US dollars
    change_7d: number | null; // seven-day TVL change in per cent, when known
    listed_at: string | null; // listing date as YYYY-MM-DD, when known
    mcap_usd: number | null; // market cap, present only once a token trades
    gecko_id: string | null; // CoinGecko id, present only once a token trades
    symbol: string | null; // token symbol, present only once a token trades
} // SnapshotProtocol

// The whole snapshot document.
export interface Snapshot { // the sealed input, whole
    as_of: string; // snapshot date as YYYY-MM-DD
    source: string; // where the snapshot figures come from
    floor_usd: number; // watchlist TVL floor in US dollars
    protocols: SnapshotProtocol[]; // every protocol in the index
    watchlist: string[]; // slugs the board must always cover
} // Snapshot

// The model's tuning, as the dashboard states it and the sandbox may change it.
export interface ModelConstants { // every knob the scoring formula reads
    base_multiple: number; // TVL multiple that starts the implied value
    growth_weight: number; // how much of the clamped growth reaches the value
    growth_floor: number; // lowest weekly change the formula believes
    growth_cap: number; // highest weekly change the formula believes
    maturity_floor: number; // value share a brand-new protocol still earns
    maturity_range: number; // extra share earned across the maturity window
    maturity_days: number; // days over which the maturity share is earned
    unknown_age_days: number; // age assumed when no listing date exists
} // ModelConstants

// The house model's constants, in the order the dashboard prints them.
export const MODEL: ModelConstants = { base_multiple: 0.25, growth_weight: 0.5, growth_floor: -60, growth_cap: 120, maturity_floor: 0.6, maturity_range: 0.4, maturity_days: 1095, unknown_age_days: 365 };

// The model's version label: the dashboard names it and the rules quote it.
export const MODEL_VERSION: string = "radar-1";

// How many pre-token protocols below the watchlist floor the early radar carries, by TVL.
export const EARLY_ROWS: number = 160;

// How many live-token protocols the Live token view carries, by market cap.
export const LIVE_ROWS: number = 24;

// A farm step: the action, what it costs, and how long it takes.
export interface FarmStep { // one step of a protocol's farm plan
    text: string; // what to do, in plain words
    cost: string; // what the step costs
    time: string; // how long the step takes
} // FarmStep

// One row of board.json: the ranked board's row, with its farm plan attached.
export interface BoardRow { // a ranked row, as board.json carries it
    rank: number; // 1-based place on the board
    slug: string; // stable identifier from the snapshot index
    name: string; // display name as the snapshot spells it
    category: string | null; // DefiLlama category, or nothing when uncategorised
    chains: string[]; // chains the protocol names, possibly none
    tvl_usd: number; // total value locked, in US dollars
    change_7d: number | null; // seven-day TVL change in per cent, when known
    mcap_usd: number | null; // market cap, always null on a pre-token row
    listed_at: string | null; // listing date as YYYY-MM-DD, when known
    gecko_id: string | null; // CoinGecko id, always null on a pre-token row
    symbol: string | null; // token symbol, always null on a pre-token row
    token_status: "pre-token"; // every board row is pre-token, by construction
    age_days: number | null; // whole days from listing to the snapshot date
    implied_value_usd: number; // the model's implied value, in US dollars
    model: { // the formula's working, kept per row for the dashboard
        base_multiple: number; // TVL multiple that started the implied value
        growth_pct: number; // clamped weekly change in per cent
        growth_multiplier: number; // growth factor, rounded to four decimals
        maturity_multiplier: number; // maturity factor, rounded to four decimals
        age_days: number | null; // age the maturity factor was built from
    }; // BoardRow model detail
    farm_steps: string[]; // the farm plan, rendered as plain strings
} // BoardRow

// The dashboard's compact view of one row, with farm plans generated in the page.
export interface RadarRow { // a board row slimmed down for data.js
    rank: number; // 1-based place on the board
    slug: string; // stable identifier from the snapshot index
    name: string; // display name as the snapshot spells it
    category: string | null; // DefiLlama category, or nothing when uncategorised
    chains: string[]; // chains the protocol names, possibly none
    tvl_usd: number; // total value locked, in US dollars
    change_7d: number | null; // seven-day TVL change in per cent, when known
    mcap_usd: number | null; // market cap, always null on a pre-token row
    listed_at: string | null; // listing date as YYYY-MM-DD, when known
    age_days: number | null; // whole days from listing to the snapshot date
    implied_value_usd: number; // the model's implied value, in US dollars
    growth_multiplier: number; // growth factor, rounded to four decimals
    maturity_multiplier: number; // maturity factor, rounded to four decimals
    watchlist: boolean; // true when the slug sits on the snapshot's watchlist
} // RadarRow

// A live-token protocol: it already trades, so the board shows the market's own value, not a model's.
export interface LiveRow { // a trading protocol, as the live view carries it
    slug: string; // stable identifier from the snapshot index
    name: string; // display name as the snapshot spells it
    category: string | null; // DefiLlama category, or nothing when uncategorised
    chains: string[]; // chains the protocol names, possibly none
    tvl_usd: number; // total value locked, in US dollars
    mcap_usd: number | null; // market cap, the market's own value
    change_7d: number | null; // seven-day TVL change in per cent, when known
} // LiveRow

// Everything the dashboard needs: the board, the live set, and the model it runs.
export interface RadarData { // the whole dataset behind data.js
    as_of: string; // snapshot date as YYYY-MM-DD
    source: string; // where the snapshot figures come from
    floor_usd: number; // watchlist TVL floor in US dollars
    model: ModelConstants; // the tuning the board was scored with
    model_version: string; // version label the dashboard names
    watchlist_size: number; // how many slugs the watchlist holds
    board_size: number; // how many rows the board holds
    early_size: number; // how many board rows came from the early radar
    live_size: number; // how many protocols the live set holds
    rows: RadarRow[]; // the board, slimmed down for the page
    live: LiveRow[]; // the live-token set, by market cap
} // RadarData

// The headline sentence's figures: how many watchlist slugs, how many rows, how many live protocols.
export interface BoardSummary { // counts for the summary line
    watchlist_size: number; // how many slugs the watchlist holds
    board_size: number; // how many rows the board holds
    early_size: number; // how many board rows came from the early radar
    live_size: number; // how many protocols the live set holds
} // BoardSummary

// Why the snapshot is not one this model can score.
export class SnapshotError extends Error { // a snapshot the model refuses
    constructor(message: string) { // remember the complaint
        super(message); // Error keeps the message
        this.name = "SnapshotError";
    } // constructor
} // SnapshotError

// Milliseconds in one day, for turning date gaps into whole days.
const MS_PER_DAY: number = 86_400_000;

// A bare calendar date: four digits, a dash, two digits, a dash, two digits.
const DATE_ONLY: RegExp = /^\d{4}-\d{2}-\d{2}$/;

// DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol.
const VERSION_MARKER: RegExp = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

// Four decimals are all the dashboard prints for a multiplier.
const roundToFour = (value: number): number => Math.round(value * 1e4) / 1e4;

// A finite number, else `fallback`.
const asFinite = (value: unknown, fallback: number): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    } // a finite number stands as it is
    return fallback;
}; // asFinite

// A finite number out of a raw value, or null when it is not one.
const readFiniteOrNull = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    } // a finite number stands as it is
    return null; // anything else counts as unknown
}; // readFiniteOrNull

// The chains out of a raw value: the strings it holds, or none at all.
const readChains = (value: unknown): string[] => {
    if (Array.isArray(value) === false) {
        return []; // no chains when the value is not an array
    } // the value is an array, so its strings are the chains
    const kept: string[] = [];
    for (const piece of value) {
        if (typeof piece === 'string') {
            kept.push(piece);
        } // only strings are chains
    } // every piece of the raw chains looked at
    return kept;
}; // readChains

// JSON text decoded, refused with a snapshot error when it will not parse.
const decodeJson = (text: string): unknown => {
    try { // the text may not be JSON at all
        return JSON.parse(text);
    } catch { // the text would not parse
        throw new SnapshotError('snapshot.json is not JSON'); // unparseable text is refused
    } // the text parsed as JSON, or the catch threw
}; // decodeJson

// A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad.
export function ageDays(snapshotDate: string, listedOn: string | null): number | null {
    if (listedOn === null) {
        return null; // no listing date, no age
    } // a listing date exists, so the gap can be counted
    const snapshotMs: number = Date.parse(`${snapshotDate}T00:00:00Z`);
    const listedMs: number = Date.parse(`${listedOn}T00:00:00Z`);
    if (Number.isFinite(snapshotMs) === false || Number.isFinite(listedMs) === false) {
        return null; // a date that will not parse gives no age
    } // both dates parsed cleanly
    const gapMs: number = snapshotMs - listedMs;
    if (gapMs <= 0) {
        return 0; // listed on or after the snapshot date
    } // the listing predates the snapshot
    return Math.floor(gapMs / MS_PER_DAY);
} // ageDays

// The three multipliers and the implied value one protocol gets under `model`.
export function impliedValue(entry: SnapshotProtocol, snapshotDate: string, tuning: ModelConstants): { implied: number; growthPct: number; growthMult: number; maturityMult: number; age: number | null } {
    const age: number | null = ageDays(snapshotDate, entry.listed_at);
    const rawGrowth: number = asFinite(entry.change_7d, 0);
    const clampedGrowth: number = Math.min(tuning.growth_cap, Math.max(tuning.growth_floor, rawGrowth));
    const growthFactor: number = 1 + (clampedGrowth / 100) * tuning.growth_weight;
    const ageForFormula: number = age ?? tuning.unknown_age_days;
    const cappedAge: number = Math.min(Math.max(ageForFormula, 0), tuning.maturity_days);
    const maturityFactor: number = tuning.maturity_floor + (cappedAge / tuning.maturity_days) * tuning.maturity_range;
    const baseValue: number = entry.tvl_usd * tuning.base_multiple;
    const implied: number = Math.max(1, Math.round(baseValue * growthFactor * maturityFactor));
    return { implied: implied, growthPct: clampedGrowth, growthMult: growthFactor, maturityMult: maturityFactor, age: age };
} // impliedValue

// Whether a protocol records no token at all.
export function isPreToken(entry: SnapshotProtocol): boolean {
    const hasMarketCap: boolean = entry.mcap_usd !== null;
    const hasGeckoId: boolean = entry.gecko_id !== null;
    const hasSymbol: boolean = entry.symbol !== null;
    return hasMarketCap === false && hasGeckoId === false && hasSymbol === false;
} // isPreToken

// Whether a protocol is one the board may rank: pre-token, not an exchange, not a versioned pool.
export function isRankable(entry: SnapshotProtocol): boolean {
    if (isPreToken(entry) === false) {
        return false; // a token already trading cannot be ranked here
    } // the protocol is pre-token, so the other bars apply
    if (entry.category === 'CEX') {
        return false; // exchanges never join the board
    } // the protocol is not an exchange
    if (VERSION_MARKER.test(entry.name)) {
        return false; // a versioned pool belongs to another protocol
    } // the name carries no version marker
    return true;
} // isRankable

// The snapshot's protocol by slug.
const indexBySlug = (entries: SnapshotProtocol[]): Map<string, SnapshotProtocol> => {
    const found = new Map<string, SnapshotProtocol>();
    for (const entry of entries) {
        found.set(entry.slug, entry);
    } // every protocol filed under its slug
    return found;
}; // indexBySlug

// Strongest TVL first; a tied TVL falls back to the slug, ascending.
const byTvlDesc = (left: SnapshotProtocol, right: SnapshotProtocol): number => {
    if (left.tvl_usd !== right.tvl_usd) {
        return right.tvl_usd - left.tvl_usd;
    } // different TVLs order by TVL
    if (left.slug < right.slug) {
        return -1; // tied TVLs order by slug
    } // the left slug sorts first
    if (left.slug > right.slug) {
        return 1; // tied TVLs order by slug
    } // the right slug sorts first
    return 0; // the same protocol, or a perfect tie
}; // byTvlDesc

// Strongest implied value first; a tied value falls back to the slug, ascending.
const byImpliedDesc = (left: ScoredEntry, right: ScoredEntry): number => {
    if (left.implied !== right.implied) {
        return right.implied - left.implied;
    } // different values order by value
    if (left.protocol.slug < right.protocol.slug) {
        return -1; // tied values order by slug
    } // the left slug sorts first
    if (left.protocol.slug > right.protocol.slug) {
        return 1; // tied values order by slug
    } // the right slug sorts first
    return 0; // the same protocol, or a perfect tie
}; // byImpliedDesc

// Biggest market cap first; a tied cap falls back to the biggest TVL.
const byMarketCapDesc = (left: SnapshotProtocol, right: SnapshotProtocol): number => {
    const leftCap: number = left.mcap_usd ?? 0;
    const rightCap: number = right.mcap_usd ?? 0;
    if (leftCap !== rightCap) {
        return rightCap - leftCap;
    } // different caps order by cap
    return right.tvl_usd - left.tvl_usd;
}; // byMarketCapDesc

// One protocol after scoring, waiting to be ranked.
interface ScoredEntry { // a protocol with its implied value attached
    protocol: SnapshotProtocol; // the protocol itself
    implied: number; // the model's implied value, in US dollars
    growthPct: number; // clamped weekly change in per cent
    growthMult: number; // growth factor, unrounded
    maturityMult: number; // maturity factor, unrounded
    age: number | null; // whole days from listing to the snapshot date
} // ScoredEntry

// The first chain a protocol names, or a neutral phrase.
const firstChain = (entry: SnapshotProtocol): string => {
    if (entry.chains.length > 0) {
        return entry.chains[0] as string;
    } // the protocol names at least one chain
    return 'its main chain';
}; // firstChain

// How much capital one farm position needs, from the protocol's own TVL.
const stakeFor = (entry: SnapshotProtocol): number => {
    if (entry.tvl_usd >= 5_000_000_000) {
        return 250; // the largest protocols take the largest stake
    } // a five-billion-plus TVL takes the largest stake
    if (entry.tvl_usd >= 1_000_000_000) {
        return 150; // a billion-plus TVL still takes a serious stake
    } // a billion-plus TVL takes a serious stake
    if (entry.tvl_usd >= 100_000_000) {
        return 100; // a hundred-million-plus TVL takes a middle stake
    } // a hundred-million-plus TVL takes a middle stake
    return 50; // the smallest stake, for the smallest protocols
}; // stakeFor

// How long to hold, from the protocol's age: younger protocols get a longer qualifying window.
const holdFor = (age: number | null): number => {
    if (age === null) {
        return 30; // no age known, hold a month
    } // an unknown age holds for a month
    if (age < 180) {
        return 60; // a young protocol needs two months of activity
    } // under six months old
    if (age < 365) {
        return 45; // under a year old, six weeks
    } // under a year old
    return 30; // a year or older holds for a month
}; // holdFor

// The category's one action, in the words a farmer can follow. Each entry
// pairs the words that pick it out with the sentence it writes; the first
// entry whose words appear in the protocol's category wins, and a protocol
// matching none of them gets the plain deposit below.
const ACTION_TABLE: Array<{ needles: string[]; write: (stake: number, name: string, chain: string) => string }> = [
    { needles: ['lend', 'cdp', 'collateral'], write: (stake, name, chain) => `Supply $${stake} of USDC to ${name} on ${chain} and keep the position open.` },
    { needles: ['dex', 'yield', 'leveraged farm'], write: (stake, name, chain) => `Provide $${stake} of liquidity to ${name}'s main pool on ${chain} and keep the position open.` },
    { needles: ['bridge'], write: (stake, name, chain) => `Bridge $${stake} of USDC to ${chain} through ${name} and use the bridged funds in its app.` },
    { needles: ['staking', 'restak'], write: (stake, name, chain) => `Stake $${stake} of the chain's staking asset through ${name} and keep the receipt.` },
    { needles: ['perpetual', 'derivative'], write: (stake, name, chain) => `Deposit $${stake} of USDC as margin on ${name} and open one small hedge.` },
    { needles: ['prediction'], write: (stake, name, chain) => `Fund $${stake} and place one market position on ${name}.` },
    { needles: ['curator', 'allocator'], write: (stake, name, chain) => `Deposit $${stake} into a ${name} vault on ${chain} and keep the shares.` },
    { needles: ['stable'], write: (stake, name, chain) => `Mint or deposit $${stake} of the stable asset through ${name} on ${chain}.` },
    { needles: ['rwa'], write: (stake, name, chain) => `Mint $${stake} of the protocol's yield asset on ${chain} and hold it.` },
    { needles: ['insurance'], write: (stake, name, chain) => `Buy $${stake} of cover from ${name} on ${chain} and keep the policy.` },
]; // category actions, first match wins

// Picks the farm action for one protocol from its category, falling back to a plain deposit.
const actionForCategory = (entry: SnapshotProtocol, stake: number, chain: string): string => {
    const lowered: string = (entry.category ?? '').toLowerCase();
    for (const row of ACTION_TABLE) {
        const hits: boolean = row.needles.some((needle: string): boolean => lowered.includes(needle));
        if (hits) {
            return row.write(stake, entry.name, chain);
        } // the first matching entry writes the action
    } // no entry matched the category
    return `Deposit $${stake} of USDC into ${entry.name} on ${chain} and keep the position open.`;
}; // actionForCategory

// A step as one string: its action, then its cost and time, within the gate's 20..600 characters.
export function stepText(plan: FarmStep): string {
    const pieces: string[] = [plan.text, ' Cost: ', plan.cost, '. Time: ', plan.time, '.'];
    let rendered: string = pieces.join('');
    if (rendered.length > 600) {
        rendered = `${rendered.slice(0, 596)}...`;
    } // over the gate's 600 characters, cut it short
    if (rendered.length < 20) {
        rendered = `${rendered} Hold the position and check the protocol's own page.`;
    } // under the gate's 20 characters, pad it out
    return rendered;
} // stepText

// A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived from
// the protocol's own record (category, chains, TVL, age), never from a hand-written list of names.
export function farmSteps(entry: SnapshotProtocol, age: number | null): FarmStep[] {
    const chain: string = firstChain(entry);
    const stake: number = stakeFor(entry);
    const hold: number = holdFor(age);
    const action: string = actionForCategory(entry, stake, chain);
    const plan: FarmStep[] = [
        { text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`, cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
        { text: action, cost: `$${stake} of capital and about $${stake >= 150 ? 8 : 4} of gas`, time: '15 minutes to set up' },
        { text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
        { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${stake} stays in the position`, time: `${hold} days` },
        { text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
        { text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`, cost: 'nothing but the log', time: '5 minutes' },
    ]; // six steps, in farming order
    return plan;
} // farmSteps

// One protocol entry out of the snapshot's raw array, refused unless it carries a slug, a name and a TVL.
const readProtocol = (value: unknown, position: number): SnapshotProtocol => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new SnapshotError(`snapshot.json's protocol ${position} is not an object`);
    } // a protocol entry must be one JSON object
    const fields: Record<string, unknown> = value as Record<string, unknown>;
    const usable: boolean = typeof fields.slug === 'string' && typeof fields.name === 'string' && typeof fields.tvl_usd === 'number' && Number.isFinite(fields.tvl_usd);
    if (usable === false) {
        throw new SnapshotError(`snapshot.json's protocol ${position} lacks a slug, a name or a TVL`);
    } // a protocol needs its slug, name and TVL
    const entry: SnapshotProtocol = {
        slug: fields.slug as string,
        name: fields.name as string,
        category: typeof fields.category === 'string' ? fields.category : null,
        chains: readChains(fields.chains),
        tvl_usd: fields.tvl_usd as number,
        change_7d: readFiniteOrNull(fields.change_7d),
        mcap_usd: readFiniteOrNull(fields.mcap_usd),
        listed_at: typeof fields.listed_at === 'string' ? fields.listed_at : null,
        gecko_id: typeof fields.gecko_id === 'string' ? fields.gecko_id : null,
        symbol: typeof fields.symbol === 'string' ? fields.symbol : null,
    }; // one protocol entry, checked and read
    return entry;
}; // readProtocol

// The protocols the board ranks, strongest first, with ranks 1..n.
export function buildBoard(snap: Snapshot, tuning: ModelConstants = MODEL): BoardRow[] {
    const index: Map<string, SnapshotProtocol> = indexBySlug(snap.protocols);
    const picked = new Map<string, SnapshotProtocol>();
    for (const slug of snap.watchlist) {
        const found: SnapshotProtocol | undefined = index.get(slug);
        if (found !== undefined) {
            picked.set(slug, found);
        } // a watchlist slug the snapshot still carries joins the board
    } // the watchlist is the floor: every slug it names is picked
    const early: SnapshotProtocol[] = snap.protocols
        .filter((entry: SnapshotProtocol): boolean => picked.has(entry.slug) === false && isRankable(entry) === true && entry.tvl_usd < snap.floor_usd)
        .sort((left: SnapshotProtocol, right: SnapshotProtocol): number => byTvlDesc(left, right))
        .slice(0, EARLY_ROWS); // the early radar carries 160 rows at most
    for (const entry of early) {
        picked.set(entry.slug, entry);
    } // the early radar fills the board up without ever replacing a watchlist row
    const scored: ScoredEntry[] = [...picked.values()].map((entry: SnapshotProtocol): ScoredEntry => {
        const result = impliedValue(entry, snap.as_of, tuning);
        return { protocol: entry, implied: result.implied, growthPct: result.growthPct, growthMult: result.growthMult, maturityMult: result.maturityMult, age: result.age };
    }); // every picked protocol scored
    scored.sort((left: ScoredEntry, right: ScoredEntry): number => byImpliedDesc(left, right));
    return scored.map((entry: ScoredEntry, place: number): BoardRow => {
        const row: BoardRow = {
            rank: place + 1,
            slug: entry.protocol.slug,
            name: entry.protocol.name,
            category: entry.protocol.category,
            chains: entry.protocol.chains,
            tvl_usd: entry.protocol.tvl_usd,
            change_7d: entry.protocol.change_7d,
            mcap_usd: entry.protocol.mcap_usd,
            listed_at: entry.protocol.listed_at,
            gecko_id: entry.protocol.gecko_id,
            symbol: entry.protocol.symbol,
            token_status: "pre-token",
            age_days: entry.age,
            implied_value_usd: entry.implied,
            model: { base_multiple: tuning.base_multiple, growth_pct: entry.growthPct, growth_multiplier: roundToFour(entry.growthMult), maturity_multiplier: roundToFour(entry.maturityMult), age_days: entry.age },
            farm_steps: farmSteps(entry.protocol, entry.age).map(stepText),
        }; // one board row, fully built
        return row;
    }); // ranks handed out in scoring order
} // buildBoard

// The live-token protocols, by market cap, for the dashboard's Live token view.
export function liveRows(snap: Snapshot): LiveRow[] {
    const trading: SnapshotProtocol[] = snap.protocols.filter((entry: SnapshotProtocol): boolean => isPreToken(entry) === false && entry.category !== 'CEX');
    trading.sort((left: SnapshotProtocol, right: SnapshotProtocol): number => byMarketCapDesc(left, right));
    const top: SnapshotProtocol[] = trading.slice(0, LIVE_ROWS);
    return top.map((entry: SnapshotProtocol): LiveRow => {
        const live: LiveRow = {
            slug: entry.slug,
            name: entry.name,
            category: entry.category,
            chains: entry.chains,
            tvl_usd: entry.tvl_usd,
            mcap_usd: entry.mcap_usd,
            change_7d: entry.change_7d,
        }; // one live row
        return live;
    }); // live rows, by market cap
} // liveRows

// A board row's compact form for data.js, with the farm plan generated in the page.
export function radarRow(entry: BoardRow, onWatchlist: boolean): RadarRow {
    const slim: RadarRow = {
        rank: entry.rank,
        slug: entry.slug,
        name: entry.name,
        category: entry.category,
        chains: entry.chains,
        tvl_usd: entry.tvl_usd,
        change_7d: entry.change_7d,
        mcap_usd: entry.mcap_usd,
        listed_at: entry.listed_at,
        age_days: entry.age_days,
        implied_value_usd: entry.implied_value_usd,
        growth_multiplier: entry.model.growth_multiplier,
        maturity_multiplier: entry.model.maturity_multiplier,
        watchlist: onWatchlist,
    }; // one slim row for the dashboard
    return slim;
} // radarRow

// Everything the dashboard renders, from the snapshot.
export function buildRadar(snap: Snapshot, tuning: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
    const board: BoardRow[] = buildBoard(snap, tuning);
    const live: LiveRow[] = liveRows(snap);
    const earlyCount: number = board.filter((entry: BoardRow): boolean => snap.watchlist.includes(entry.slug) === false).length;
    const dataset: RadarData = {
        as_of: snap.as_of,
        source: snap.source,
        floor_usd: snap.floor_usd,
        model: tuning,
        model_version: MODEL_VERSION, // radar-1
        watchlist_size: snap.watchlist.length,
        board_size: board.length, // 200 rows when the radar is full
        early_size: earlyCount,
        live_size: live.length, // 24 at most
        rows: board.map((entry: BoardRow): RadarRow => radarRow(entry, snap.watchlist.includes(entry.slug))),
        live: live,
    }; // the dashboard's whole dataset
    return { board: board, radar: dataset };
} // buildRadar

// The snapshot out of a file's text, refused unless it is the shape the model scores.
export function parseSnapshot(text: string): Snapshot { // text in, snapshot out
    const raw: unknown = decodeJson(text);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        throw new SnapshotError('snapshot.json is not a JSON object');
    } // the snapshot must be one JSON object
    const doc: Record<string, unknown> = raw as Record<string, unknown>;
    if (typeof doc.as_of !== 'string' || DATE_ONLY.test(doc.as_of) === false) {
        throw new SnapshotError('snapshot.json has no as_of date');
    } // the snapshot needs its date
    if (typeof doc.source !== 'string') {
        throw new SnapshotError('snapshot.json has no source');
    } // the snapshot needs its source
    if (typeof doc.floor_usd !== 'number' || Number.isSafeInteger(doc.floor_usd) === false || doc.floor_usd <= 0) {
        throw new SnapshotError('snapshot.json has no floor_usd');
    } // the snapshot needs a positive whole floor
    if (Array.isArray(doc.protocols) === false) {
        throw new SnapshotError('snapshot.json has no protocols array');
    } // the snapshot needs its protocols
    if (Array.isArray(doc.watchlist) === false || doc.watchlist.some((entry: unknown): boolean => typeof entry !== 'string')) {
        throw new SnapshotError('snapshot.json has no watchlist of slugs');
    } // the snapshot needs a watchlist of slugs
    const entries: SnapshotProtocol[] = doc.protocols.map((value: unknown, position: number): SnapshotProtocol => readProtocol(value, position));
    const parsed: Snapshot = {
        as_of: doc.as_of,
        source: doc.source,
        floor_usd: doc.floor_usd,
        protocols: entries,
        watchlist: doc.watchlist as string[],
    }; // the snapshot, checked and parsed
    return parsed;
} // parseSnapshot

// Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps.
export function boardIssue(board: BoardRow[], snap: Snapshot): string | null {
    const covered = new Set<string>(board.map((entry: BoardRow): string => entry.slug));
    const absent: string[] = snap.watchlist.filter((slug: string): boolean => covered.has(slug) === false);
    if (absent.length > 0) {
        const shown: string = absent.slice(0, 5).join(', ');
        const plural: string = absent.length === 1 ? '' : 's';
        return `the board misses ${absent.length} watchlist slug${plural}: ${shown}`;
    } // every watchlist slug must appear on the board
    const places: number[] = board.map((entry: BoardRow): number => entry.rank);
    places.sort((left: number, right: number): number => left - right);
    for (let position = 0; position < places.length; position += 1) {
        const expected: number = position + 1;
        if (places[position] !== expected) {
            return `rank ${expected} is ${places[position]}`;
        } // ranks must run 1..n without gaps
    } // ranks checked in order
    for (let position = 1; position < board.length; position += 1) {
        const above: BoardRow = board[position - 1] as BoardRow;
        const below: BoardRow = board[position] as BoardRow;
        if (below.implied_value_usd > above.implied_value_usd) {
            return `row ${position + 1} outranks row ${position} on implied value`;
        } // implied value must never rise down the board
    } // the board's order checked
    if (board.length >= 2) {
        const first: BoardRow = board[0] as BoardRow;
        const last: BoardRow = board[board.length - 1] as BoardRow;
        if (first.implied_value_usd === last.implied_value_usd) {
            return `all ${board.length} rows share the same implied value $${first.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
        } // one shared value across the whole board is not a ranking
    } // the board's spread checked
    for (const entry of board) {
        const steps: string[] = entry.farm_steps;
        if (steps.length < 3 || steps.length > 12) {
            return `${entry.slug} has ${steps.length} farm steps`;
        } // every row carries three to twelve farm steps
        for (const step of steps) {
            if (step.length < 20 || step.length > 600) {
                return `${entry.slug} has a farm step of ${step.length} characters`;
            } // every farm step stays inside 20..600 characters
        } // this row's farm steps checked
        if (Number.isSafeInteger(entry.implied_value_usd) === false || entry.implied_value_usd <= 0) {
            return `${entry.slug} has implied value ${entry.implied_value_usd}`;
        } // every implied value is a positive whole number
    } // every row checked
    return null; // the board passes every check
} // boardIssue

// A compact data.js: the dashboard's whole dataset as one script, no fetch and no network.
export function dataScript(dataset: RadarData): string {
    const serialised: string = JSON.stringify(dataset);
    return `window.RADAR=${serialised};\n`;
} // dataScript
