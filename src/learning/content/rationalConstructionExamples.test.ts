import {foundationGuidedLessons} from './foundationGuidedLessons';
import {constructionGuidedLessons} from './constructionGuidedLessons';
import {rationalConstructionGuidedLessons} from './rationalConstructionGuidedLessons';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {PolynomialBezierCurve} from '../../bezeg/impl/curve/polynomial-bezier-curve';
import {RationalBezierCurve} from '../../bezeg/impl/curve/rational-bezier-curve';
import {PointImpl} from '../../bezeg/impl/point/point-impl';

type Lesson = NonNullable<ReturnType<typeof getLessonForDemonstration>>;
type View = readonly [number, number, number, number];

/** First scene action of a step, which must be the prepared scene. */
const preparedScene = (lesson: Lesson, stepId: string) => {
    const action = lesson.steps.find(step => step.id === stepId)!.scene!.actions[0];
    if (action.kind !== 'prepared-scene') throw new Error(`step ${stepId} does not start with a prepared scene`);
    return action;
};
const toPoints = (values: number[][]) => values.map(([x, y]) => new PointImpl(x, y));
const near = (actual: number, expected: number, digits = 10) => expect(actual).toBeCloseTo(expected, digits);
const insideView = (view: View, x: number, y: number, margin = 0) => {
    const [left, top, right, bottom] = view;
    return x >= left + margin && x <= right - margin && y <= top - margin && y >= bottom + margin;
};

/** Every string of a lesson in one language (non-localized strings count for both languages). */
function collect(node: unknown, language: 'sl' | 'en', into: string[] = []): string[] {
    if (typeof node === 'string') into.push(node);
    else if (Array.isArray(node)) node.forEach(child => collect(child, language, into));
    else if (node && typeof node === 'object') {
        const record = node as Record<string, unknown>;
        if (typeof record.sl === 'string' && typeof record.en === 'string') into.push(record[language] as string);
        else Object.values(record).forEach(child => collect(child, language, into));
    }
    return into;
}
const prose = (lessonPart: unknown, language: 'sl' | 'en') => collect(lessonPart, language).join('\n');

// Independent homogeneous computations (no repo curve classes).
const bernstein = (n: number, i: number, u: number) => {
    let binomial = 1;
    for (let k = 1; k <= i; k++) binomial = binomial * (n - k + 1) / k;
    return binomial * (1 - u) ** (n - i) * u ** i;
};
const homogeneous = (points: number[][], weights: number[]) => points.map(([x, y], i) => [weights[i] * x, weights[i] * y, weights[i]]);
const homogeneousEval = (hat: number[][], u: number) => {
    const n = hat.length - 1;
    return [0, 1, 2].map(k => hat.reduce((sum, h, i) => sum + bernstein(n, i, u) * h[k], 0));
};
const project = (h: number[]) => [h[0] / h[2], h[1] / h[2]];
/** Rational curve value at s by the homogeneous definition. */
const rationalAt = (points: number[][], weights: number[], s: number) => project(homogeneousEval(homogeneous(points, weights), s));
const grid = (from: number, to: number, count: number) => Array.from({length: count + 1}, (_, i) => from + (to - from) * i / count);

const defaultPoints = [[-4, -3], [-3, 3], [3, 3], [4, -3]];
const defaultWeights = [1, 2, 1, 1];

