import {rationalConstructionGuidedLessons} from './rationalConstructionGuidedLessons';
import {SUPPORTED_SCENE_ACTION_NAMES} from './guidedLessons';
import {sceneAction} from '../runtime/lessonCatalog';
import {PolynomialBezierCurve} from '../../bezeg/impl/curve/polynomial-bezier-curve';
import {RationalBezierCurve} from '../../bezeg/impl/curve/rational-bezier-curve';
import {PointImpl} from '../../bezeg/impl/point/point-impl';
import {geometryCache} from '../../bezeg/cache/GeometryCache';

const lessonFor = (id: string) => rationalConstructionGuidedLessons.find(lesson => lesson.demonstrationId === id)!;
const toPoints = (values: number[][]) => values.map(([x, y]) => new PointImpl(x, y));

// Route defaults (DecasteljauGraph2, FarinPointsCurveGraph, RationalBezierCurveCircleGraphN).
const quarticPoints = [[-4, -3], [-3, 2], [0, 3], [3, 2], [4, -3]];
const farinPoints = [[-4, -3], [-3, 3], [3, 3], [4, -3]];
const farinWeights = [1, 2, 1, 1];

beforeEach(() => geometryCache.invalidate());

const expectPoint = (actual: {X(): number; Y(): number}, x: number, y: number) => {
    expect(actual.X()).toBeCloseTo(x, 12);
    expect(actual.Y()).toBeCloseTo(y, 12);
};

const expectedSteps: Record<string, number> = {
    'decasteljau-alternative': 5,
    'farin': 5,
    'circle': 5,
};

test('keeps the rational construction lessons bounded, localized, and source-backed', () => {
    expect(rationalConstructionGuidedLessons.map(lesson => lesson.demonstrationId)).toEqual(Object.keys(expectedSteps));
    for (const lesson of rationalConstructionGuidedLessons) {
        expect(lesson.steps).toHaveLength(expectedSteps[lesson.demonstrationId]);
        expect(lesson.steps.length).toBeGreaterThanOrEqual(4);
        expect(lesson.steps.length).toBeLessThanOrEqual(6);
        expect(lesson.steps.map(step => step.order)).toEqual(lesson.steps.map((_, index) => index + 1));
        expect(new Set(lesson.steps.map(step => step.id)).size).toBe(lesson.steps.length);
        expect(new Set(lesson.steps.flatMap(step => step.frames.map(frame => frame.id))).size)
            .toBe(lesson.steps.reduce((sum, step) => sum + step.frames.length, 0));
        expect(lesson.sources.length).toBeGreaterThanOrEqual(2);
        expect(lesson.sources.some(source => source.citation.startsWith('Bezeg source:'))).toBe(true);
        expect(lesson.sources.some(source => Boolean(source.implementationCorrespondence))).toBe(true);
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
        expect(exampleIds.size).toBe(lesson.workedExamples.length);
        const usedExamples = new Set<string>();
        for (const step of lesson.steps) {
            expect(step.frames[0].kind).toBe('explanation');
            expect(step.frames.at(-1)?.kind).toBe('observation');
            expect(step.frames.filter(frame => frame.kind === 'calculation')).toHaveLength(step.workedExampleId ? 1 : 0);
            step.formulaIds.forEach(id => expect(formulaIds.has(id)).toBe(true));
            if (step.workedExampleId) {
                expect(exampleIds.has(step.workedExampleId)).toBe(true);
                usedExamples.add(step.workedExampleId);
            }
            expect(step.scene?.basedOn).toBe('demonstration-default');
            for (const action of step.scene?.actions ?? []) {
                expect(SUPPORTED_SCENE_ACTION_NAMES).toContain(action.name);
                expect(() => sceneAction(action)).not.toThrow();
            }
        }
        expect(usedExamples).toEqual(exampleIds);
    }
});

