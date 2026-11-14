import {describe, expect, it} from 'vitest';
import {
    EPICYCLE_MAX_N,
    coefficientAt,
    epicycleChain,
    loopCoefficients,
    validateLoop,
} from './closedSpline';
import {EPICYCLE_OUTLINE_DATA} from './epicycleOutlines';
import {
    EPICYCLE_EXAMPLE_IDS,
    EPICYCLE_OUTLINE_DEFAULT_N,
    EPICYCLE_OUTLINE_IDS,
    EPICYCLE_TRACE_SAMPLES,
    EpicycleModel,
    analyzeEpicycle,
    checkEpicycleModel,
    chooseEpicycleExample,
    defaultEpicycleModel,
    epicycleExample,
    epicycleLoop,
    epicycleTerms,
    epicycleTrace,
    isEpicycleOutlineId,
    matchEpicycleExample,
    maxTraceError,
    moveEpicycleControl,
    moveEpicycleVertex,
    parseEpicycleModel,
    setEpicycleN,
    setEpicycleParametrization,
    snapEpicycleValue,
} from './epicycleModel';

const ok = (edit: {ok: boolean; model?: EpicycleModel}): EpicycleModel => {
    expect(edit.ok).toBe(true);
    return edit.model as EpicycleModel;
};
const clone = (m: EpicycleModel) => JSON.parse(JSON.stringify(m));
const issueOf = (data: unknown) => {
    const c = checkEpicycleModel(data);
    expect(c.ok).toBe(false);
    return c.ok ? undefined : c.issue;
};

describe('defaults and examples', () => {
    it('defaults to the circle with N = 5 and equal parametrization', () => {
        const m = defaultEpicycleModel();
        expect(m.N).toBe(5);
        expect(m.parametrization).toBe('equal');
        expect(m.vertices).toHaveLength(4);
        expect(m.spans.every((s) => s.kind === 'cubic')).toBe(true);
        expect(matchEpicycleExample(m)).toBe('circle');
    });

    it('every example is valid, in range, and builds a closed kernel loop', () => {
        for (const id of EPICYCLE_EXAMPLE_IDS) {
            const m = epicycleExample(id);
            expect(checkEpicycleModel(m).ok).toBe(true);
            expect(validateLoop(epicycleLoop(m))).toEqual({ok: true});
            expect(matchEpicycleExample(m)).toBe(id);
        }
    });

    it('uneven has six cubic spans on the 0,05 grid and a longest chord at least three times the shortest', () => {
        const m = epicycleExample('uneven');
        expect(m.spans).toHaveLength(6);
        expect(m.spans.every((s) => s.kind === 'cubic')).toBe(true);
        const points = [...m.vertices];
        for (const s of m.spans) if (s.kind === 'cubic') points.push(s.c1, s.c2);
        for (const p of points) {
            expect(snapEpicycleValue(p.x)).toBeCloseTo(p.x, 12);
            expect(snapEpicycleValue(p.y)).toBeCloseTo(p.y, 12);
        }
        const chords = m.vertices.map((v, i) => Math.hypot(m.vertices[(i + 1) % 6].x - v.x, m.vertices[(i + 1) % 6].y - v.y));
        expect(Math.max(...chords) / Math.min(...chords)).toBeGreaterThanOrEqual(3);
    });

    it('choosing an example resets the loop and keeps N and the parametrization', () => {
        let m = ok(setEpicycleN(defaultEpicycleModel(), 17));
        m = ok(setEpicycleParametrization(m, 'chord'));
        const next = ok(chooseEpicycleExample(m, 'diamond'));
        expect(next.N).toBe(17);
        expect(next.parametrization).toBe('chord');
        expect(matchEpicycleExample(next)).toBe('diamond');
        expect(next.spans.every((s) => s.kind === 'line')).toBe(true);
        const bad = chooseEpicycleExample(m, 'star');
        expect(bad).toEqual({ok: false, issue: {kind: 'example', allowed: EPICYCLE_EXAMPLE_IDS}});
    });

    it('matchEpicycleExample is undefined after an edit, also of a control only', () => {
        const m = defaultEpicycleModel();
        expect(matchEpicycleExample(ok(moveEpicycleVertex(m, 0, 1.5, 0)))).toBeUndefined();
        expect(matchEpicycleExample(ok(moveEpicycleControl(m, 0, 1, 1, 0.5)))).toBeUndefined();
        // N and parametrization are not part of the match.
        expect(matchEpicycleExample(ok(setEpicycleN(m, 9)))).toBe('circle');
        expect(matchEpicycleExample(ok(setEpicycleParametrization(m, 'chord')))).toBe('circle');
        // A line span versus a cubic span differ.
        const mixed = {...m, spans: [{kind: 'line' as const}, ...m.spans.slice(1)]};
        expect(matchEpicycleExample(mixed)).toBeUndefined();
    });
});

