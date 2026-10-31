// Node benchmark of the projective conic constants (ADR 0033 sections 2 and 3). Math path only; no browser, no React.
import {sampleConic, DEFAULT_SAMPLE_DENSITY, type SamplerView} from '../../src/projective/conicSampler';
import {DIRECTION_BOUND, DIRECTION_TABLE, secondIntersection, type Direction} from '../../src/projective/conicPencil';
import {normalize, toAffine, type Hom} from '../../src/projective/homogeneous';
import type {Conic} from '../../src/projective/conic';
import {
    DEFAULT_PASCAL_MODEL, PASCAL_CONIC_IDS, PASCAL_CONICS, PASCAL_DEFAULT_INDICES, PASCAL_HANDLE_COUNT, PASCAL_VIEW_BOX,
    evaluatePascal, handlePoint, reachableIndices, type PascalConicId, type PascalModel,
} from '../../src/graphs/projective/pascalModel';
import {dragHandle, setConic as setPascalConic} from '../../src/graphs/projective/pascalEdit';
import {
    DEFAULT_POLE_POLAR_MODEL, POLE_POLAR_CONIC_IDS, POLE_POLAR_CONICS, POLE_POLAR_VIEW_BOX, evaluatePolePolar,
    type PolePolarConicId, type PolePolarModel,
} from '../../src/graphs/projective/polePolarModel';
import {moveP, setConic as setPolePolarConic} from '../../src/graphs/projective/polePolarEdit';

export const DENSITIES = [180, 270, 360, 540, 720, 1080, 1440];
export const BOUNDS = [8, 10, 12, 14, 16, 20, 24, 32];
const SCALES = [1000, 1920]; // px of a 24-unit-wide view
const REACH_X = 11.8, REACH_Y = 10.3; // as pascalModel.ts
const MOVES = 240;
const now = (): number => performance.now();

export interface Stat {median: number; p95: number; min: number; n: number}
function stat(values: number[]): Stat {
    const s = [...values].sort((a, b) => a - b);
    const at = (p: number): number => s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
    return {median: at(0.5), p95: at(0.95), min: s[0], n: s.length};
}
function time(fn: () => void, warm: number, repeats: number): Stat {
    for (let i = 0; i < warm; i++) fn();
    const out: number[] = [];
    for (let i = 0; i < repeats; i++) { const t = now(); fn(); out.push(now() - t); }
    return stat(out);
}

const viewOf = (box: readonly number[]): SamplerView => ({xMin: box[0], xMax: box[2], yMin: box[3], yMax: box[1]});

// ---- A ------------------------------------------------------------------------------------------------------------
interface SweepRow {family: string; conic: string; density: number; ms: Stat; vertices: number; pieces: number; maxDevPx: Record<string, number>; error?: string}

function maxDeviation(c: Conic, pieces: {points: readonly {x: number; y: number}[]}[]): number {
    const [A, B, C, D, E, F] = c.map(Number);
    let worst = 0; // in view units
    for (const piece of pieces) {
        for (let i = 0; i + 1 < piece.points.length; i++) {
            const mx = (piece.points[i].x + piece.points[i + 1].x) / 2, my = (piece.points[i].y + piece.points[i + 1].y) / 2;
            const f = A * mx * mx + B * mx * my + C * my * my + D * mx + E * my + F;
            const gx = 2 * A * mx + B * my + D, gy = B * mx + 2 * C * my + E;
            const g = Math.hypot(gx, gy);
            if (g < 1e-9) continue; // node of a line pair
            worst = Math.max(worst, Math.abs(f) / g);
        }
    }
    return worst;
}