describe('rational-elevation', () => {
    const lesson = foundationGuidedLessons.find(entry => entry.demonstrationId === 'rational-elevation')!;
    // Homogeneous elevation: hat Q_i = (i/n) hat P_{i-1} + (1 - i/n) hat P_i, with n = number of control points.
    const hat = homogeneous(defaultPoints, defaultWeights);
    const n = hat.length;
    const hatElevated = [hat[0], ...Array.from({length: n - 1}, (_, k) => {
        const i = k + 1;
        return [0, 1, 2].map(c => (i / n) * hat[i - 1][c] + (1 - i / n) * hat[i][c]);
    }), hat[n - 1]];

    test('stated homogeneous point hat Q_1 = (-11/2, 15/4, 7/4) and weight 7/4', () => {
        near(hatElevated[1][0], -11 / 2);
        near(hatElevated[1][1], 15 / 4);
        near(hatElevated[1][2], 7 / 4);
        expect(project(hatElevated[1]).map(v => v * 7)).toEqual([-22, 15].map(v => expect.closeTo(v, 10)));
    });

    test('agrees with RationalBezierCurve.elevate in weights and projected points', () => {
        const elevated = new RationalBezierCurve(toPoints(defaultPoints), defaultWeights).elevate();
        hatElevated.forEach((h, i) => {
            near(elevated.getWeights()[i], h[2]);
            near(elevated.getPoints()[i].X(), project(h)[0]);
            near(elevated.getPoints()[i].Y(), project(h)[1]);
        });
        near(elevated.getWeights()[1], 7 / 4);
    });

    test('the elevated homogeneous curve equals the original at every parameter, also after a second elevation', () => {
        for (const u of [0, 0.1, 0.3, 0.5, 0.8, 1]) {
            const original = homogeneousEval(hat, u);
            const elevated = homogeneousEval(hatElevated, u);
            [0, 1, 2].forEach(c => near(elevated[c], original[c]));
        }
        const twice = new RationalBezierCurve(toPoints(defaultPoints), defaultWeights).elevate().elevate();
        for (const u of [0.2, 0.7]) {
            const expected = rationalAt(defaultPoints, defaultWeights, u);
            near(twice.eval(u).X(), expected[0]);
            near(twice.eval(u).Y(), expected[1]);
        }
    });

    test('elevated control points stay inside the default view [-5, 5]^2, once and twice', () => {
        const once = new RationalBezierCurve(toPoints(defaultPoints), defaultWeights).elevate();
        for (const curve of [once, once.elevate()]) {
            for (const point of curve.getPoints()) expect(insideView([-5, 5, 5, -5], point.X(), point.Y())).toBe(true);
        }
    });

    test('prose states the homogeneous point in both languages', () => {
        const example = lesson.workedExamples.find(entry => entry.id === 'rational-elevation-default-example')!;
        expect(example.calculationLatex).toContain("w'_1=\\tfrac14\\cdot1+\\tfrac34\\cdot2=\\tfrac74");
        expect(example.calculationLatex).toContain('\\left(-\\tfrac{11}2,\\tfrac{15}4,\\tfrac74\\right)');
        for (const language of ['sl', 'en'] as const) {
            expect(example.check[language]).toContain('\\left(-\\tfrac{11}{2},\\,\\tfrac{15}{4},\\,\\tfrac{7}{4}\\right)');
        }
    });
});