test('each lesson only uses the scene actions of its own graph, with valid values', () => {
    const actions = (id: string) => lessonFor(id).steps.flatMap(step => step.scene?.actions ?? []);
    expect(new Set(actions('decasteljau-alternative').map(action => action.name))).toEqual(new Set(['set-decasteljau-parameter']));
    actions('decasteljau-alternative').forEach(action => {
        expect(typeof action.value).toBe('number');
        expect(action.value as number).toBeGreaterThanOrEqual(0);
        expect(action.value as number).toBeLessThanOrEqual(1);
    });
    expect(new Set(actions('farin').map(action => action.name)))
        .toEqual(new Set(['show-weights', 'show-farin-points', 'set-rational-weights', 'set-standard-form']));
    expect(new Set(actions('circle').map(action => action.name))).toEqual(new Set(['set-circle-pieces']));
    for (const action of actions('farin')) {
        if (action.name === 'set-rational-weights') {
            expect(Array.isArray(action.value)).toBe(true);
            const weights = action.value as number[];
            expect(weights).toHaveLength(farinPoints.length);
            weights.forEach(weight => expect(Number.isFinite(weight) && weight > 0).toBe(true));
        } else {
            expect(typeof action.value).toBe('boolean');
        }
    }
    for (const action of actions('circle')) {
        expect(Number.isInteger(action.value)).toBe(true);
        expect(action.value as number).toBeGreaterThanOrEqual(3);
        expect(action.value as number).toBeLessThanOrEqual(12);
    }
    expect(lessonFor('decasteljau-alternative').steps.map(step => step.scene!.actions)).toEqual([
        [], [{name: 'set-decasteljau-parameter', value: 0.5}], [{name: 'set-decasteljau-parameter', value: 0.25}],
        [{name: 'set-decasteljau-parameter', value: 0.75}], [{name: 'set-decasteljau-parameter', value: 0.5}],
    ]);
    expect(lessonFor('circle').steps.map(step => step.scene!.actions.map(action => action.value))).toEqual([[], [3], [4], [6], [12]]);
    expect(lessonFor('farin').steps.map(step => step.scene!.actions.length)).toEqual([1, 2, 2, 3, 4]);
});

describe('decasteljau-alternative', () => {
    const quartic = new PolynomialBezierCurve(toPoints(quarticPoints));
    const c1 = new PolynomialBezierCurve(toPoints(quarticPoints.slice(0, 4)));
    const c2 = new PolynomialBezierCurve(toPoints(quarticPoints.slice(1, 5)));

    test('Theorem 2.13: B(t) = (1-t) C1(t) + t C2(t) for several t', () => {
        for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
            const a = c1.eval(t);
            const b = c2.eval(t);
            expectPoint(quartic.eval(t), (1 - t) * a.X() + t * b.X(), (1 - t) * a.Y() + t * b.Y());
        }
        // Endpoints of the helper points: t = 0 gives p0 and p1, t = 1 gives p3 and p4.
        expectPoint(c1.eval(0), -4, -3);
        expectPoint(c2.eval(0), -3, 2);
        expectPoint(c1.eval(1), 3, 2);
        expectPoint(c2.eval(1), 4, -3);
    });

    test('worked example t = 1/2', () => {
        expectPoint(c1.eval(0.5), -1.25, 1.75);
        expectPoint(c2.eval(0.5), 1.25, 1.75);
        expectPoint(quartic.eval(0.5), 0, 1.75);
        const example = lessonFor('decasteljau-alternative').workedExamples.find(e => e.id === 'da-half')!;
        expect(example.calculationLatex).toContain('\\bigl(-\\tfrac54,\\tfrac74\\bigr)');
        expect(example.calculationLatex).toContain('\\bigl(\\tfrac54,\\tfrac74\\bigr)');
        expect(example.resultLatex).toContain('\\bigl(0,\\tfrac74\\bigr)');
    });

    test('worked example t = 1/4 and the mirrored t = 3/4', () => {
        expectPoint(c1.eval(0.25), -2.90625, 0.03125);
        expectPoint(c1.eval(0.25), -93 / 32, 1 / 32);
        expectPoint(c2.eval(0.25), -0.78125, 2.34375);
        expectPoint(c2.eval(0.25), -25 / 32, 75 / 32);
        expectPoint(quartic.eval(0.25), -2.375, 0.609375);
        expectPoint(quartic.eval(0.25), -19 / 8, 39 / 64);
        const example = lessonFor('decasteljau-alternative').workedExamples.find(e => e.id === 'da-quarter')!;
        expect(example.calculationLatex).toContain('-\\tfrac{93}{32},\\tfrac1{32}');
        expect(example.calculationLatex).toContain('-\\tfrac{25}{32},\\tfrac{75}{32}');
        expect(example.resultLatex).toContain('-\\tfrac{19}{8},\\tfrac{39}{64}');
        // Symmetry used in the t = 3/4 step.
        expectPoint(c2.eval(0.75), 2.90625, 0.03125);
        expectPoint(c1.eval(0.75), 0.78125, 2.34375);
        expectPoint(quartic.eval(0.75), 2.375, 0.609375);
    });

    test('one level of recursion is the last step of the ordinary de Casteljau scheme', () => {
        const t = 0.3;
        const scheme = quartic.decasteljauScheme(t);
        const rows = scheme.map(row => row.map(point => [point.X(), point.Y()]));
        // Second to last row holds the two cubic points; the last row is their combination.
        const last = rows[4][0];
        expect(rows[3][0][0]).toBeCloseTo(c1.eval(t).X(), 12);
        expect(rows[3][0][1]).toBeCloseTo(c1.eval(t).Y(), 12);
        expect(rows[3][1][0]).toBeCloseTo(c2.eval(t).X(), 12);
        expect(rows[3][1][1]).toBeCloseTo(c2.eval(t).Y(), 12);
        expect(last[0]).toBeCloseTo(quartic.eval(t).X(), 12);
        expect(last[1]).toBeCloseTo(quartic.eval(t).Y(), 12);
    });
});