function densitySweep(log: (s: string) => void): SweepRow[] {
    const rows: SweepRow[] = [];
    const cases: [string, string, Conic, SamplerView][] = [
        ...PASCAL_CONIC_IDS.map((id): [string, string, Conic, SamplerView] => ['K2', id, PASCAL_CONICS[id].conic, viewOf(PASCAL_VIEW_BOX)]),
        ...POLE_POLAR_CONIC_IDS.map((id): [string, string, Conic, SamplerView] => ['K3', id, POLE_POLAR_CONICS[id], viewOf(POLE_POLAR_VIEW_BOX)]),
    ];
    for (const [family, name, c, view] of cases) {
        for (const density of DENSITIES) {
            let ms: Stat, sampled: ReturnType<typeof sampleConic>;
            log(`  ${family} ${name} ${density}`);
            try {
                const t0 = now();
                sampled = sampleConic(c, view, density);
                const first = now() - t0;
                // a slow case gets fewer repeats so that a pathological density cannot stall the run
                ms = time(() => { sampleConic(c, view, density); }, first > 200 ? 0 : 5, first > 200 ? 3 : 25);
            } catch (error) { // a sampler failure is a finding, not a reason to lose the other rows
                rows.push({family, conic: name, density, ms: stat([NaN]), vertices: NaN, pieces: NaN, maxDevPx: {}, error: String(error)});
                continue;
            }
            const dev = maxDeviation(c, [...sampled.pieces]);
            rows.push({
                family, conic: name, density, ms,
                vertices: sampled.pieces.reduce((n, p) => n + p.points.length, 0), pieces: sampled.pieces.length,
                maxDevPx: Object.fromEntries(SCALES.map(s => [String(s), dev * s / 24])),
            });
        }
    }
    return rows;
}

// ---- B ------------------------------------------------------------------------------------------------------------
function buildTable(bound: number): Direction[] {
    const gcd = (a: number, b: number): number => { a = Math.abs(a); b = Math.abs(b); while (b !== 0) [a, b] = [b, a % b]; return a; };
    const out: Direction[] = [];
    for (let q = 0; q <= bound; q++) for (let p = -bound; p <= bound; p++) {
        if (q === 0 && p <= 0) continue;
        if (gcd(p, q) === 1) out.push([p, q]);
    }
    out.sort((a, b) => b[0] * a[1] - a[0] * b[1]);
    return out;
}

const bits = (n: bigint): number => (n < 0n ? -n : n).toString(2).length;
interface Reach {indices: number[]; pts: ({x: number; y: number} | undefined)[]; maxBits: number}

function reachFor(table: readonly Direction[], c: Conic, base: Hom): Reach {
    const indices: number[] = [], pts: Reach['pts'] = [];
    let maxBits = 0;
    for (let i = 0; i < table.length; i++) {
        const r = secondIntersection(c, base, table[i]);
        let p: Hom | undefined;
        if (r.status === 'ok') p = r.ideal ? undefined : normalize(r.point);
        else if (r.status === 'tangent') p = normalize(r.point);
        if (p === undefined) { pts.push(undefined); continue; }
        const a = toAffine(p);
        if (a.kind === 'finite' && Math.abs(a.view.x) <= REACH_X && Math.abs(a.view.y) <= REACH_Y) {
            indices.push(i); pts.push(a.view);
            maxBits = Math.max(maxBits, bits(p[0]), bits(p[1]), bits(p[2]));
        } else pts.push(undefined);
    }
    return {indices, pts, maxBits};
}

interface BoundRow {
    bound: number; tableSize: number; maxAngleGapDeg: number; coldMsAllHandles: Record<string, Stat>;
    reachMin: number; reachMedian: number; gapPxMax: number; gapPxMedianOfMedians: number; gapPxMaxAdjacent: number;
    maxBits: number; perConicHandle: {conic: string; handle: number; reachable: number; maxGapPx: number; medianGapPx: number; maxAdjGapPx: number; maxBits: number}[];
}

function medianOf(v: number[]): number { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN; }