describe('rational-subdivision', () => {
    const lesson = constructionGuidedLessons.find(entry => entry.demonstrationId === 'rational-subdivision')!;

    test('equal weights reduce to ordinary subdivision with weights 1 and the shared point (0, 3/2)', () => {
        const [left, right] = new RationalBezierCurve(toPoints(defaultPoints), [1, 1, 1, 1]).subdivide(0.5);
        const [plainLeft, plainRight] = new PolynomialBezierCurve(toPoints(defaultPoints)).subdivide(0.5);
        for (const [rational, plain] of [[left, plainLeft], [right, plainRight]] as const) {
            expect(rational.getWeights()).toHaveLength(4);
            rational.getWeights().forEach(w => near(w, 1));
            rational.getPoints().forEach((point, i) => {
                near(point.X(), plain.getPoints()[i].X());
                near(point.Y(), plain.getPoints()[i].Y());
            });
        }
        near(left.getPoints()[3].X(), 0);
        near(left.getPoints()[3].Y(), 3 / 2);
        near(right.getPoints()[0].X(), 0);
        near(right.getPoints()[0].Y(), 3 / 2);
    });

    test('weight 2 moves the shared point to (-9/11, 21/11) with weight 11/8, equal to the original curve at 1/2', () => {
        const [left, right] = new RationalBezierCurve(toPoints(defaultPoints), defaultWeights).subdivide(0.5);
        for (const shared of [left.getPoints()[3], right.getPoints()[0]]) {
            near(shared.X(), -9 / 11);
            near(shared.Y(), 21 / 11);
        }
        near(left.getWeights()[3], 11 / 8);
        near(right.getWeights()[0], 11 / 8);
        const expected = rationalAt(defaultPoints, defaultWeights, 0.5);
        near(expected[0], -9 / 11);
        near(expected[1], 21 / 11);
        // The two points differ clearly, so the contrast stated in the lesson is real.
        expect(Math.hypot(0 - -9 / 11, 3 / 2 - 21 / 11)).toBeGreaterThan(0.5);
    });

    test('homogeneous identity: the parts reproduce the original curve on [0, t] and [t, 1]', () => {
        for (const t of [0.3, 0.5]) {
            const [left, right] = new RationalBezierCurve(toPoints(defaultPoints), defaultWeights).subdivide(t);
            for (const u of [0, 0.25, 0.6, 1]) {
                const a = rationalAt(defaultPoints, defaultWeights, t * u);
                const b = rationalAt(defaultPoints, defaultWeights, t + (1 - t) * u);
                near(left.eval(u).X(), a[0]);
                near(left.eval(u).Y(), a[1]);
                near(right.eval(u).X(), b[0]);
                near(right.eval(u).Y(), b[1]);
            }
        }
    });

    test('prose states both shared points in both languages', () => {
        const step = lesson.steps.find(entry => entry.id === 'rsd-half-example')!;
        const rule = lesson.steps.find(entry => entry.id === 'rsd-homogeneous-rule')!;
        for (const language of ['sl', 'en'] as const) {
            expect(step.explanation[language]).toContain('B\\left(\\tfrac12\\right)=(0,\\,\\tfrac32)');
            expect(step.explanation[language]).toContain('\\left(-\\tfrac{9}{11},\\,\\tfrac{21}{11}\\right)');
            expect(rule.explanation[language]).toContain('1');
        }
    });
});

describe('rational-extrapolation', () => {
    const points = [[-4, -3], [-3, 3], [3, 3], [4, -1]];
    const weights = [1, 2, 1, 1];
    const D = (s: number) => weights.reduce((sum, w, i) => sum + bernstein(3, i, s) * w, 0);
    const lesson = getLessonForDemonstration('rational-extrapolation')!;
    const viewOf = (stepId: string): View => {
        return preparedScene(lesson, stepId).view!;
    };

    test('denominator is D(s) = 1 + 3s(1-s)^2, at least 1 on [0, 6/5] and [0, 3/2], with its root near -0.223', () => {
        for (const s of grid(-0.5, 1.5, 40)) near(D(s), 1 + 3 * s * (1 - s) ** 2);
        for (const upper of [1.2, 1.5]) {
            const minimum = Math.min(...grid(0, upper, 3000).map(D));
            expect(minimum).toBeGreaterThanOrEqual(1 - 1e-12);
            near(minimum, 1, 12);
        }
        let low = -0.5, high = 0;
        for (let k = 0; k < 80; k++) {
            const mid = (low + high) / 2;
            if (D(mid) < 0) low = mid; else high = mid;
        }
        near(low, -0.2229, 3);
        expect(low).toBeLessThan(0);
    });

    test('extended control points (13.54, 2.54) at t = 1.2 and (-29.5, 6) at t = 1.5 follow from RationalBezierCurve.extrapolate', () => {
        const curve = new RationalBezierCurve(toPoints(points), weights);
        const at12 = curve.extrapolate(1.2);
        near(at12.getPoints()[2].X(), 176 / 13);
        near(at12.getPoints()[2].Y(), 33 / 13);
        near(at12.getPoints()[2].X(), 13.54, 2);
        near(at12.getWeights()[3], 143 / 125);
        const at15 = curve.extrapolate(1.5);
        near(at15.getPoints()[2].X(), -29.5);
        near(at15.getPoints()[2].Y(), 6);
        near(at15.getWeights()[2], -0.5);
        near(at15.getWeights()[3], 17 / 8);
    });

    test.each([['rex-after-twelve-tenths', 1.2, 'rex-example'], ['rex-after-three-halves', 1.5, 'rex-negative-weight']] as const)(
        'step %s: its view contains every extended control point and the whole extended curve (t = %s)', (_sceneId, t, stepId) => {
            const view = viewOf(stepId);
            const extended = new RationalBezierCurve(toPoints(points), weights).extrapolate(t);
            for (const point of extended.getPoints()) {
                expect(insideView(view, point.X(), point.Y(), 0.3)).toBe(true);
            }
            for (const u of grid(0, 1, 100)) {
                const [x, y] = rationalAt(points, weights, t * u);
                expect(insideView(view, x, y)).toBe(true);
            }
            // The scene is a fixture scene with the lesson's curve, not the route default.
            expect(preparedScene(lesson, stepId)).toMatchObject({source: 'lesson-fixture', curve: {points, weights}});
        });

    test('extended curve equals the original at s = t u (sampled)', () => {
        const curve = new RationalBezierCurve(toPoints(points), weights);
        for (const t of [1.2, 1.5]) {
            const extended = curve.extrapolate(t);
            for (const u of [0, 0.4, 1]) {
                const expected = rationalAt(points, weights, t * u);
                near(extended.eval(u).X(), expected[0]);
                near(extended.eval(u).Y(), expected[1]);
            }
        }
    });

    test('prose numbers appear in both languages', () => {
        const content = constructionGuidedLessons.find(entry => entry.demonstrationId === 'rational-extrapolation')!;
        const denominator = content.formulaBlocks.find(formula => formula.id === 'rex-denominator')!;
        expect(denominator.latex).toContain('1+3s(1-s)^2\\ge1');
        const decimal = {sl: '{,}', en: '.'};
        for (const language of ['sl', 'en'] as const) {
            const d = decimal[language];
            expect(denominator.explanation[language]).toContain(`-0${d}223`);
            const stepProse = (id: string) => prose(content.steps.find(step => step.id === id), language);
            expect(stepProse('rex-example')).toContain(`13${d}54`);
            expect(content.steps.find(step => step.id === 'rex-negative-weight')!.explanation[language]).toContain(`29${d}5`);
            expect(stepProse('rex-negative-weight')).toContain(`-0${d}223`);
        }
    });
});

