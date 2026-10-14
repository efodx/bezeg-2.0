import {splineGuidedLessons} from './splineGuidedLessons';
import {SUPPORTED_SCENE_ACTION_NAMES} from './guidedLessons';
import {sceneAction} from '../runtime/lessonCatalog';
import {GenericBezierSpline} from '../../bezeg/impl/curve/GenericBezierSpline';
import {C1QuadraticBezierSpline} from '../../bezeg/impl/curve/C1QuadraticBezierSpline';
import {C2CubicBezierSpline} from '../../bezeg/impl/curve/C2CubicBezierSpline';
import {G1QuadraticBezierSpline} from '../../bezeg/impl/curve/G1QuadraticBezierSpline';
import {G1SymmetricQuadraticBezierSpline} from '../../bezeg/impl/curve/G1SymmetricQuadraticBezierSpline';
import {BezierSpline} from '../../bezeg/impl/curve/bezier-spline';
import {PointImpl} from '../../bezeg/impl/point/point-impl';
import CnSplineGraph from '../../graphs/curves/spline/CnSplineGraph';
import C1SplineGraph from '../../graphs/curves/spline/C1SplineGraph';
import C2SplineGraph from '../../graphs/curves/spline/C2SplineGraph';
import G1SplineGraph from '../../graphs/curves/spline/G1SplineGraph';
import G1SymmetricSplineGraph from '../../graphs/curves/spline/G1SymmetricSplineGraph';
import SplineAlphaParametrizationGraph from '../../graphs/curves/parametrisations/SplineAlphaParametrizationGraph';

const lessonFor = (id: string) => splineGuidedLessons.find(lesson => lesson.demonstrationId === id)!;
const stepActions = (id: string) => lessonFor(id).steps.map(step => step.scene!.actions);

/** Route defaults, read from the shipped graph presets. The importer reads only the first two numbers of a point. */
const defaultPoints = (Cls: any): number[][] =>
    Object.create(Cls.prototype).defaultPreset()[0][1].points.map((point: number[]) => [point[0], point[1]]);
const CN = defaultPoints(CnSplineGraph);
const C1 = defaultPoints(C1SplineGraph);
const C2 = defaultPoints(C2SplineGraph);
const G1 = defaultPoints(G1SplineGraph);
const G1S = defaultPoints(G1SymmetricSplineGraph);
const PARAM = defaultPoints(SplineAlphaParametrizationGraph);

const model = (points: number[][]) => points.map(([x, y]) => new PointImpl(x, y));
const cn = (degree: number, continuity: number, points = CN) => new GenericBezierSpline(model(points), degree, continuity);
const c1 = (points = C1) => new C1QuadraticBezierSpline(model(points));
const c2 = (points = C2) => new C2CubicBezierSpline(model(points));
const g1 = (points = G1) => new G1QuadraticBezierSpline(model(points));
const g1s = (points = G1S) => new G1SymmetricQuadraticBezierSpline(model(points));
const param = () => new C2CubicBezierSpline(model(PARAM));

const pieces = (spline: BezierSpline): number[][][] => spline.getUnderlyingCurves().map(curve => curve.getPoints().map(p => [p.X(), p.Y()]));
const derived = (spline: BezierSpline): number[][] => spline.getNonFreePoints().map(p => [p.X(), p.Y()]);
const spansOf = (spline: BezierSpline): number[] => {
    const u: number[] = (spline as any).getU();
    return u.slice(1).map((value, i) => value - u[i]);
};
const close = (actual: number[], expected: number[], digits = 9) => {
    expect(actual).toHaveLength(expected.length);
    expected.forEach((value, i) => expect(actual[i]).toBeCloseTo(value, digits));
};
const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1]];
const norm = (v: number[]) => Math.hypot(v[0], v[1]);
const cross = (a: number[], b: number[]) => a[0] * b[1] - a[1] * b[0];

const binom = (n: number, k: number): number => k === 0 ? 1 : binom(n, k - 1) * (n - k + 1) / k;
const fall = (n: number, k: number) => { let r = 1; for (let i = 0; i < k; i++) r *= n - i; return r; };

/** k-th derivative with respect to the global parameter at the start or end of a piece. */
function derivative(points: number[][], k: number, span: number, atEnd: boolean): number[] {
    const n = points.length - 1;
    const first = atEnd ? n - k : 0;
    const result = [0, 0];
    for (let j = 0; j <= k; j++) {
        const sign = (k - j) % 2 === 0 ? 1 : -1;
        for (let d = 0; d < 2; d++) result[d] += sign * binom(k, j) * points[first + j][d];
    }
    return result.map(v => v * fall(n, k) / span ** k);
}
const junctionGap = (spline: BezierSpline, junction: number, k: number) => {
    const all = pieces(spline), s = spansOf(spline);
    const left = derivative(all[junction], k, s[junction], true);
    const right = derivative(all[junction + 1], k, s[junction + 1], false);
    return norm(sub(left, right));
};
const junctionCount = (spline: BezierSpline) => pieces(spline).length - 1;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** Which pieces change when point i is moved. */
const changedPieces = (make: (points: number[][]) => BezierSpline, base: number[][], index: number) => {
    const before = pieces(make(base));
    const moved = base.map(p => [...p]);
    moved[index] = [moved[index][0] + 0.5, moved[index][1] - 0.4];
    return pieces(make(moved)).map((piece, i) => !same(piece, before[i]));
};