describe('farin', () => {
    const curve = new RationalBezierCurve(toPoints(farinPoints), farinWeights);
    const pointArray = toPoints(farinPoints);
    const farinPoint = (w: number[], i: number) => {
        const a = pointArray[i];
        const b = pointArray[i + 1];
        const s = w[i] + w[i + 1];
        return new PointImpl((w[i] * a.X() + w[i + 1] * b.X()) / s, (w[i] * a.Y() + w[i + 1] * b.Y()) / s);
    };
    const distance = (a: {X(): number; Y(): number}, b: {X(): number; Y(): number}) => Math.hypot(a.X() - b.X(), a.Y() - b.Y());

    test('Farin points of the default curve and their ratios', () => {
        expectPoint(farinPoint(farinWeights, 0), -10 / 3, 1);
        expectPoint(farinPoint(farinWeights, 1), -1, 3);
        expectPoint(farinPoint(farinWeights, 2), 3.5, 0);
        for (let i = 0; i < 3; i++) {
            const f = farinPoint(farinWeights, i);
            expect(distance(f, pointArray[i]) / distance(f, pointArray[i + 1])).toBeCloseTo(farinWeights[i + 1] / farinWeights[i], 12);
        }
        const example = lessonFor('farin').workedExamples.find(e => e.id === 'farin-default-points')!;
        expect(example.resultLatex).toBe('f_0=\\bigl(-\\tfrac{10}3,1\\bigr),\\quad f_1=(-1,3),\\quad f_2=\\bigl(\\tfrac72,0\\bigr)');
    });

    test('weights are recovered from the Farin points with w0 = 1', () => {
        const ratios = [0, 1, 2].map(i => {
            const f = farinPoint(farinWeights, i);
            return distance(f, pointArray[i]) / distance(f, pointArray[i + 1]);
        });
        expect(ratios[0]).toBeCloseTo(2, 12);
        expect(ratios[1]).toBeCloseTo(0.5, 12);
        expect(ratios[2]).toBeCloseTo(1, 12);
        const recovered = [1];
        ratios.forEach((ratio, i) => recovered.push(recovered[i] * ratio));
        recovered.forEach((w, i) => expect(w).toBeCloseTo(farinWeights[i], 12));
        // The default weights are already in standard form and are not changed by it.
        const standard = new RationalBezierCurve(toPoints(farinPoints), farinWeights);
        standard.setStandardForm(true);
        standard.getWeights().forEach((w, i) => expect(w).toBeCloseTo(farinWeights[i], 12));
        expect(farinWeights[0]).toBe(1);
        expect(farinWeights[3]).toBe(1);
        expect(lessonFor('farin').workedExamples.find(e => e.id === 'farin-recover-weights')!.resultLatex).toBe('w=(1,2,1,1)');
    });

    test('the weights 1, 3, 9, 27 give equal 3:1 Farin ratios and standardize to 1, 1, 1, 1', () => {
        const weights = [1, 3, 9, 27];
        expectPoint(farinPoint(weights, 0), -13 / 4, 3 / 2);
        expectPoint(farinPoint(weights, 1), 3 / 2, 3);
        expectPoint(farinPoint(weights, 2), 15 / 4, -3 / 2);
        for (let i = 0; i < 3; i++) {
            const f = farinPoint(weights, i);
            expect(distance(f, pointArray[i]) / distance(f, pointArray[i + 1])).toBeCloseTo(3, 12);
        }
        const geometric = new RationalBezierCurve(toPoints(farinPoints), weights);
        geometric.setStandardForm(true);
        geometric.getWeights().forEach(w => expect(w).toBeCloseTo(1, 12));
        expect(geometric.getEffectiveWeights()).toEqual(weights);
        const example = lessonFor('farin').workedExamples.find(e => e.id === 'farin-equal-ratios')!;
        expect(example.calculationLatex).toContain('\\bigl(-\\tfrac{13}4,\\tfrac32\\bigr)');
        expect(example.calculationLatex).toContain('\\bigl(\\tfrac32,3\\bigr)');
        expect(example.calculationLatex).toContain('\\bigl(\\tfrac{15}4,-\\tfrac32\\bigr)');
    });

    test('standardization only reparameterizes: R_w(s) = B(3s / (1 + 2s)) with phi(t) = t / (3 - 2t)', () => {
        const weights = [1, 3, 9, 27];
        const rational = new RationalBezierCurve(toPoints(farinPoints), weights);
        const polynomial = new PolynomialBezierCurve(toPoints(farinPoints));
        for (const s of [0, 0.1, 0.25, 0.5, 0.8, 1]) {
            const t = 3 * s / (1 + 2 * s);
            expect(t / (3 - 2 * t)).toBeCloseTo(s, 12);
            expectPoint(rational.eval(s), polynomial.eval(t).X(), polynomial.eval(t).Y());
        }
        expectPoint(rational.eval(0.5), 79 / 32, 3 / 8);
        expectPoint(polynomial.eval(0.75), 79 / 32, 3 / 8);
        // The lesson claims the shape is the polynomial curve with the same control points and lower than the default.
        expect(polynomial.eval(0.5).Y()).toBeLessThan(curve.eval(0.5).Y());
        // General Theorem 3.2 check on non-trivial weights: standardized weights give the same point set.
        const general = new RationalBezierCurve(toPoints(farinPoints), [2, 3, 5, 8]);
        const n = 3;
        const rho = Math.pow(8 / 2, 1 / n);
        const standardized = new RationalBezierCurve(toPoints(farinPoints), [2, 3, 5, 8].map((w, i) => w / Math.pow(8 ** i * 2 ** (n - i), 1 / n)));
        expect(standardized.getWeights()[0]).toBeCloseTo(1, 12);
        expect(standardized.getWeights()[3]).toBeCloseTo(1, 12);
        for (const t of [0, 0.2, 0.5, 0.9, 1]) {
            const s = t / (rho * (1 - t) + t);
            expectPoint(general.eval(s), standardized.eval(t).X(), standardized.eval(t).Y());
        }
        const example = lessonFor('farin').workedExamples.find(e => e.id === 'farin-standardize')!;
        expect(example.resultLatex).toContain('\\tfrac{79}{32},\\tfrac38');
        expect(example.calculationLatex).toContain('\\varphi(t)=\\frac{t}{3-2t}');
    });
});