function boundSweep(): BoundRow[] {
    const scale = 1000 / 24;
    return BOUNDS.map(bound => {
        const table = buildTable(bound);
        let maxAngleGapDeg = 0;
        for (let i = 0; i < table.length; i++) {
            const a = Math.atan2(table[i][1], table[i][0]);
            const b = i + 1 < table.length ? Math.atan2(table[i + 1][1], table[i + 1][0]) : Math.atan2(table[0][1], table[0][0]) + Math.PI;
            maxAngleGapDeg = Math.max(maxAngleGapDeg, (b - a) * 180 / Math.PI);
        }
        const perConicHandle: BoundRow['perConicHandle'] = [];
        const coldMsAllHandles: Record<string, Stat> = {};
        for (const id of PASCAL_CONIC_IDS) {
            const def = PASCAL_CONICS[id];
            coldMsAllHandles[id] = time(() => { for (let h = 0; h < PASCAL_HANDLE_COUNT; h++) reachFor(table, def.conic, def.bases[h]); }, 1, 5);
            for (let h = 0; h < PASCAL_HANDLE_COUNT; h++) {
                const r = reachFor(table, def.conic, def.bases[h]);
                const gaps: number[] = [], adj: number[] = [];
                const dist = (i: number, j: number): number => {
                    const a = r.pts[i], b = r.pts[j];
                    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) * scale : NaN;
                };
                for (let k = 0; k < r.indices.length; k++) gaps.push(dist(r.indices[k], r.indices[(k + 1) % r.indices.length]));
                for (let i = 0; i < table.length; i++) { const d = dist(i, (i + 1) % table.length); if (!Number.isNaN(d)) adj.push(d); }
                perConicHandle.push({
                    conic: id, handle: h, reachable: r.indices.length,
                    maxGapPx: r.indices.length > 1 ? Math.max(...gaps) : NaN, medianGapPx: medianOf(gaps),
                    maxAdjGapPx: adj.length ? Math.max(...adj) : NaN, maxBits: r.maxBits,
                });
            }
        }
        const finite = (v: number): boolean => !Number.isNaN(v);
        return {
            bound, tableSize: table.length, maxAngleGapDeg, coldMsAllHandles,
            reachMin: Math.min(...perConicHandle.map(x => x.reachable)), reachMedian: medianOf(perConicHandle.map(x => x.reachable)),
            gapPxMax: Math.max(...perConicHandle.map(x => x.maxGapPx).filter(finite)),
            gapPxMedianOfMedians: medianOf(perConicHandle.map(x => x.medianGapPx).filter(finite)),
            gapPxMaxAdjacent: Math.max(...perConicHandle.map(x => x.maxAdjGapPx).filter(finite)),
            maxBits: Math.max(...perConicHandle.map(x => x.maxBits)), perConicHandle,
        };
    });
}

// ---- C ------------------------------------------------------------------------------------------------------------
interface InteractionRow {name: string; perMoveMs: Stat; changedMoves?: number; moves: number}

function k2Drag(id: PascalConicId): InteractionRow {
    const times: number[] = [];
    let changed = 0, moves = 0;
    for (let handle = 0; handle < PASCAL_HANDLE_COUNT; handle++) {
        const bv = toAffine(PASCAL_CONICS[id].bases[handle]);
        if (bv.kind !== 'finite') continue;
        for (let pass = 0; pass < 6; pass++) { // pass 0 is a warm-up
            let model: PascalModel = {...DEFAULT_PASCAL_MODEL, example: 'custom', conic: id, indices: PASCAL_DEFAULT_INDICES[id]};
            for (let k = 0; k < MOVES; k++) {
                const a = 2 * Math.PI * k / MOVES, to = {x: bv.view.x + 4 * Math.cos(a), y: bv.view.y + 4 * Math.sin(a)};
                const t = now();
                const next = dragHandle(model, handle, to);
                evaluatePascal(next);
                const dt = now() - t;
                if (pass > 0) { times.push(dt); moves++; if (next !== model) changed++; }
                model = next;
            }
        }
    }
    return {name: `K2 drag ${id}`, perMoveMs: stat(times), changedMoves: changed, moves};
}