// ---------------------------------------------------------------------------------------------
// structure
// ---------------------------------------------------------------------------------------------

const expectedSteps: Record<string, number> = {
    'spline-cn': 4,
    'spline-c1': 5,
    'spline-c2': 4,
    'spline-g1': 5,
    'spline-g1-symmetric': 5,
    'spline-parameterization': 5,
};

test('keeps the spline lessons bounded, localized, and source-backed', () => {
    expect(splineGuidedLessons.map(lesson => lesson.demonstrationId)).toEqual(Object.keys(expectedSteps));
    for (const lesson of splineGuidedLessons) {
        expect(lesson.steps).toHaveLength(expectedSteps[lesson.demonstrationId]);
        expect(lesson.steps.length).toBeGreaterThanOrEqual(4);
        expect(lesson.steps.length).toBeLessThanOrEqual(6);
        expect(lesson.steps.map(step => step.order)).toEqual(lesson.steps.map((_, index) => index + 1));
        expect(new Set(lesson.steps.map(step => step.id)).size).toBe(lesson.steps.length);
        expect(new Set(lesson.steps.flatMap(step => step.frames.map(frame => frame.id))).size)
            .toBe(lesson.steps.reduce((sum, step) => sum + step.frames.length, 0));
        expect(lesson.sources.length).toBeGreaterThanOrEqual(2);
        expect(lesson.sources.some(source => source.citation.includes('Štampar'))).toBe(true);
        expect(lesson.sources.some(source => source.citation.startsWith('Farin'))).toBe(true);
        expect(lesson.sources.some(source => source.citation.startsWith('Bezeg source:'))).toBe(true);
        expect(lesson.sources.some(source => Boolean(source.implementationCorrespondence))).toBe(true);
        expect(new Set(lesson.sources.map(source => source.id)).size).toBe(lesson.sources.length);
        expect(lesson.workedExamples.length).toBeGreaterThan(0);
        const localizedFields = [
            lesson.title, lesson.summary, ...lesson.prerequisites, ...lesson.learningGoals, ...lesson.edgeCases, ...lesson.unresolvedQuestions,
            ...lesson.formulaBlocks.flatMap(formula => [formula.notation, formula.explanation]),
            ...lesson.workedExamples.flatMap(example => [example.title, example.check]),
            ...lesson.steps.flatMap(step => [step.title, step.purpose, step.explanation, step.observationPrompt, ...step.expectedObservations, ...(step.scene ? [step.scene.expectedState] : [])]),
        ];
        for (const localized of localizedFields) {
            expect(localized.sl.trim()).not.toBe('');
            expect(localized.en.trim()).not.toBe('');
            expect(localized.sl).not.toBe(localized.en);
        }
        const formulaIds = new Set(lesson.formulaBlocks.map(formula => formula.id));
        const exampleIds = new Set(lesson.workedExamples.map(example => example.id));
        expect(formulaIds.size).toBe(lesson.formulaBlocks.length);
        const usedExamples = new Set<string>();
        const usedFormulas = new Set<string>();
        for (const step of lesson.steps) {
            expect(step.frames[0].kind).toBe('explanation');
            expect(step.frames.at(-1)?.kind).toBe('observation');
            expect(step.frames.filter(frame => frame.kind === 'calculation')).toHaveLength(step.workedExampleId ? 1 : 0);
            step.formulaIds.forEach(id => { expect(formulaIds.has(id)).toBe(true); usedFormulas.add(id); });
            if (step.workedExampleId) {
                expect(exampleIds.has(step.workedExampleId)).toBe(true);
                usedExamples.add(step.workedExampleId);
            }
            expect(step.scene?.basedOn).toBe('demonstration-default');
            expect(step.scene?.actions.length).toBeGreaterThan(0);
            for (const action of step.scene?.actions ?? []) {
                expect(SUPPORTED_SCENE_ACTION_NAMES).toContain(action.name);
                expect(() => sceneAction(action)).not.toThrow();
            }
        }
        expect(usedExamples).toEqual(exampleIds);
        expect(usedFormulas).toEqual(formulaIds);
    }
});

test('each lesson only uses the action families of its own graph', () => {
    const names = (id: string) => new Set(lessonFor(id).steps.flatMap(step => step.scene?.actions ?? []).map(action => action.name));
    expect(names('spline-cn')).toEqual(new Set(['show-spline-labels', 'show-control-polygon', 'set-spline-degree', 'set-spline-continuity']));
    expect(names('spline-c1')).toEqual(new Set(['show-spline-labels', 'show-control-polygon']));
    expect(names('spline-c2')).toEqual(new Set(['show-spline-labels', 'show-control-polygon']));
    expect(names('spline-g1')).toEqual(new Set(['show-spline-labels', 'show-control-polygon', 'set-spline-beta']));
    expect(names('spline-g1-symmetric')).toEqual(new Set(['show-spline-labels', 'show-control-polygon', 'set-spline-beta']));
    expect(names('spline-parameterization')).toEqual(new Set(['set-parameterization-alpha', 'set-parameterization-samples', 'hide-spline-fixed-points']));
});

