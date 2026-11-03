// Node benchmark of the school function zero drags (S3 polynomial zeros, S4 rational function; slice 06 F2a). Math path only; no browser, no React.
// Per move it runs the chain of the graphs: the model edit (moveRationalZero / movePolynomialZero), the facts (rationalFacts / polynomialFacts)
// and the curve sampling (plotPieces at the graph's view; the S3 derivative curve is timed as its own column).
import {
    RATIONAL_EXAMPLE_IDS, moveRationalZero, rationalExampleModel, rationalFacts, rationalSpecsOf, type RationalExampleId, type RationalFunctionModel,
} from '../../src/analysis/rationalFunctionModel';
import {analyzeRational} from '../../src/analysis/rational';
import {
    POLYNOMIAL_EXAMPLE_IDS, movePolynomialZero, polynomialExampleModel, polynomialFacts, polynomialSpecOf, type PolynomialZerosModel,
} from '../../src/analysis/polynomialZerosModel';
import {plotPieces, type PlotPoint} from '../../src/analysis/schoolFunctions';
import {polyDerivativeValue} from '../../src/analysis/polynomial';

const RATIONAL_VIEW = {left: -11, top: 9, right: 11, bottom: -9}; // RationalFunctionGraph.defaultBoundingBox
const POLY_VIEW = {left: -6, top: 8, right: 6, bottom: -8}; // PolynomialZerosGraph.defaultBoundingBox
const DERIVATIVE_SAMPLES = 400; // PolynomialZerosGraph
const STEPS = 150, STEP = 0.1, START = -7.5; // grid steps of the dragged zero
export const SAMPLES = [300, 600]; // 600 is the plotPieces default, which both graphs use
const WARM_RUNS = 2, RUNS = 7;
const now = (): number => performance.now();

export interface Stat {median: number; p95: number; max: number; n: number}
function stat(values: number[]): Stat {
    const s = [...values].sort((a, b) => a - b);
    const at = (p: number): number => s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
    return {median: at(0.5), p95: at(0.95), max: s[s.length - 1], n: s.length};
}
const grid = (i: number): number => Number((START + i * STEP).toFixed(1));

export interface Row {
    case: string; samples: number; moves: number; rejected: number; holeMoves: number;
    edit: Stat; facts: Stat; analyze: Stat; plot: Stat; derivative?: Stat; total: Stat;
    vertices: {median: number; max: number}; pieces: {median: number; max: number};
}

interface Chain {facts: () => unknown; analyze: () => unknown; plot: () => PlotPoint[][]; derivative?: () => unknown}

function drag<M>(
    name: string, samples: number, start: M, move: (m: M, x: number) => {ok: boolean; model?: M},
    chain: (m: M) => Chain, holes: (m: M) => number,
): Row {
    const t = {edit: [] as number[], facts: [] as number[], analyze: [] as number[], plot: [] as number[], derivative: [] as number[], total: [] as number[]};
    const vertices: number[] = [], pieces: number[] = [];
    let rejected = 0, holeMoves = 0, hasDerivative = false;
    for (let run = 0; run < WARM_RUNS + RUNS; run++) {
        const record = run >= WARM_RUNS;
        let model = start;
        const first = move(model, grid(0));
        if (first.ok && first.model !== undefined) model = first.model;
        for (let i = 1; i <= STEPS; i++) {
            const t0 = now();
            const edit = move(model, grid(i));
            const t1 = now();
            if (!edit.ok || edit.model === undefined) { if (record) rejected++; continue; }
            if (edit.model === model) continue; // unchanged: the graph does not redraw
            model = edit.model;
            const c = chain(model);
            const t2 = now(); c.facts();
            const t3 = now(); c.analyze();
            const t4 = now(); const out = c.plot();
            const t5 = now(); if (c.derivative) { c.derivative(); hasDerivative = true; }
            const t6 = now();
            if (!record) continue;
            t.edit.push(t1 - t0); t.facts.push(t3 - t2); t.analyze.push(t4 - t3); t.plot.push(t5 - t4); t.derivative.push(t6 - t5);
            t.total.push((t1 - t0) + (t3 - t2) + (t5 - t4) + (t6 - t5));
            vertices.push(out.reduce((n, piece) => n + piece.length, 0)); pieces.push(out.length);
            if (holes(model) > 0) holeMoves++;
        }
    }
    const sorted = (v: number[]): {median: number; max: number} => { const s = [...v].sort((a, b) => a - b); return {median: s[Math.floor(s.length / 2)], max: s[s.length - 1]}; };
    return {
        case: name, samples, moves: t.total.length, rejected, holeMoves,
        edit: stat(t.edit), facts: stat(t.facts), analyze: stat(t.analyze), plot: stat(t.plot), derivative: hasDerivative ? stat(t.derivative) : undefined,
        total: stat(t.total), vertices: sorted(vertices), pieces: sorted(pieces),
    };
}