describe('strict check and parse', () => {
    it('round-trips every example through JSON exactly, kappa included', () => {
        for (const id of EPICYCLE_EXAMPLE_IDS) {
            const m = epicycleExample(id);
            expect(parseEpicycleModel(JSON.parse(JSON.stringify(m)))).toEqual(m);
        }
    });

    it('rejects each broken rule with its reason', () => {
        const base = clone(defaultEpicycleModel());
        const mod = (f: (m: any) => void) => {
            const m = clone(base);
            f(m);
            return m;
        };
        expect(issueOf(null)).toBeUndefined();
        expect(issueOf([])).toBeUndefined();
        expect(issueOf(mod((m) => (m.vertices = 'x')))).toBeUndefined();
        expect(issueOf(mod((m) => m.vertices.pop()))).toEqual({kind: 'vertex-count', min: 4, max: 8});
        expect(issueOf(mod((m) => {
            for (let i = 0; i < 5; i++) m.vertices.push({x: 0, y: 0});
        }))).toEqual({kind: 'vertex-count', min: 4, max: 8});
        expect(issueOf(mod((m) => (m.vertices[1].x = Infinity)))).toBeUndefined();
        expect(issueOf(mod((m) => (m.vertices[1].y = '1')))).toBeUndefined();
        expect(issueOf(mod((m) => (m.vertices[2].x = 3.01)))).toEqual({kind: 'coordinate', min: -3, max: 3});
        expect(issueOf(mod((m) => (m.vertices[2].y = -3.01)))).toEqual({kind: 'coordinate', min: -3, max: 3});
        expect(issueOf(mod((m) => (m.spans[0].c1.x = 4)))).toEqual({kind: 'coordinate', min: -3, max: 3});
        expect(issueOf(mod((m) => (m.spans[3].c2.y = -4)))).toEqual({kind: 'coordinate', min: -3, max: 3});
        expect(issueOf(mod((m) => delete m.spans[0].c1))).toBeUndefined();
        expect(issueOf(mod((m) => (m.spans = 5)))).toBeUndefined();
        expect(issueOf(mod((m) => m.spans.pop()))).toEqual({kind: 'spans-count', expected: 4});
        expect(issueOf(mod((m) => (m.spans[1] = {kind: 'quad'})))).toEqual({kind: 'span-kind'});
        expect(issueOf(mod((m) => (m.spans[1] = 7)))).toEqual({kind: 'span-kind'});
        expect(issueOf(mod((m) => (m.N = 51)))).toEqual({kind: 'n', min: 0, max: 50});
        expect(issueOf(mod((m) => (m.N = -1)))).toEqual({kind: 'n', min: 0, max: 50});
        expect(issueOf(mod((m) => (m.N = 2.5)))).toEqual({kind: 'n', min: 0, max: 50});
        expect(issueOf(mod((m) => (m.N = '5')))).toBeUndefined();
        expect(issueOf(mod((m) => delete m.N))).toBeUndefined();
        expect(issueOf(mod((m) => (m.parametrization = 'arc')))).toEqual({kind: 'parametrization', allowed: ['equal', 'chord']});
    });

    it('accepts the boundaries and any finite in-range value without rounding', () => {
        const m = clone(defaultEpicycleModel());
        m.N = 0;
        m.vertices[0] = {x: -3, y: 3};
        m.spans[0].c1 = {x: 0.123456789012345, y: -2.999999999};
        const parsed = parseEpicycleModel(m);
        expect(parsed).toBeDefined();
        expect(parsed?.vertices[0]).toEqual({x: -3, y: 3});
        expect(parsed?.spans[0]).toMatchObject({c1: {x: 0.123456789012345, y: -2.999999999}});
        m.N = 50;
        expect(parseEpicycleModel(m)?.N).toBe(50);
        const eight = clone(epicycleExample('diamond'));
        for (let i = 0; i < 4; i++) {
            eight.vertices.push({x: 0.5, y: i / 10});
            eight.spans.push({kind: 'line'});
        }
        expect(parseEpicycleModel(eight)?.vertices).toHaveLength(8);
    });

    it('drops unknown properties', () => {
        const m = {...clone(defaultEpicycleModel()), extra: 1};
        m.spans[0].junk = true;
        const parsed = parseEpicycleModel(m);
        expect(parsed).toBeDefined();
        expect(Object.keys(parsed as object).sort()).toEqual(['N', 'parametrization', 'spans', 'vertices']);
        expect(Object.keys(parsed?.spans[0] as object).sort()).toEqual(['c1', 'c2', 'kind']);
    });

    it('a degenerate loop (all points equal) is valid', () => {
        const m = clone(epicycleExample('diamond'));
        m.vertices = m.vertices.map(() => ({x: 0.5, y: 0.5}));
        expect(parseEpicycleModel(m)).toBeDefined();
    });
});