test('scene actions respect the graph bounds when applied in order', () => {
    // spline-cn: degree and continuity are validated against the current state, one action at a time.
    for (const actions of stepActions('spline-cn')) {
        let degree = 2, continuity = 1;
        const points = CN.length;
        for (const action of actions) {
            if (action.name === 'set-spline-continuity') {
                expect(action.value as number).toBeGreaterThanOrEqual(0);
                expect(action.value as number).toBeLessThanOrEqual(degree - 1);
                continuity = action.value as number;
            } else if (action.name === 'set-spline-degree') {
                expect(action.value as number).toBeGreaterThanOrEqual(continuity + 1);
                expect(action.value as number).toBeLessThanOrEqual(points);
                degree = action.value as number;
            }
        }
        // Only pairs that fill every piece are used (see the limitation test below).
        expect([[2, 1], [3, 2]]).toContainEqual([degree, continuity]);
    }
    expect(stepActions('spline-cn')[2]).toEqual([{name: 'set-spline-degree', value: 3}, {name: 'set-spline-continuity', value: 2}, {name: 'show-spline-labels', value: true}]);
    // spline-g1 / spline-g1-symmetric: the junction index exists and the value is inside the slider range.
    const betaChecks: [string, number, number, number][] = [['spline-g1', g1().getNumOfBs(), 0.01, 3], ['spline-g1-symmetric', g1s().getNumOfBs(), 0.01, 0.99]];
    for (const [id, count, min, max] of betaChecks) {
        for (const action of lessonFor(id).steps.flatMap(step => step.scene!.actions).filter(a => a.name === 'set-spline-beta')) {
            const {index, value} = action.value as {index: number; value: number};
            expect(index).toBeGreaterThanOrEqual(0);
            expect(index).toBeLessThan(count);
            expect(value).toBeGreaterThanOrEqual(min);
            expect(value).toBeLessThanOrEqual(max);
        }
    }
    expect(g1().getNumOfBs()).toBe(2);
    expect(g1s().getNumOfBs()).toBe(3);
});

// ---------------------------------------------------------------------------------------------
// bare-math check (same rules as lessonMathNotation.test.ts)
// ---------------------------------------------------------------------------------------------

const TEX_FIELDS = new Set(['latex', 'calculationLatex', 'resultLatex']);

function collectLocalized(value: unknown, path: string, out: {path: string; lang: string; text: string}[]): void {
    if (Array.isArray(value)) {
        value.forEach((item, index) => collectLocalized(item, `${path}[${index}]`, out));
    } else if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        if (typeof record.sl === 'string' && typeof record.en === 'string') {
            out.push({path, lang: 'sl', text: record.sl}, {path, lang: 'en', text: record.en});
            return;
        }
        for (const [key, child] of Object.entries(record)) {
            if (key === 'sources') continue;
            collectLocalized(child, path ? `${path}.${key}` : key, out);
        }
    }
}

function collectTex(value: unknown, path: string, out: {path: string; text: string}[]): void {
    if (Array.isArray(value)) {
        value.forEach((item, index) => collectTex(item, `${path}[${index}]`, out));
    } else if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
            if (key === 'sources') continue;
            if (TEX_FIELDS.has(key) && typeof child === 'string') out.push({path: `${path}.${key}`, text: child});
            else collectTex(child, path ? `${path}.${key}` : key, out);
        }
    }
}