function k3Drag(id: PolePolarConicId): InteractionRow {
    const times: number[] = [];
    let changed = 0, moves = 0;
    for (let pass = 0; pass < 31; pass++) {
        let model: PolePolarModel = {...DEFAULT_POLE_POLAR_MODEL, example: 'custom', conic: id};
        for (let k = 0; k < MOVES; k++) {
            const a = 2 * Math.PI * k / MOVES, to = {x: 9 * Math.cos(a), y: 7 * Math.sin(2 * a)};
            const t = now();
            const next = moveP(model, to);
            evaluatePolePolar(next);
            const dt = now() - t;
            if (pass > 0) { times.push(dt); moves++; if (next !== model) changed++; }
            model = next;
        }
    }
    return {name: `K3 drag P ${id}`, perMoveMs: stat(times), changedMoves: changed, moves};
}

/** Cold reachable lists of the six handles by direct computation (the module cache cannot be cleared). */
function coldReach(id: PascalConicId): void {
    for (let h = 0; h < PASCAL_HANDLE_COUNT; h++) {
        let n = 0;
        for (let i = 0; i < DIRECTION_TABLE.length; i++) {
            const p = handlePoint(id, h, i);
            if (p === undefined) continue;
            const a = toAffine(p);
            if (a.kind === 'finite' && Math.abs(a.view.x) <= REACH_X && Math.abs(a.view.y) <= REACH_Y) n++;
        }
        if (n < 0) throw new Error('unreachable');
    }
}

function switches(): InteractionRow[] {
    const rows: InteractionRow[] = [];
    const k2View = viewOf(PASCAL_VIEW_BOX), k3View = viewOf(POLE_POLAR_VIEW_BOX);
    for (const id of PASCAL_CONIC_IDS) {
        const other = PASCAL_CONIC_IDS.find(x => x !== id) as PascalConicId;
        const run = (cold: boolean) => (): void => {
            const m = setPascalConic({...DEFAULT_PASCAL_MODEL, conic: other}, id);
            evaluatePascal(m); sampleConic(PASCAL_CONICS[id].conic, k2View);
            if (cold) coldReach(id);
        };
        const warm = time(run(false), 3, 20), cold = time(run(true), 1, 7);
        rows.push({name: `K2 switch to ${id} (setConic+evaluate+sample)`, perMoveMs: warm, moves: warm.n});
        rows.push({name: `K2 switch to ${id} + cold reachable lists`, perMoveMs: cold, moves: cold.n});
    }
    for (const id of POLE_POLAR_CONIC_IDS) {
        const other = POLE_POLAR_CONIC_IDS.find(x => x !== id) as PolePolarConicId;
        const s = time(() => {
            const m = setPolePolarConic({...DEFAULT_POLE_POLAR_MODEL, conic: other}, id);
            evaluatePolePolar(m); sampleConic(POLE_POLAR_CONICS[id], k3View);
        }, 3, 20);
        rows.push({name: `K3 switch to ${id} (setConic+evaluate+sample)`, perMoveMs: s, moves: s.n});
    }
    return rows;
}

export interface Results {
    constants: {DEFAULT_SAMPLE_DENSITY: number; DIRECTION_BOUND: number; tableSize: number};
    densitySweep: SweepRow[]; boundSweep: BoundRow[]; interactions: InteractionRow[];
}

export function runBenchmark(log: (s: string) => void = () => undefined): Results {
    for (const id of PASCAL_CONIC_IDS) for (let h = 0; h < PASCAL_HANDLE_COUNT; h++) reachableIndices(id, h); // module cache, as in the app
    log('A density sweep'); const densitySweepRows = densitySweep(log);
    log('B bound sweep'); const boundRows = boundSweep();
    log('C interactions');
    const interactions = [...PASCAL_CONIC_IDS.map(k2Drag), ...POLE_POLAR_CONIC_IDS.map(k3Drag), ...switches()];
    return {
        constants: {DEFAULT_SAMPLE_DENSITY, DIRECTION_BOUND, tableSize: DIRECTION_TABLE.length},
        densitySweep: densitySweepRows, boundSweep: boundRows, interactions,
    };
}