describe('edits', () => {
    it('setEpicycleN and parametrization validate and keep identity when unchanged', () => {
        const m = defaultEpicycleModel();
        expect(setEpicycleN(m, 5)).toEqual({ok: true, model: m});
        expect(ok(setEpicycleN(m, 0)).N).toBe(0);
        expect(ok(setEpicycleN(m, 50)).N).toBe(50);
        for (const bad of [51, -1, 1.5, NaN, '3', undefined]) {
            expect(setEpicycleN(m, bad)).toEqual({ok: false, issue: {kind: 'n', min: 0, max: 50}});
        }
        expect(setEpicycleParametrization(m, 'x').ok).toBe(false);
        expect(ok(setEpicycleParametrization(m, 'chord')).parametrization).toBe('chord');
    });

    it('moving a vertex moves its two adjacent cubic controls by the same delta', () => {
        const m = defaultEpicycleModel();
        const next = ok(moveEpicycleVertex(m, 0, 1.5, 0.25));
        expect(next.vertices[0]).toEqual({x: 1.5, y: 0.25});
        const dx = 0.5;
        const dy = 0.25;
        const s0 = m.spans[0];
        const s3 = m.spans[3];
        if (s0.kind !== 'cubic' || s3.kind !== 'cubic') throw new Error('cubic expected');
        // Span 0 leaves vertex 0: its first control moves; span 3 arrives at vertex 0: its second control moves.
        expect(next.spans[0]).toEqual({kind: 'cubic', c1: {x: s0.c1.x + dx, y: s0.c1.y + dy}, c2: s0.c2});
        expect(next.spans[3]).toEqual({kind: 'cubic', c1: s3.c1, c2: {x: s3.c2.x + dx, y: s3.c2.y + dy}});
        expect(next.spans[1]).toEqual(m.spans[1]);
        expect(next.spans[2]).toEqual(m.spans[2]);
        expect(next.vertices.slice(1)).toEqual(m.vertices.slice(1));
        // The input is not mutated.
        expect(m.vertices[0]).toEqual({x: 1, y: 0});
    });

    it('line spans have no controls to move with the vertex', () => {
        const m = epicycleExample('diamond');
        const next = ok(moveEpicycleVertex(m, 2, -2, 0));
        expect(next.spans).toEqual(m.spans);
        expect(next.vertices[2]).toEqual({x: -2, y: 0});
    });

    it('rejects the whole vertex edit when an adjacent control would leave the range', () => {
        const m = epicycleExample('uneven');
        // Vertex 3 = (1, 2); span 3 c1 = (1.65, 1.15), span 2 c2 = (0.55, 2.15). Moving by +0.9 in y puts c2 at 3.05.
        const result = moveEpicycleVertex(m, 3, 1, 2.9);
        expect(result).toEqual({ok: false, issue: {kind: 'coordinate', min: -3, max: 3}});
        // The vertex itself at 2.9 would be in range: only the control breaks the rule.
        expect(moveEpicycleVertex(m, 3, 1, 2.85).ok).toBe(true);
        // A vertex outside the range is rejected directly.
        expect(moveEpicycleVertex(m, 0, 3.01, 0).ok).toBe(false);
        expect(moveEpicycleVertex(m, 0, NaN, 0).ok).toBe(false);
        expect(moveEpicycleVertex(m, 9, 0, 0)).toEqual({ok: false, issue: {kind: 'index'}});
        expect(moveEpicycleVertex(m, 1.5, 0, 0)).toEqual({ok: false, issue: {kind: 'index'}});
    });

    it('moving a control moves only that control and allows corners', () => {
        const m = defaultEpicycleModel();
        const next = ok(moveEpicycleControl(m, 1, 2, -2.5, 2.5));
        const s = next.spans[1];
        const o = m.spans[1];
        if (s.kind !== 'cubic' || o.kind !== 'cubic') throw new Error('cubic expected');
        expect(s.c2).toEqual({x: -2.5, y: 2.5});
        expect(s.c1).toEqual(o.c1);
        expect(next.vertices).toEqual(m.vertices);
        expect(next.spans[0]).toEqual(m.spans[0]);
        expect(moveEpicycleControl(m, 1, 1, 3.5, 0)).toEqual({ok: false, issue: {kind: 'coordinate', min: -3, max: 3}});
        expect(moveEpicycleControl(m, 1, 3, 0, 0)).toEqual({ok: false, issue: {kind: 'index'}});
        expect(moveEpicycleControl(m, 7, 1, 0, 0)).toEqual({ok: false, issue: {kind: 'index'}});
        expect(moveEpicycleControl(epicycleExample('diamond'), 0, 1, 0, 0)).toEqual({ok: false, issue: {kind: 'no-control'}});
    });

    it('snaps to 0,05 (Shift 0,5) within the range', () => {
        expect(snapEpicycleValue(0.122)).toBeCloseTo(0.1, 12);
        expect(snapEpicycleValue(0.13)).toBeCloseTo(0.15, 12);
        expect(snapEpicycleValue(0.3, true)).toBeCloseTo(0.5, 12);
        expect(snapEpicycleValue(9)).toBe(3);
        expect(snapEpicycleValue(-9, true)).toBe(-3);
        expect(Object.is(snapEpicycleValue(-0.01), 0)).toBe(true);
    });
});