function stripMath(input: string): {outside: string} | {error: string} {
    let outside = '';
    let index = 0;
    while (index < input.length) {
        const pair = input.slice(index, index + 2);
        if (pair === '\\(' || pair === '\\[') {
            const close = pair === '\\(' ? '\\)' : '\\]';
            const end = input.indexOf(close, index + 2);
            if (end < 0) return {error: `unclosed ${pair}`};
            if (/\\[([]/.test(input.slice(index + 2, end))) return {error: 'nested math delimiters'};
            index = end + 2;
            outside += ' ';
        } else if (pair === '\\)' || pair === '\\]') {
            return {error: `unmatched ${pair}`};
        } else {
            outside += input[index];
            index += 1;
        }
    }
    return {outside};
}

const BARE_SCRIPT = /[A-Za-z0-9)\]}][_^]|[_^][A-Za-z0-9({\\-]/;
const BARE_COMMAND = /\\[A-Za-z]+/;
const BARE_MATH_HEURISTICS: readonly (readonly [string, RegExp])[] = [
    ['assignment like t=1/2', /\b[A-Za-z][A-Za-z0-9]*\s*=\s*[-\d(]/],
    ['numeric fraction', /\d\/\d/],
    ['Unicode subscript', /[₀-₉]/],
    ['function of a number', /\b[A-Za-z]\(-?\d[\d./]*\)/],
    ['numeric tuple', /\(-?\d+(?:[.,]\d+)?\s*[,;]\s*-?\d/],
    ['sum like n+1', /\b[a-z]\s?\+\s?\d/],
    ['interval', /\[-?\d+\s?,\s?-?\d+\]/],
    ['1-t', /\b1-[a-z]\b/],
];

test('lesson prose wraps math in MathJax delimiters and latex fields stay bare', () => {
    const result: string[] = [];
    for (const lesson of splineGuidedLessons) {
        const where = lesson.demonstrationId;
        const localized: {path: string; lang: string; text: string}[] = [];
        collectLocalized(lesson, '', localized);
        for (const {path, lang, text} of localized) {
            const stripped = stripMath(text);
            const mathSegments = [...text.matchAll(/\\\((.*?)\\\)|\\\[(.*?)\\\]/g)].map(match => match[1] ?? match[2] ?? '');
            if (lang === 'sl' && mathSegments.some(segment => /\d\.\d/.test(segment))) result.push(`${where} ${path} [sl] decimal point inside math (use {,}): ${text}`);
            if (lang === 'en' && mathSegments.some(segment => /\d\{,\}\d/.test(segment))) result.push(`${where} ${path} [en] decimal comma inside math (use a point): ${text}`);
            if ('error' in stripped) {
                result.push(`${where} ${path} [${lang}] ${stripped.error}: ${text}`);
            } else if (BARE_SCRIPT.test(stripped.outside) || BARE_COMMAND.test(stripped.outside)) {
                result.push(`${where} ${path} [${lang}] bare TeX outside \\( \\): ${text}`);
            } else {
                const heuristic = BARE_MATH_HEURISTICS.find(([, pattern]) => pattern.test(stripped.outside));
                if (heuristic) result.push(`${where} ${path} [${lang}] bare math outside \\( \\) (${heuristic[0]}): ${text}`);
            }
        }
        const tex: {path: string; text: string}[] = [];
        collectTex(lesson, '', tex);
        for (const {path, text} of tex) {
            if (/\\[()[\]]/.test(text)) result.push(`${where} ${path} contains math delimiters (added by lessonCatalog): ${text}`);
        }
    }
    if (result.length) throw new Error(`${result.length} notation problem(s):\n${result.join('\n')}`);
});

// ---------------------------------------------------------------------------------------------
// spline-cn
// ---------------------------------------------------------------------------------------------

describe('spline-cn numbers', () => {
    test('default route points and piece counts', () => {
        expect(CN[3]).toEqual([-1.5, -2]);
        expect(CN).toHaveLength(7);
        const spline = cn(2, 1);
        expect(pieces(spline)).toHaveLength(5);
        expect(derived(spline)).toHaveLength(4);
        expect(spansOf(spline).every(span => Math.abs(span - 0.2) < 1e-12)).toBe(true);
    });

    test('worked example: the first derived point is 2 p_2 - p_1 and p_2 is the midpoint of p_1 q_1', () => {
        const spline = cn(2, 1);
        const all = pieces(spline);
        close(all[0][1], [-4, 0.5]);
        close(all[0][2], [-3.5, -1]);
        close(all[1][1], [-3, -2.5]);
        close(all[1][1], [2 * all[0][2][0] - all[0][1][0], 2 * all[0][2][1] - all[0][1][1]]);
        close(sub(all[1][1], all[1][0]), [0.5, -1.5]);
        close(sub(all[0][2], all[0][1]), [0.5, -1.5]);
        close([(all[0][1][0] + all[1][1][0]) / 2, (all[0][1][1] + all[1][1][1]) / 2], all[0][2]);
        const example = lessonFor('spline-cn').workedExamples[0];
        expect(example.resultLatex).toContain('q_1=\\bigl(-3,-\\tfrac52\\bigr)');
        expect(example.calculationLatex).toContain('p_1=\\bigl(-4,\\tfrac12\\bigr)');
        expect(example.calculationLatex).toContain('p_2=\\bigl(-\\tfrac72,-1\\bigr)');
    });

    test('(2,1) is C1 at every junction', () => {
        const spline = cn(2, 1);
        for (let j = 0; j < junctionCount(spline); j++) expect(junctionGap(spline, j, 1)).toBeLessThan(1e-9);
        expect(Math.max(...Array.from({length: junctionCount(spline)}, (_, j) => junctionGap(spline, j, 2)))).toBeGreaterThan(1e-3);
    });

    test('(3,2): four pieces, six derived points, equal first and second differences, far-away derived points', () => {
        const spline = cn(3, 2);
        const all = pieces(spline);
        expect(all).toHaveLength(4);
        expect(derived(spline)).toHaveLength(6);
        all.forEach(piece => expect(piece).toHaveLength(4));
        const [p0, p1, p2, p3] = all[0];
        close(p0, [-3, 2]); close(p1, [-4, 0.5]); close(p2, [-3.5, -1]); close(p3, [-1.5, -2]);
        const [q0, q1, q2] = all[1];
        close(q0, [-1.5, -2]); close(q1, [0.5, -3]); close(q2, [4, -3.5]);
        const first = sub(p3, p2), firstQ = sub(q1, q0);
        close(first, [2, -1]); close(firstQ, [2, -1]);
        const second = [p3[0] - 2 * p2[0] + p1[0], p3[1] - 2 * p2[1] + p1[1]];
        const secondQ = [q2[0] - 2 * q1[0] + q0[0], q2[1] - 2 * q1[1] + q0[1]];
        close(second, [1.5, 0.5]); close(secondQ, [1.5, 0.5]);
        for (let j = 0; j < junctionCount(spline); j++) {
            expect(junctionGap(spline, j, 1)).toBeLessThan(1e-8);
            expect(junctionGap(spline, j, 2)).toBeLessThan(1e-8);
        }
        const farthest = Math.max(...derived(spline).map(p => norm(p)));
        expect(farthest).toBeCloseTo(Math.hypot(61, 34.5), 9);
        expect(Math.abs(farthest - 70)).toBeLessThan(1);
        const example = lessonFor('spline-cn').workedExamples[1];
        expect(example.resultLatex).toBe('\\Delta^2p_1=\\Delta^2q_0=\\bigl(\\tfrac32,\\tfrac12\\bigr)');
    });

    test('(4,3) derived points are over 150 units from the origin and (3,1) leaves a short last piece', () => {
        const spline = cn(4, 3);
        expect(pieces(spline)).toHaveLength(3);
        expect(Math.max(...derived(spline).map(p => norm(p)))).toBeGreaterThan(150);
        const short = pieces(cn(3, 1));
        expect(short[short.length - 1]).toHaveLength(3);
    });

    test('changing a free point changes its piece and every later one only', () => {
        expect(changedPieces(cn22, CN, 3)).toEqual([false, true, true, true, true]);
        expect(changedPieces(cn22, CN, 1)).toEqual([true, true, true, true, true]);
    });
});
function cn22(points: number[][]) { return cn(2, 1, points); }

// ---------------------------------------------------------------------------------------------
// spline-c1
// ---------------------------------------------------------------------------------------------

describe('spline-c1 numbers', () => {
    test('six free points, four pieces of span 1/4, three derived midpoints', () => {
        const spline = c1();
        expect(C1).toHaveLength(6);
        expect(pieces(spline)).toHaveLength(4);
        spansOf(spline).forEach(span => expect(span).toBeCloseTo(0.25, 12));
        const joints = derived(spline);
        expect(joints).toHaveLength(3);
        close(joints[0], [-2.5, -3]); close(joints[1], [-1, 0]); close(joints[2], [1, 3]);
        joints.forEach((joint, i) => close(joint, [(C1[i + 1][0] + C1[i + 2][0]) / 2, (C1[i + 1][1] + C1[i + 2][1]) / 2], 12));
        const example = lessonFor('spline-c1').workedExamples[0];
        expect(example.resultLatex).toContain('J_1=\\bigl(-\\tfrac52,-3\\bigr)');
        expect(example.resultLatex).toContain('\\bigl(\\tfrac32,0\\bigr)');
    });

    test('J_l - p_l and p_{l+1} - J_l are equal and C1 holds at every junction', () => {
        const spline = c1();
        const joints = derived(spline);
        joints.forEach((joint, i) => {
            const a = sub(joint, C1[i + 1]), b = sub(C1[i + 2], joint);
            close(a, b);
        });
        close(sub(joints[0], C1[1]), [1.5, 0]);
        for (let j = 0; j < junctionCount(spline); j++) expect(junctionGap(spline, j, 1)).toBeLessThan(1e-9);
    });

    test('the second differences differ at all three junctions (example values)', () => {
        const spline = c1();
        const all = pieces(spline);
        const second = (piece: number[][]) => [piece[0][0] - 2 * piece[1][0] + piece[2][0], piece[0][1] - 2 * piece[1][1] + piece[2][1]];
        close(second(all[0]), [1.5, 6]);
        close(second(all[1]), [-1.5, 3]);
        for (let j = 0; j < 3; j++) expect(junctionGap(spline, j, 2)).toBeGreaterThan(1e-3);
        const example = lessonFor('spline-c1').workedExamples[1];
        expect(example.resultLatex).toBe('\\bigl(\\tfrac32,6\\bigr)\\ne\\bigl(-\\tfrac32,3\\bigr)');
    });

    test('locality of every free point', () => {
        expect(changedPieces(c1, C1, 0)).toEqual([true, false, false, false]);
        expect(changedPieces(c1, C1, 2)).toEqual([true, true, true, false]);
        expect(changedPieces(c1, C1, 5)).toEqual([false, false, false, true]);
    });
});

// ---------------------------------------------------------------------------------------------
// spline-c2
// ---------------------------------------------------------------------------------------------

describe('spline-c2 numbers', () => {
    test('seven free points, four cubic pieces, nine derived points', () => {
        const spline = c2();
        expect(C2[3]).toEqual([1, -2]);
        expect(C2).toHaveLength(7);
        expect(pieces(spline)).toHaveLength(4);
        pieces(spline).forEach(piece => expect(piece).toHaveLength(4));
        expect(derived(spline)).toHaveLength(9);
        spansOf(spline).forEach(span => expect(span).toBeCloseTo(0.25, 12));
    });

    test('worked examples: thirds of p_2 p_3, the end-piece midpoints and the first joint', () => {
        const all = pieces(c2());
        close(all[1][1], [-38 / 15, -8 / 3]);
        close(all[1][2], [-23 / 30, -7 / 3]);
        close(all[1][1], [2 / 3 * C2[2][0] + 1 / 3 * C2[3][0], 2 / 3 * C2[2][1] + 1 / 3 * C2[3][1]]);
        close(all[1][2], [1 / 3 * C2[2][0] + 2 / 3 * C2[3][0], 1 / 3 * C2[2][1] + 2 / 3 * C2[3][1]]);
        close(all[0][2], [-9 / 2, -53 / 40]);
        close(all[0][2], [(C2[1][0] + C2[2][0]) / 2, (C2[1][1] + C2[2][1]) / 2]);
        close(all[3][1], [(C2[4][0] + C2[5][0]) / 2, (C2[4][1] + C2[5][1]) / 2]);
        close(all[1][0], [-211 / 60, -479 / 240]);
        expect(all[1][0][0]).toBeCloseTo(-3.517, 3);
        expect(all[1][0][1]).toBeCloseTo(-1.996, 3);
        const examples = lessonFor('spline-c2').workedExamples;
        expect(examples[0].resultLatex).toBe('c_1=\\bigl(-\\tfrac{38}{15},-\\tfrac83\\bigr),\\qquad c_2=\\bigl(-\\tfrac{23}{30},-\\tfrac73\\bigr)');
        expect(examples[1].resultLatex).toContain('J_1=\\bigl(-\\tfrac{211}{60},-\\tfrac{479}{240}\\bigr)');
    });

    test('every junction is the midpoint of the neighbouring inner points; C1 and C2 hold, C3 does not', () => {
        const spline = c2();
        const all = pieces(spline);
        for (let j = 0; j < junctionCount(spline); j++) {
            const junction = all[j][3];
            close(junction, all[j + 1][0], 12);
            close(junction, [(all[j][2][0] + all[j + 1][1][0]) / 2, (all[j][2][1] + all[j + 1][1][1]) / 2], 12);
            expect(junctionGap(spline, j, 1)).toBeLessThan(1e-9);
            expect(junctionGap(spline, j, 2)).toBeLessThan(1e-9);
            expect(junctionGap(spline, j, 3)).toBeGreaterThan(1e-3);
        }
        // Second difference at the first joint, as quoted in the example check.
        const left = all[0], right = all[1];
        const secondLeft = [left[1][0] - 2 * left[2][0] + left[3][0], left[1][1] - 2 * left[2][1] + left[3][1]];
        const secondRight = [right[0][0] - 2 * right[1][0] + right[2][0], right[0][1] - 2 * right[1][1] + right[2][1]];
        close(secondLeft, secondRight, 12);
        expect(secondLeft[0]).toBeCloseTo(0.783, 3);
        expect(secondLeft[1]).toBeCloseTo(1.004, 3);
    });

    test('locality of every free point', () => {
        expect(changedPieces(c2, C2, 0)).toEqual([true, false, false, false]);
        expect(changedPieces(c2, C2, 1)).toEqual([true, true, false, false]);
        expect(changedPieces(c2, C2, 2)).toEqual([true, true, true, false]);
        expect(changedPieces(c2, C2, 3)).toEqual([true, true, true, true]);
        expect(changedPieces(c2, C2, 4)).toEqual([false, true, true, true]);
        expect(changedPieces(c2, C2, 6)).toEqual([false, false, false, true]);
    });
});

// ---------------------------------------------------------------------------------------------
// spline-g1
// ---------------------------------------------------------------------------------------------

describe('spline-g1 numbers', () => {
    test('five points, three pieces, b starts at 1 and the b = 1 derived point mirrors p_1', () => {
        const spline = g1();
        expect(G1).toHaveLength(5);
        expect(pieces(spline)).toHaveLength(3);
        expect(spline.getBs()).toEqual([1, 1]);
        close(pieces(spline)[1][1], [-1, -3.5]);
        close(pieces(spline)[1][1], [2 * G1[2][0] - G1[1][0], 2 * G1[2][1] - G1[1][1]]);
    });

    test.each([[0.25, [-17 / 8, -11 / 4]], [1, [-1, -7 / 2]], [2.5, [5 / 4, -5]]])('b = %p: second point of the second piece, collinear with p_1 p_2, derivative ratio b', (b, expected) => {
        const spline = g1();
        spline.setB(0, b);
        const all = pieces(spline);
        close(all[1][1], expected as number[]);
        close(all[1][1], [G1[2][0] + b * (G1[2][0] - G1[1][0]), G1[2][1] + b * (G1[2][1] - G1[1][1])]);
        expect(cross(sub(all[1][1], G1[2]), sub(G1[2], G1[1]))).toBeCloseTo(0, 12);
        spansOf(spline).forEach(span => expect(span).toBeCloseTo(1 / 3, 12));
        const incoming = sub(all[0][2], all[0][1]), outgoing = sub(all[1][1], all[1][0]);
        expect(norm(outgoing) / norm(incoming)).toBeCloseTo(b, 12);
        expect(cross(incoming, outgoing)).toBeCloseTo(0, 12);
        // C1 only at b = 1.
        expect(junctionGap(spline, 0, 1) < 1e-9).toBe(b === 1);
        const example = lessonFor('spline-g1').workedExamples[0];
        expect(example.resultLatex).toContain('\\bigl(-\\tfrac{17}{8},-\\tfrac{11}{4}\\bigr)');
        expect(example.resultLatex).toContain('\\bigl(-1,-\\tfrac72\\bigr)');
        expect(example.resultLatex).toContain('\\bigl(\\tfrac54,-5\\bigr)');
    });

    test('changing the first b moves the third piece while the second joint stays C1 with ratio b_2 = 1', () => {
        const base = pieces(g1());
        const spline = g1();
        spline.setB(0, 0.25);
        const all = pieces(spline);
        expect(same(all[0], base[0])).toBe(true);
        expect(same(all[1], base[1])).toBe(false);
        expect(same(all[2], base[2])).toBe(false);
        close(base[2][1], [1, 1.5]);
        close(all[2][1], [2.125, 0.75]);
        const incoming = sub(all[1][2], all[1][1]), outgoing = sub(all[2][1], all[2][0]);
        expect(norm(outgoing) / norm(incoming)).toBeCloseTo(1, 12);
        expect(junctionGap(spline, 1, 1)).toBeLessThan(1e-9);
        expect(junctionGap(spline, 0, 1)).toBeGreaterThan(1e-3);
    });
});

// ---------------------------------------------------------------------------------------------
// spline-g1-symmetric
// ---------------------------------------------------------------------------------------------

describe('spline-g1-symmetric numbers', () => {
    test('default equals the symmetric C1 spline and every beta starts at 1/2', () => {
        const spline = g1s();
        expect(G1S).toEqual(C1);
        expect(spline.getBs()).toEqual([0.5, 0.5, 0.5]);
        expect(pieces(spline)).toEqual(pieces(c1()));
        spansOf(spline).forEach(span => expect(span).toBeCloseTo(0.25, 12));
    });

    test.each([[0.25, [-13 / 4, -3], 3], [0.75, [-7 / 4, -3], 1 / 3], [0.99, [-1.03, -3], 1 / 99]])('beta_1 = %p: junction, tangent continuity and derivative ratio (1-beta)/beta', (beta, expected, ratio) => {
        const spline = g1s();
        spline.setB(0, beta);
        const all = pieces(spline);
        close(all[0][2], expected as number[]);
        close(all[1][0], expected as number[]);
        close(all[0][2], [(1 - beta) * G1S[1][0] + beta * G1S[2][0], (1 - beta) * G1S[1][1] + beta * G1S[2][1]], 12);
        const incoming = sub(all[0][2], all[0][1]), outgoing = sub(all[1][1], all[1][0]);
        expect(cross(incoming, outgoing)).toBeCloseTo(0, 12);
        expect(incoming[0] * outgoing[0] + incoming[1] * outgoing[1]).toBeGreaterThan(0);
        expect(norm(outgoing) / norm(incoming)).toBeCloseTo(ratio as number, 12);
        expect((1 - beta) / beta).toBeCloseTo(ratio as number, 12);
        expect(junctionGap(spline, 0, 1) < 1e-9).toBe(false);
    });

    test('worked examples', () => {
        const [first, second] = lessonFor('spline-g1-symmetric').workedExamples;
        expect(first.resultLatex).toContain('J_1=\\bigl(-\\tfrac{13}{4},-3\\bigr)');
        expect(first.resultLatex).toContain('J_1-p_1=\\bigl(\\tfrac34,0\\bigr)');
        const spline = g1s();
        spline.setB(0, 0.25);
        close(sub(pieces(spline)[0][2], G1S[1]), [0.75, 0]);
        spline.setB(0, 0.75);
        const all = pieces(spline);
        close(sub(all[0][2], G1S[1]), [9 / 4, 0]);
        close(sub(G1S[2], all[0][2]), [3 / 4, 0]);
        expect(second.calculationLatex).toContain('\\bigl(\\tfrac94,0\\bigr)');
        expect(second.resultLatex).toContain('\\tfrac13');
    });

    test('moving the second junction changes only the second and third pieces', () => {
        const base = pieces(g1s());
        const spline = g1s();
        spline.setB(1, 0.75);
        const all = pieces(spline);
        expect(all.map((piece, i) => !same(piece, base[i]))).toEqual([false, true, true, false]);
        close(all[1][2], [-1, 1.5]);
        const first = g1s();
        first.setB(0, 0.25);
        expect(pieces(first).map((piece, i) => !same(piece, base[i]))).toEqual([true, true, false, false]);
    });
});

// ---------------------------------------------------------------------------------------------
// spline-parameterization
// ---------------------------------------------------------------------------------------------

describe('spline-parameterization numbers', () => {
    const chord = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const chords = () => [chord(PARAM[0], PARAM[2]), chord(PARAM[2], PARAM[3]), chord(PARAM[3], PARAM[4]), chord(PARAM[4], PARAM[5]), chord(PARAM[5], PARAM[6]), chord(PARAM[6], PARAM[8])];
    const gaps = (spline: C2CubicBezierSpline, count: number) => {
        const samples = Array.from({length: count}, (_, i) => {
            const p = spline.eval((i + 1) / (count + 1));
            return [p.X(), p.Y()];
        });
        const lengths = samples.slice(1).map((p, i) => chord(p, samples[i]));
        return Math.max(...lengths) / Math.min(...lengths);
    };
    const samplesPerPiece = (spline: C2CubicBezierSpline, count: number) => {
        const u: number[] = (spline as any).getU();
        const result = new Array(u.length - 1).fill(0);
        for (let i = 1; i <= count; i++) {
            const t = i / (count + 1);
            let k = 0;
            while (k < result.length - 1 && t >= u[k + 1]) k++;
            result[k]++;
        }
        return result;
    };

    test('default has nine points and six pieces; chords and spans', () => {
        expect(PARAM).toHaveLength(9);
        const spline = param();
        expect(pieces(spline)).toHaveLength(6);
        const lengths = chords();
        expect(lengths[4]).toBeCloseTo(Math.sqrt(5 / 2), 12);
        expect(lengths[5]).toBeCloseTo(Math.sqrt(261 / 4), 12);
        expect(lengths.indexOf(Math.min(...lengths))).toBe(4);
        expect(lengths.indexOf(Math.max(...lengths))).toBe(5);
        const total = lengths.reduce((a, b) => a + b, 0);
        expect(total).toBeCloseTo(19.380, 3);
        spline.setAlpha(0);
        spansOf(spline).forEach(span => expect(span).toBeCloseTo(1 / 6, 12));
        spline.setAlpha(1);
        spansOf(spline).forEach((span, i) => expect(span).toBeCloseTo(lengths[i] / total, 12));
        expect(spansOf(spline)[4]).toBeCloseTo(0.082, 3);
        expect(spansOf(spline)[5]).toBeCloseTo(0.417, 3);
        const example = lessonFor('spline-parameterization').workedExamples[0];
        expect(example.calculationLatex).toContain('\\approx19.380');
        expect(example.resultLatex).toContain('\\approx0.082');
        expect(example.resultLatex).toContain('\\approx0.417');
    });

    test('first joint for alpha = 0, 1/2, 1 and the distance it moves', () => {
        const spline = param();
        const joints = [0, 0.5, 1].map(alpha => {
            spline.setAlpha(alpha);
            const end = pieces(spline)[0][3];
            return end;
        });
        close(joints[0], [-1.825, -0.5333333333], 4);
        close(joints[1], [-2.2733008634, -0.6911739666], 8);
        close(joints[2], [-2.703213085, -0.8099951479], 8);
        expect(joints[0][0]).toBeCloseTo(-1.825, 3); expect(joints[0][1]).toBeCloseTo(-0.533, 3);
        expect(joints[1][0]).toBeCloseTo(-2.273, 3); expect(joints[1][1]).toBeCloseTo(-0.691, 3);
        expect(joints[2][0]).toBeCloseTo(-2.703, 3); expect(joints[2][1]).toBeCloseTo(-0.810, 3);
        expect(norm(sub(joints[2], joints[0]))).toBeCloseTo(0.92, 2);
        expect(lessonFor('spline-parameterization').workedExamples[1].resultLatex).toBe('\\lVert J_1(1)-J_1(0)\\rVert\\approx0.92');
        // The free points stay and the junctions are shared by neighbouring pieces for every alpha.
        spline.setAlpha(0.5);
        expect(spline.getPoints().map(p => [p.X(), p.Y()])).toEqual(PARAM);
    });

    test('sample distribution: pieces per alpha and the largest-to-smallest gap ratio', () => {
        const spline = param();
        const result: Record<number, {perPiece: number[]; ratio25: number; ratio10: number}> = {};
        for (const alpha of [0, 0.5, 1]) {
            spline.setAlpha(alpha);
            result[alpha] = {perPiece: samplesPerPiece(spline, 25), ratio25: gaps(spline, 25), ratio10: gaps(spline, 10)};
        }
        expect(result[0].perPiece).toEqual([4, 4, 4, 5, 4, 4]);
        expect(result[1].perPiece).toEqual([2, 5, 3, 3, 2, 10]);
        expect(result[1].perPiece.reduce((a, b) => a + b, 0)).toBe(25);
        expect(result[0.5].perPiece).toEqual([3, 5, 4, 3, 3, 7]);
        expect(result[0.5].ratio25).toBeCloseTo(3.51, 1);
        expect(result[0].ratio25).toBeCloseTo(5.7, 1);
        expect(result[1].ratio25).toBeCloseTo(2.59, 1);
        expect(result[0].ratio25).toBeGreaterThan(result[0.5].ratio25);
        expect(result[0.5].ratio25).toBeGreaterThan(result[1].ratio25);
        expect(result[0].ratio10).toBeCloseTo(3.84, 1);
        expect(result[1].ratio10).toBeCloseTo(2.15, 1);
        // The prose rounds these to one decimal: 5.7, 3.5, 2.6 (25 samples) and 3.8, 2.1 (10 samples).
        expect(result[0].ratio25.toFixed(1)).toBe('5.7');
        expect(result[0.5].ratio25.toFixed(1)).toBe('3.5');
        expect(result[1].ratio25.toFixed(1)).toBe('2.6');
        expect(result[0].ratio10.toFixed(1)).toBe('3.8');
        expect(result[1].ratio10.toFixed(1)).toBe('2.1');
        const compare = lessonFor('spline-parameterization').steps[4].explanation;
        ['5{,}7', '3{,}5', '2{,}6', '3{,}8', '2{,}1'].forEach(value => expect(compare.sl).toContain(value));
        ['5.7', '3.5', '2.6', '3.8', '2.1'].forEach(value => expect(compare.en).toContain(value));
        expect(lessonFor('spline-parameterization').steps[3].explanation.sl).toContain('2,5,3,3,2,10');
        expect(lessonFor('spline-parameterization').steps[2].explanation.sl).toContain('4,4,4,5,4,4');
    });

    test('the scenes describe the verified alpha and sample values', () => {
        const scenes = stepActions('spline-parameterization');
        expect(scenes[0]).toEqual([{name: 'set-parameterization-alpha', value: 0.5}, {name: 'set-parameterization-samples', value: 25}]);
        expect(scenes[2][0]).toEqual({name: 'set-parameterization-alpha', value: 0});
        expect(scenes[3][0]).toEqual({name: 'set-parameterization-alpha', value: 1});
        expect(scenes[4]).toEqual([{name: 'set-parameterization-alpha', value: 1}, {name: 'set-parameterization-samples', value: 10}, {name: 'hide-spline-fixed-points', value: false}]);
    });
});