// ---- markdown -----------------------------------------------------------------------------------------------------
const f = (v: number, d = 2): string => Number.isFinite(v) ? v.toFixed(d) : 'n/a';
const st = (s: Stat, d = 2): string => `${f(s.median, d)} / ${f(s.p95, d)}`;

export function renderMarkdown(r: Results, env: Record<string, string>): string {
    const L: string[] = ['# Projective conic benchmark', '', ...Object.entries(env).map(([k, v]) => `- ${k}: ${v}`),
        `- constants: density ${r.constants.DEFAULT_SAMPLE_DENSITY}, bound ${r.constants.DIRECTION_BOUND} (table ${r.constants.tableSize})`, '',
        '## A. Density sweep (view 24 units wide)', '', 'Time is median / p95 ms. Dev = max segment-midpoint deviation, px at 1000 / 1920 px.', '',
        '| family | conic | density | ms | vertices | pieces | dev@1000 | dev@1920 |', '|---|---|---|---|---|---|---|---|'];
    for (const x of r.densitySweep) if (x.error) L.push(`| ${x.family} | ${x.conic} | ${x.density} | ERROR ${x.error} | | | | |`); else L.push(`| ${x.family} | ${x.conic} | ${x.density} | ${st(x.ms)} | ${x.vertices} | ${x.pieces} | ${f(x.maxDevPx['1000'], 3)} | ${f(x.maxDevPx['1920'], 3)} |`);
    L.push('', '## B. Table bound sweep', '',
        'Gaps in px at 1000 px (consecutive reachable points in table order, cyclic; "adj" = only table-adjacent pairs that are both reachable). Reach is over the 24 conic/handle pairs. Cold = six handles, median / p95 ms, per conic.', '',
        '| bound | table | max dir gap deg | reach min/median | max gap px | median-of-median gap px | max adj gap px | max bits | cold ms ell | par | hyp | pair |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const x of r.boundSweep) {
        const c = x.coldMsAllHandles;
        L.push(`| ${x.bound} | ${x.tableSize} | ${f(x.maxAngleGapDeg)} | ${x.reachMin}/${x.reachMedian} | ${f(x.gapPxMax, 1)} | ${f(x.gapPxMedianOfMedians, 2)} | ${f(x.gapPxMaxAdjacent, 1)} | ${x.maxBits} | ${st(c.ellipse, 1)} | ${st(c.parabola, 1)} | ${st(c.hyperbola, 1)} | ${st(c.linePair, 1)} |`);
    }
    L.push('', '### B per conic and handle (max gap px / median gap px / reachable) by bound', '', '| conic.handle | ' + r.boundSweep.map(b => b.bound).join(' | ') + ' |', '|---|' + r.boundSweep.map(() => '---').join('|') + '|');
    for (let i = 0; i < r.boundSweep[0].perConicHandle.length; i++) {
        const a = r.boundSweep[0].perConicHandle[i];
        L.push(`| ${a.conic}.${a.handle} | ` + r.boundSweep.map(b => { const e = b.perConicHandle[i]; return `${f(e.maxGapPx, 0)}/${f(e.medianGapPx, 1)}/${e.reachable}`; }).join(' | ') + ' |');
    }
    L.push('', '## C. Interactions at current constants', '', 'Per move (drag) or per switch, ms median / p95.', '', '| case | median / p95 ms | moves | moves that changed the model |', '|---|---|---|---|');
    for (const x of r.interactions) L.push(`| ${x.name} | ${st(x.perMoveMs, 3)} | ${x.moves} | ${x.changedMoves ?? ''} |`);
    return L.join('\n') + '\n';
}