describe('farin', () => {
    const content = rationalConstructionGuidedLessons.find(entry => entry.demonstrationId === 'farin')!;
    const farinPoints = [[-4, -3], [-3, 3], [3, 3], [4, -3]];
    const farinOf = (pts: number[][], ws: number[]) => pts.slice(0, -1).map(([x, y], i) => {
        const w = ws[i] + ws[i + 1];
        return [(ws[i] * x + ws[i + 1] * pts[i + 1][0]) / w, (ws[i] * y + ws[i + 1] * pts[i + 1][1]) / w];
    });
    const recover = (pts: number[][], farin: number[][]) => {
        const ws = [1];
        farin.forEach(([fx, fy], i) => {
            // ||f - p_i|| / ||f - p_{i+1}|| = w_{i+1} / w_i
            ws.push(ws[i] * Math.hypot(fx - pts[i][0], fy - pts[i][1]) / Math.hypot(fx - pts[i + 1][0], fy - pts[i + 1][1]));
        });
        return ws;
    };

    test('weights are recovered from Farin points only up to a common factor; w_0 = 1 normalizes', () => {
        const base = [1, 3, 9, 27];
        for (const c of [1, 2, 0.25]) {
            const scaled = base.map(w => w * c);
            const farin = farinOf(farinPoints, scaled);
            const reference = farinOf(farinPoints, base);
            farin.forEach((f, i) => { near(f[0], reference[i][0]); near(f[1], reference[i][1]); });
            recover(farinPoints, farin).forEach((w, i) => near(w, base[i]));
        }
        recover(farinPoints, farinOf(farinPoints, defaultWeights)).forEach((w, i) => near(w, defaultWeights[i]));
    });

    test('standardizing (1, 3, 9, 27) keeps the locus and moves the parameter-1/2 point from B(3/4) to B(1/2) = (0, 3/2)', () => {
        const weighted = new RationalBezierCurve(toPoints(farinPoints), [1, 3, 9, 27]);
        weighted.setStandardForm(true);
        weighted.getWeights().forEach(w => near(w, 1));
        const polynomial = new PolynomialBezierCurve(toPoints(farinPoints));
        // Same locus: R_w(s) = B(3s / (1 + 2s)).
        for (const s of grid(0, 1, 20)) {
            const p = rationalAt(farinPoints, [1, 3, 9, 27], s);
            const q = polynomial.eval(3 * s / (1 + 2 * s));
            near(p[0], q.X());
            near(p[1], q.Y());
        }
        const before = new RationalBezierCurve(toPoints(farinPoints), [1, 3, 9, 27]).eval(0.5);
        near(before.X(), 79 / 32);
        near(before.Y(), 3 / 8);
        const after = new RationalBezierCurve(toPoints(farinPoints), [1, 1, 1, 1]).eval(0.5);
        near(after.X(), 0);
        near(after.Y(), 3 / 2);
    });

    test('prose states both parameter-1/2 points in both languages', () => {
        const step = content.steps.find(entry => entry.id === 'farin-standard-form')!;
        const example = content.workedExamples.find(entry => entry.id === 'farin-standardize')!;
        for (const language of ['sl', 'en'] as const) {
            for (const text of [step.explanation[language], example.check[language]]) {
                expect(text).toContain('\\tfrac{79}{32},\\,\\tfrac38');
                expect(text).toContain('0,\\,\\tfrac32');
            }
        }
    });
});