describe('circle', () => {
    const r = 3;
    /** Same construction as RationalBezierCurveCircleGraphN.generateCurves. */
    const pieces = (n: number) => {
        const alpha = Math.PI / n;
        const R = r / Math.cos(alpha);
        const even: number[][] = [];
        const odd: number[][] = [];
        for (let i = 0; i <= n; i++) {
            even.push([r * Math.sin(2 * i * alpha), -r * Math.cos(2 * i * alpha)]);
            odd.push([R * Math.sin((2 * i + 1) * alpha), -R * Math.cos((2 * i + 1) * alpha)]);
        }
        return Array.from({length: n}, (_, i) => new RationalBezierCurve(toPoints([even[i], odd[i], even[i + 1]]), [1, Math.cos(alpha), 1]));
    };

    test('worked values: middle weight cos(pi/n) and middle point at distance 3 / cos(pi/n)', () => {
        const stated: [number, number, number][] = [
            [3, 0.5, 6],
            [4, Math.SQRT2 / 2, 3 * Math.SQRT2],
            [6, Math.sqrt(3) / 2, 2 * Math.sqrt(3)],
        ];
        for (const [n, weight, distance] of stated) {
            const [piece] = pieces(n);
            expect(piece.getWeights()[1]).toBeCloseTo(weight, 12);
            expect(Math.hypot(piece.getPoints()[1].X(), piece.getPoints()[1].Y())).toBeCloseTo(distance, 12);
            expect(Math.hypot(piece.getPoints()[0].X(), piece.getPoints()[0].Y())).toBeCloseTo(3, 12);
        }
        expect(3 * Math.SQRT2).toBeCloseTo(4.243, 3);
        expect(2 * Math.sqrt(3)).toBeCloseTo(3.464, 3);
        expect(Math.sqrt(3) / 2).toBeCloseTo(0.866, 3);
        // n = 12 numbers stated in the last step.
        expect(Math.cos(Math.PI / 12)).toBeCloseTo(0.966, 3);
        expect(3 / Math.cos(Math.PI / 12)).toBeCloseTo(3.106, 3);
        const [piece12] = pieces(12);
        expect(Math.hypot(piece12.getPoints()[1].X(), piece12.getPoints()[1].Y())).toBeCloseTo(3.106, 3);
        const examples = lessonFor('circle').workedExamples;
        expect(examples.find(e => e.id === 'circle-three')!.calculationLatex).toContain('\\frac{3}{1/2}=6');
        expect(examples.find(e => e.id === 'circle-four')!.calculationLatex).toContain('3\\sqrt2\\approx4{,}243');
        expect(examples.find(e => e.id === 'circle-six')!.calculationLatex).toContain('2\\sqrt3\\approx3{,}464');
    });

    test('every evaluated point is at distance 3 and pieces share endpoints and tangent directions', () => {
        for (let n = 3; n <= 12; n++) {
            const list = pieces(n);
            expect(list).toHaveLength(n);
            list.forEach((piece, i) => {
                for (let k = 0; k <= 40; k++) {
                    const p = piece.eval(k / 40);
                    expect(Math.hypot(p.X(), p.Y())).toBeCloseTo(3, 9);
                }
                // Isosceles control triangle and the stated middle weight.
                const [a, b, c] = piece.getPoints();
                expect(Math.hypot(a.X() - b.X(), a.Y() - b.Y())).toBeCloseTo(Math.hypot(c.X() - b.X(), c.Y() - b.Y()), 12);
                // The side of the control triangle is tangent: perpendicular to the radius at the end point.
                expect(a.X() * (b.X() - a.X()) + a.Y() * (b.Y() - a.Y())).toBeCloseTo(0, 9);
                expect(c.X() * (b.X() - c.X()) + c.Y() * (b.Y() - c.Y())).toBeCloseTo(0, 9);
                // Neighbouring pieces share the endpoint and the tangent line (parallel direction towards the middle points).
                const next = list[(i + 1) % n];
                const [d, e] = next.getPoints();
                expect(d.X()).toBeCloseTo(c.X(), 9);
                expect(d.Y()).toBeCloseTo(c.Y(), 9);
                const cross = (b.X() - c.X()) * (e.Y() - d.Y()) - (b.Y() - c.Y()) * (e.X() - d.X());
                expect(cross).toBeCloseTo(0, 9);
                // B(1/2) = (Q0 + 2 w Q1 + Q2) / (2 + 2w) is at distance 3 as in the lesson.
                const w = Math.cos(Math.PI / n);
                const mx = (a.X() + 2 * w * b.X() + c.X()) / (2 + 2 * w);
                const my = (a.Y() + 2 * w * b.Y() + c.Y()) / (2 + 2 * w);
                expect(Math.hypot(mx, my)).toBeCloseTo(3, 9);
                expect(piece.eval(0.5).X()).toBeCloseTo(mx, 9);
            });
        }
    });

    test('n = 2 is degenerate, so the lessons stay within 3 to 12 pieces', () => {
        expect(Math.abs(Math.cos(Math.PI / 2))).toBeLessThan(1e-15);
        expect(3 / Math.cos(Math.PI / 2)).toBeGreaterThan(1e15);
        for (let n = 3; n <= 12; n++) expect(Math.cos(Math.PI / n)).toBeGreaterThan(0);
        // Weights approach 1 as n grows.
        expect(Math.cos(Math.PI / 12)).toBeGreaterThan(Math.cos(Math.PI / 6));
        expect(Math.cos(Math.PI / 6)).toBeGreaterThan(Math.cos(Math.PI / 4));
        expect(Math.cos(Math.PI / 4)).toBeGreaterThan(Math.cos(Math.PI / 3));
    });
});