describe('mathematics through the model', () => {
    const circle = analyzeEpicycle(epicycleExample('circle'));
    const diamond = analyzeEpicycle(epicycleExample('diamond'));

    it('circle coefficients match the spec to 6 decimals', () => {
        const spec: Array<[number, number]> = [[1, 1.000126], [5, 0.003672], [-3, -0.003641], [-7, -0.000662], [9, 0.000547]];
        for (const [k, value] of spec) {
            const c = coefficientAt(circle.coefficients, k);
            expect(c.re).toBeCloseTo(value, 6);
            expect(c.im).toBeCloseTo(0, 6);
        }
        expect(Math.hypot(coefficientAt(circle.coefficients, 2).re, coefficientAt(circle.coefficients, 2).im)).toBeLessThan(1e-9);
    });

    it('diamond coefficients are 8 / (pi^2 k^2) for k = 1 mod 4 to 1e-10', () => {
        for (const k of [-7, -3, 1, 5, 9, 13, -11]) {
            const c = coefficientAt(diamond.coefficients, k);
            expect(Math.abs(c.re - 8 / (Math.PI ** 2 * k * k))).toBeLessThan(1e-10);
            expect(Math.abs(c.im)).toBeLessThan(1e-10);
        }
        const c2 = coefficientAt(diamond.coefficients, 2);
        expect(Math.hypot(c2.re, c2.im)).toBeLessThan(1e-9);
    });

    it('sampled maximum error matches the spec to 1e-4', () => {
        const recorded: Array<[typeof circle, number, number]> = [
            [circle, 1, 0.007346],
            [diamond, 1, 0.18943],
            [diamond, 3, 0.09937],
            [diamond, 5, 0.06694],
            [diamond, 9, 0.0404],
        ];
        for (const [analysis, N, value] of recorded) {
            expect(Math.abs(maxTraceError(analysis, N) - value)).toBeLessThan(1e-4);
        }
    });

    it('coefficients at EPICYCLE_MAX_N agree with loopCoefficients(loop, N) for k <= N to 1e-12', () => {
        for (const id of EPICYCLE_EXAMPLE_IDS) {
            const model = {...epicycleExample(id), parametrization: 'chord' as const};
            const analysis = analyzeEpicycle(model);
            expect(analysis.coefficients.N).toBe(EPICYCLE_MAX_N);
            const direct = loopCoefficients(epicycleLoop(model), 7, 'chord');
            for (let k = -7; k <= 7; k++) {
                const a = coefficientAt(analysis.coefficients, k);
                const b = coefficientAt(direct, k);
                expect(Math.abs(a.re - b.re)).toBeLessThan(1e-12);
                expect(Math.abs(a.im - b.im)).toBeLessThan(1e-12);
            }
        }
    });

    it('on uneven, chord and equal differ in |c_1| by at least 0,01', () => {
        const m = epicycleExample('uneven');
        const mod = (p: 'equal' | 'chord') => {
            const c = coefficientAt(analyzeEpicycle({...m, parametrization: p}).coefficients, 1);
            return Math.hypot(c.re, c.im);
        };
        expect(Math.abs(mod('equal') - mod('chord'))).toBeGreaterThanOrEqual(0.01);
    });

    it('chord reports fellBack for a zero chord and equal never does', () => {
        const m = epicycleExample('diamond');
        const coincident = {...m, vertices: [m.vertices[0], m.vertices[0], m.vertices[2], m.vertices[3]], parametrization: 'chord' as const};
        expect(analyzeEpicycle(coincident).fellBack).toBe(true);
        expect(analyzeEpicycle({...coincident, parametrization: 'equal'}).fellBack).toBe(false);
        expect(analyzeEpicycle(epicycleExample('uneven')).fellBack).toBe(false);
    });

    it('a degenerate loop gives c_0 only and a finite trace', () => {
        const m = epicycleExample('diamond');
        const point = {...m, vertices: m.vertices.map(() => ({x: 0.5, y: -0.25})), parametrization: 'chord' as const};
        const analysis = analyzeEpicycle(point);
        expect(analysis.fellBack).toBe(true);
        const c0 = coefficientAt(analysis.coefficients, 0);
        expect(c0.re).toBeCloseTo(0.5, 12);
        expect(c0.im).toBeCloseTo(-0.25, 12);
        for (let k = -EPICYCLE_MAX_N; k <= EPICYCLE_MAX_N; k++) {
            if (k === 0) continue;
            const c = coefficientAt(analysis.coefficients, k);
            expect(Math.hypot(c.re, c.im)).toBeLessThan(1e-12);
        }
        const trace = epicycleTrace(analysis, 50);
        expect(trace).toHaveLength(EPICYCLE_TRACE_SAMPLES);
        expect(trace.every((p) => Number.isFinite(p.re) && Number.isFinite(p.im))).toBe(true);
        expect(maxTraceError(analysis, 50)).toBeLessThan(1e-12);
    });

    it('the trace samples equal epicycleChain sums and the terms follow the chain order', () => {
        const trace = epicycleTrace(circle, 3);
        const j = 123;
        const e = epicycleChain(circle.coefficients, 3, (2 * Math.PI * j) / EPICYCLE_TRACE_SAMPLES).sum;
        expect(trace[j]).toEqual(e);
        const {centre, terms} = epicycleTerms(circle, 3);
        expect(terms).toHaveLength(6);
        expect(terms[0].k).toBe(1);
        expect(centre).toBeLessThan(1e-9);
        for (let i = 1; i < terms.length; i++) expect(terms[i].modulus).toBeLessThanOrEqual(terms[i - 1].modulus * (1 + 1e-12));
        expect(epicycleTerms(circle, 0).terms).toEqual([]);
    });
});

