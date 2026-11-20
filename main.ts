// Token radar, rewritten from a blank page for the token-radar-01 bounty.
// This file does the plumbing and nothing else: it finds the sealed
// snapshot, hands it to the scoring model in lib/model.ts, and lays the
// ranked board, the dashboard data, the static dashboard, the screenshots
// and finally the dossier into the output directory. The dossier goes last
// because the scorer rebuilds it from the finished output and compares
// bytes, so nothing may change after it is written.
// Outside the grading container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   MAKEFUN_OUTPUT_DIR=/tmp/radar-out node main.ts --input token-radar-01-kit/input/snapshot.json

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import * as radar from './lib/model.ts';
import * as dossierLib from './vendor/makefun-board.ts';

// The directory this file lives in: the dashboard and screenshots sit next to it.
const entryDir: string = path.dirname(url.fileURLToPath(import.meta.url));

// Caps the grader enforces on the finished output. The text cap shapes the
// dossier's bytes; the screenshot and dashboard caps refuse bad output.
const MAX_TEXT_BYTES: number = 65_536;
const SHOT_LIMITS = { max: 4, max_bytes: 524_288 };
const SHOT_NAME: RegExp = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

// Reads `--flag value` or `--flag=value` out of the process arguments, and
// hands back `otherwise` when the flag never appears at all.
const flagValue = (flag: string, otherwise: string): string => {
    const spot: number = process.argv.indexOf(`--${flag}`);
    if (spot >= 0 && spot + 1 < process.argv.length) {
        return process.argv[spot + 1] as string;
    } // the `--flag value` shape turned up
    const joined: string | undefined = process.argv.find((piece: string): boolean => piece.startsWith(`--${flag}=`));
    if (joined === undefined) {
        return otherwise;
    } // neither shape turned up, so the fallback stands
    return joined.slice(flag.length + 3);
}; // flagValue

// Where the snapshot lives: a file straight away, or a directory holding snapshot.json.
const inputArg: string = flagValue('input', '/input');
const inputPath: string = inputArg.endsWith('.json') ? inputArg : path.join(inputArg, 'snapshot.json');
if (fs.existsSync(inputPath) === false) {
    process.stderr.write(`token radar: no snapshot at ${inputPath}: pass --input <snapshot.json|directory> or mount the sealed /input\n`);
    process.exit(2); // without a snapshot there is nothing to score
} // the snapshot has to exist before any work starts

// Where the finished output goes: an explicit --output wins, then the
// environment, then the grading container's /output.
const outDir: string = flagValue('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

// Score the snapshot, and refuse to write anything when the board fails the gate.
const snapshot: radar.Snapshot = radar.parseSnapshot(fs.readFileSync(inputPath, 'utf8'));
const built: { board: radar.BoardRow[]; radar: radar.RadarData } = radar.buildRadar(snapshot);
const problem: string | null = radar.boardIssue(built.board, snapshot);
if (problem !== null) {
    process.stderr.write(`token radar: the model wrote a board the gate refuses: ${problem}\n`);
    process.exit(1); // a refused board never reaches the output directory
} // the board passed the gate, so the output may be written now

// The board and the dashboard data land first; the dossier comes later.
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'board.json'), `${JSON.stringify({ rows: built.board })}\n`);
fs.writeFileSync(path.join(outDir, 'data.js'), radar.dataScript(built.radar));

// Copies every plain file from `source` into `target`, skipping dotfiles,
// and hands back the copied names so the caller can count the screenshots.
const copyPlainFiles = (source: string, target: string): string[] => {
    if (fs.existsSync(source) === false) {
        return [];
    } // an absent directory contributes nothing
    fs.mkdirSync(target, { recursive: true });
    const gathered: string[] = [];
    for (const entry of fs.readdirSync(source)) {
        if (entry.startsWith('.')) {
            continue;
        } // dotfiles stay behind
        const origin: string = path.join(source, entry);
        if (fs.statSync(origin).isFile() === false) {
            continue;
        } // only plain files travel; directories stay behind
        fs.copyFileSync(origin, path.join(target, entry));
        gathered.push(entry);
    } // every entry in the source directory has been looked at
    return [...gathered];
}; // copyPlainFiles

copyPlainFiles(path.join(entryDir, 'dashboard'), path.join(outDir, 'dashboard'));
const shots: string[] = copyPlainFiles(path.join(entryDir, 'screenshots'), path.join(outDir, 'screenshots'));
if (shots.length <= 2) {
    const word: string = shots.length === 1 ? '' : 's';
    process.stderr.write(`token radar: screenshots/ holds ${shots.length} image${word}: hand in 3, the board, a detail view and a filtered view\n`);
    process.exit(1); // the board needs its three pictures
} // three screenshots are the minimum the board ships with
for (const shot of shots) {
    if (SHOT_NAME.test(shot)) {
        continue;
    } // a well-formed name needs no complaint
    process.stderr.write(`token radar: screenshots/${shot}: a name is letters, digits and . _ -, 1 to 128 characters\n`);
    process.exit(1); // a bad screenshot name stops the run
} // every screenshot name has been checked

// The dossier is written last of all: the scorer rebuilds it from this
// output directory and compares the bytes, so nothing may change afterwards.
const dossierText: string = dossierLib.buildDossier(outDir, {
    text_max_bytes: MAX_TEXT_BYTES,
    screenshots: SHOT_LIMITS,
    dashboard: { max_files: 400, max_bytes: 4_194_304 },
}); // dossier options closed
fs.writeFileSync(path.join(outDir, 'dossier.json'), dossierText);

const summary: string =
    `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ${built.board.length} rows scored (${built.radar.early_size} early, ${built.radar.live_size} live set aside)\n` +
    `token radar: wrote ${path.join(outDir, 'board.json')}, ${path.join(outDir, 'data.js')}, ${path.join(outDir, 'dashboard')} (3 files), ${path.join(outDir, 'screenshots')} (${shots.length} images) and ${path.join(outDir, 'dossier.json')}\n`;
process.stdout.write(summary);