describe('circle', () => {
    const r = 3;
    const circleLesson = getLessonForDemonstration('circle')!;
    const content = rationalConstructionGuidedLessons.find(entry => entry.demonstrationId === 'circle')!;
    const defaultView: View = [-5, 5, 5, -5];
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
        return Array.from({length: n}, (_, i) => ({points: [even[i], odd[i], even[i + 1]], weights: [1, Math.cos(alpha), 1]}));
    };
    const viewOf = (stepId: string): View | undefined => preparedScene(circleLesson, stepId).view;

    test('n = 3: the scenes widen the view to [-7, 8, 7, -5], which contains every control point; the default view does not', () => {
        expect(viewOf('circle-default')).toEqual([-7, 8, 7, -5]);
        expect(viewOf('circle-one-arc')).toEqual([-7, 8, 7, -5]);
        const all = pieces(3).flatMap(piece => piece.points);
        for (const [x, y] of all) expect(insideView([-7, 8, 7, -5], x, y, 0.3)).toBe(true);
        expect(all.some(([x, y]) => !insideView(defaultView, x, y))).toBe(true);
        expect(all.some(([x, y]) => Math.abs(x) < 1e-9 && Math.abs(y - 6) < 1e-9)).toBe(true);
        expect(all.filter(([x, y]) => Math.abs(Math.abs(x) - 3 * Math.sqrt(3)) < 1e-9 && Math.abs(y + 3) < 1e-9)).toHaveLength(2);
    });

    test('n >= 4 needs no widened view: points fit the default view and the scenes set none', () => {
        for (const stepId of ['circle-four', 'circle-six', 'circle-why-three']) expect(viewOf(stepId)).toBeUndefined();
        for (const [x, y] of pieces(4).flatMap(piece => piece.points)) expect(insideView(defaultView, x, y)).toBe(true);
    });

    test.each([3, 4, 6])('n = %s: every curve point lies exactly on the circle of radius 3', n => {
        for (const piece of pieces(n)) {
            for (const s of grid(0, 1, 20)) {
                const [x, y] = rationalAt(piece.points, piece.weights, s);
                near(Math.hypot(x, y), 3, 12);
                const repo = new RationalBezierCurve(toPoints(piece.points), piece.weights).eval(s);
                near(Math.hypot(repo.X(), repo.Y()), 3, 12);
            }
        }
    });

    test('prose states the distance 6 and the widened view in both languages', () => {
        for (const language of ['sl', 'en'] as const) {
            expect(prose(content.steps.find(step => step.id === 'circle-default'), language)).toContain('(0,\\,6)');
            expect(prose(content.steps.find(step => step.id === 'circle-one-arc'), language)).toContain('(0,\\,6)');
        }
    });
});