// ---------------------------------------------------------------------------------------------
// Math notation guard (same rules as lessonMathNotation.test.ts, limited to this module).
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

function stripMath(text: string): {outside: string} | {error: string} {
    let outside = '';
    let index = 0;
    while (index < text.length) {
        const pair = text.slice(index, index + 2);
        if (pair === '\\(' || pair === '\\[') {
            const close = pair === '\\(' ? '\\)' : '\\]';
            const end = text.indexOf(close, index + 2);
            if (end < 0) return {error: `unclosed ${pair}`};
            if (/\\[([]/.test(text.slice(index + 2, end))) return {error: 'nested math delimiters'};
            index = end + 2;
            outside += ' ';
        } else if (pair === '\\)' || pair === '\\]') {
            return {error: `unmatched ${pair}`};
        } else {
            outside += text[index];
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

test('lesson prose wraps math in MathJax delimiters, latex fields stay bare, and decimals follow the locale', () => {
    const result: string[] = [];
    for (const lesson of rationalConstructionGuidedLessons) {
        const where = lesson.demonstrationId;
        const localized: {path: string; lang: string; text: string}[] = [];
        collectLocalized(lesson, '', localized);
        for (const {path, lang, text} of localized) {
            const stripped = stripMath(text);
            const mathSegments = [...text.matchAll(/\\\((.*?)\\\)|\\\[(.*?)\\\]/g)].map(match => match[1] ?? match[2] ?? '');
            if (lang === 'sl' && mathSegments.some(segment => /\d\.\d/.test(segment))) result.push(`${where} ${path} [sl] decimal point inside math: ${text}`);
            if (lang === 'en' && mathSegments.some(segment => /\d\{,\}\d/.test(segment))) result.push(`${where} ${path} [en] decimal comma inside math: ${text}`);
            if ('error' in stripped) {
                result.push(`${where} ${path} [${lang}] ${stripped.error}: ${text}`);
            } else if (BARE_SCRIPT.test(stripped.outside) || BARE_COMMAND.test(stripped.outside)) {
                result.push(`${where} ${path} [${lang}] bare TeX outside math: ${text}`);
            } else {
                const heuristic = BARE_MATH_HEURISTICS.find(([, pattern]) => pattern.test(stripped.outside));
                if (heuristic) result.push(`${where} ${path} [${lang}] bare math (${heuristic[0]}): ${text}`);
            }
        }
        const tex: {path: string; text: string}[] = [];
        collectTex(lesson, '', tex);
        for (const {path, text} of tex) {
            if (/\\[()[\]]/.test(text)) result.push(`${where} ${path} contains math delimiters: ${text}`);
        }
    }
    if (result.length) throw new Error(`${result.length} notation problem(s):\n${result.join('\n')}`);
});