describe('fixed outlines (G07)', () => {
    const outline = (id: 'slovenia' | 'cat' | 'blossom') => epicycleExample(id);

    it('offers the three outlines after the three loops, and the default is unchanged', () => {
        expect([...EPICYCLE_OUTLINE_IDS]).toEqual(['slovenia', 'cat', 'blossom']);
        expect([...EPICYCLE_EXAMPLE_IDS]).toEqual(['circle', 'diamond', 'uneven', 'slovenia', 'cat', 'blossom']);
        expect(matchEpicycleExample(defaultEpicycleModel())).toBe('circle');
        for (const id of EPICYCLE_OUTLINE_IDS) expect(isEpicycleOutlineId(id)).toBe(true);
        expect(isEpicycleOutlineId('circle')).toBe(false);
        expect(isEpicycleOutlineId(undefined)).toBe(false);
    });

    it('builds an outline model of line spans with the default N and the outline id', () => {
        for (const id of EPICYCLE_OUTLINE_IDS) {
            const m = outline(id);
            expect(m.outline).toBe(id);
            expect(m.N).toBe(EPICYCLE_OUTLINE_DEFAULT_N);
            expect(m.parametrization).toBe('equal');
            expect(m.vertices.length).toBe(EPICYCLE_OUTLINE_DATA[id].points.length);
            expect(m.spans.length).toBe(m.vertices.length);
            expect(m.spans.every((s) => s.kind === 'line')).toBe(true);
            expect(validateLoop(epicycleLoop(m))).toEqual({ok: true});
            expect(matchEpicycleExample(m)).toBe(id);
        }
        // The loop examples carry no outline key at all.
        expect('outline' in epicycleExample('circle')).toBe(false);
    });

    it('refuses vertex and control edits with fixed-outline, whatever the arguments', () => {
        const m = outline('cat');
        expect(moveEpicycleVertex(m, 0, 0, 0)).toEqual({ok: false, issue: {kind: 'fixed-outline'}});
        expect(moveEpicycleVertex(m, 9999, 'x', 0)).toEqual({ok: false, issue: {kind: 'fixed-outline'}});
        expect(moveEpicycleControl(m, 0, 1, 0, 0)).toEqual({ok: false, issue: {kind: 'fixed-outline'}});
    });

    it('keeps the outline when N or the parametrization changes', () => {
        const m = outline('slovenia');
        const n = ok(setEpicycleN(m, 33));
        expect(n.outline).toBe('slovenia');
        expect(n.N).toBe(33);
        const p = ok(setEpicycleParametrization(n, 'chord'));
        expect(p.outline).toBe('slovenia');
        expect(p.parametrization).toBe('chord');
        expect(matchEpicycleExample(p)).toBe('slovenia');
    });

    it('chooses an outline from a loop and back, keeping N and the parametrization', () => {
        const loop = {...ok(setEpicycleN(defaultEpicycleModel(), 12)), parametrization: 'chord' as const};
        const chosen = ok(chooseEpicycleExample(loop, 'blossom'));
        expect(chosen.outline).toBe('blossom');
        expect(chosen.N).toBe(12);
        expect(chosen.parametrization).toBe('chord');
        const back = ok(chooseEpicycleExample(chosen, 'diamond'));
        expect('outline' in back).toBe(false);
        expect(back.vertices.length).toBe(4);
        expect(back.N).toBe(12);
    });

    it('round-trips an outline model through JSON and takes the vertices from the shipped data', () => {
        for (const id of EPICYCLE_OUTLINE_IDS) {
            const m = {...outline(id), N: 17, parametrization: 'chord' as const};
            expect(parseEpicycleModel(JSON.parse(JSON.stringify(m)))).toEqual(m);
        }
        // Stored vertices (any, even none or too many) are ignored; N and the parametrization are kept.
        const stored = {outline: 'cat', N: 7, parametrization: 'chord', vertices: [{x: 99, y: 99}], spans: []};
        const parsed = parseEpicycleModel(stored);
        expect(parsed).toEqual({...outline('cat'), N: 7, parametrization: 'chord'});
        expect(parseEpicycleModel({outline: 'cat', N: 7, parametrization: 'chord'})).toEqual(parsed);
    });

    it('refuses an unknown outline id with the allowed list, and bad N or parametrization of an outline', () => {
        const allowed = [...EPICYCLE_OUTLINE_IDS];
        expect(issueOf({...clone(outline('cat')), outline: 'moon'})).toEqual({kind: 'outline', allowed});
        expect(issueOf({...clone(outline('cat')), outline: null})).toEqual({kind: 'outline', allowed});
        expect(issueOf({...clone(outline('cat')), outline: 3})).toEqual({kind: 'outline', allowed});
        expect(issueOf({...clone(defaultEpicycleModel()), outline: 'circle'})).toEqual({kind: 'outline', allowed});
        expect(issueOf({...clone(outline('cat')), N: 51})).toEqual({kind: 'n', min: 0, max: EPICYCLE_MAX_N});
        expect(issueOf({...clone(outline('cat')), parametrization: 'arc'})).toEqual({kind: 'parametrization', allowed: ['equal', 'chord']});
        expect(issueOf({outline: 'cat', parametrization: 'equal'})).toBeUndefined();
    });

    it('still validates a stored model without an outline as before (4 to 8 vertices)', () => {
        const tooMany = clone(outline('cat'));
        delete tooMany.outline;
        expect(issueOf(tooMany)).toEqual({kind: 'vertex-count', min: 4, max: 8});
        for (const id of ['circle', 'diamond', 'uneven'] as const) {
            expect(parseEpicycleModel(clone(epicycleExample(id)))).toEqual(epicycleExample(id));
        }
    });
});