const rationalRow = (id: RationalExampleId, samples: number): Row => {
    const v = RATIONAL_VIEW;
    return drag<RationalFunctionModel>(`S4 ${id}`, samples, rationalExampleModel(id),
        (m, x) => { const e = moveRationalZero(m, 'numerator', 0, x); return e.ok ? {ok: true, model: e.model} : {ok: false}; },
        m => {
            const {numerator, denominator} = rationalSpecsOf(m);
            return {
                facts: () => rationalFacts(m), analyze: () => analyzeRational(numerator, denominator),
                plot: () => plotPieces({kind: 'rational', numerator, denominator}, v.left, v.right, v.bottom, v.top, samples),
            };
        },
        m => { const {numerator, denominator} = rationalSpecsOf(m); return analyzeRational(numerator, denominator).holes.length; });
};

const polyRow = (id: typeof POLYNOMIAL_EXAMPLE_IDS[number], samples: number): Row => {
    const v = POLY_VIEW;
    return drag<PolynomialZerosModel>(`S3 ${id}`, samples, polynomialExampleModel(id),
        (m, x) => { const e = movePolynomialZero(m, 0, x); return e.ok ? {ok: true, model: e.model} : {ok: false}; },
        m => {
            const spec = polynomialSpecOf(m);
            return {
                facts: () => polynomialFacts(m), analyze: () => 0,
                plot: () => plotPieces({kind: 'poly', ...spec}, v.left, v.right, v.bottom, v.top, samples),
                derivative: () => { let s = 0; for (let i = 0; i <= DERIVATIVE_SAMPLES; i++) s += polyDerivativeValue(spec, v.left + (v.right - v.left) * i / DERIVATIVE_SAMPLES, 1); return s; },
            };
        },
        () => 0);
};

export function runBenchmark(log: (s: string) => void = () => {}): {rows: Row[]} {
    const rows: Row[] = [];
    for (const samples of SAMPLES) {
        for (const id of RATIONAL_EXAMPLE_IDS) { const r = rationalRow(id, samples); rows.push(r); log(`${r.case} @${samples}: median ${r.total.median.toFixed(3)} ms`); }
        for (const id of ['default', 'degree-five'] as const) { const r = polyRow(id, samples); rows.push(r); log(`${r.case} @${samples}: median ${r.total.median.toFixed(3)} ms`); }
    }
    return {rows};
}

const f = (n: number): string => n.toFixed(3);
const s3 = (s: Stat): string => `${f(s.median)} / ${f(s.p95)} / ${f(s.max)}`;
export function renderMarkdown(results: {rows: Row[]}, env: Record<string, string>): string {
    const lines = [
        '# School function zero-drag benchmark (slice 06 F2a)', '',
        `Node ${env.node}; ${env.cpu}; ${env.os}; git ${env.gitHead}; ${env.date}.`,
        `Drag: ${STEPS} grid steps of ${STEP} from ${START}, ${RUNS} recorded runs after ${WARM_RUNS} warm-ups; unchanged moves are excluded, rejected moves are counted. Times in ms as median / p95 / max per move.`, '',
        '| case | samples | moves | rejected | hole moves | edit | facts | analyzeRational | plotPieces | S3 derivative | total | vertices med/max | pieces med/max |',
        '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ];
    for (const r of results.rows) {
        lines.push(`| ${r.case} | ${r.samples} | ${r.moves} | ${r.rejected} | ${r.holeMoves} | ${s3(r.edit)} | ${s3(r.facts)} | ${r.case.startsWith('S4') ? s3(r.analyze) : '-'} | ${s3(r.plot)} | ${r.derivative ? s3(r.derivative) : '-'} | ${s3(r.total)} | ${r.vertices.median}/${r.vertices.max} | ${r.pieces.median}/${r.pieces.max} |`);
    }
    lines.push('', 'The total is edit + facts + plotPieces (+ derivative for S3). `analyzeRational` is timed separately; for S4 it runs once inside `facts` and once inside `plotPieces`, so it is not added again.');
    return lines.join('\n') + '\n';
}
