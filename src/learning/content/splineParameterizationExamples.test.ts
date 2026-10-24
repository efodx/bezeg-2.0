import {splineGuidedLessons} from './splineGuidedLessons';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {C2CubicBezierSpline} from '../../bezeg/impl/curve/C2CubicBezierSpline';
import {PointImpl} from '../../bezeg/impl/point/point-impl';

/**
 * Task 05 part (b): the lesson-fixture scene of spline-parameterization. The fixture is read from the lesson,
 * built with the repo's C2CubicBezierSpline, and the edge lengths, knot spacings, shape change and sample
 * distribution are recomputed independently. Prose numbers are checked in both languages.
 */

type Pt = number[];
const lesson = splineGuidedLessons.find(l => l.demonstrationId === 'spline-parameterization')!;
const scenes = lesson.steps.map(step => step.scene!);
const fixture = (scenes[0] as any).curve.points as Pt[];
const view = (scenes[0] as any).view as number[];

const SAMPLES = 10;
const ALPHAS = [0, 0.5, 1];
const STEP_ALPHA = [0.5, 0.5, 0, 1, 0.5];

const build = (points: Pt[] = fixture) => new C2CubicBezierSpline(points.map(([x, y]) => new PointImpl(x, y)));
const at = (alpha: number, points: Pt[] = fixture) => { const s = build(points); s.setAlpha(alpha); return s; };
const pieces = (s: C2CubicBezierSpline): Pt[][] => s.getUnderlyingCurves().map(c => c.getPoints().map(p => [p.X(), p.Y()]));
const derived = (s: C2CubicBezierSpline): Pt[] => s.getNonFreePoints().map(p => [p.X(), p.Y()]);
const knots = (s: C2CubicBezierSpline): number[] => (s as any).getU();
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const sub = (a: Pt, b: Pt) => [a[0] - b[0], a[1] - b[1]];
const norm = (v: Pt) => Math.hypot(v[0], v[1]);
const joint = (s: C2CubicBezierSpline, k: number): Pt => pieces(s)[k - 1][3];
const close = (a: Pt, b: Pt, d = 3) => { expect(a[0]).toBeCloseTo(b[0], d); expect(a[1]).toBeCloseTo(b[1], d); };

/** The graph places samples at t = i/(N+1) for i = 1..N: the end points t = 0 and t = 1 are not sampled. */
const sampleTs = (count: number) => Array.from({length: count}, (_, i) => (i + 1) / (count + 1));
const samples = (s: C2CubicBezierSpline, count = SAMPLES): Pt[] => sampleTs(count).map(t => { const p = s.eval(t); return [p.X(), p.Y()]; });
const gapRatio = (s: C2CubicBezierSpline) => {
    const pts = samples(s);
    const gaps = pts.slice(1).map((p, i) => dist(p, pts[i]));
    return Math.max(...gaps) / Math.min(...gaps);
};

/** Independent edge lengths: the thesis spans are |p0 p2|, |p2 p3|, ..., |p(n-3) p(n-1)|. */
const chordPairs = (n: number) => [[0, 2], ...Array.from({length: n - 5}, (_, i) => [i + 2, i + 3]), [n - 3, n - 1]];
const chords = () => chordPairs(fixture.length).map(([a, b]) => dist(fixture[a], fixture[b]));
const independentSpans = (alpha: number) => { const w = chords().map(c => c ** alpha); const sum = w.reduce((a, b) => a + b, 0); return w.map(v => v / sum); };
const piecesOfSample = (s: C2CubicBezierSpline): number[] => {
    const u = knots(s);
    const result = new Array(u.length - 1).fill(0);
    for (const t of sampleTs(SAMPLES)) {
        let k = 0;
        while (k < result.length - 1 && t >= u[k + 1]) k++;
        result[k]++;
    }
    return result;
};
/** Smallest distance from a sample parameter to a knot: the piece counts are not decided by rounding noise. */
const knotMargin = (s: C2CubicBezierSpline) => Math.min(...knots(s).slice(1, -1).flatMap(k => sampleTs(SAMPLES).map(t => Math.abs(t - k))));

const binom = (n: number, k: number): number => k === 0 ? 1 : binom(n, k - 1) * (n - k + 1) / k;
const fall = (n: number, k: number) => { let r = 1; for (let i = 0; i < k; i++) r *= n - i; return r; };
/** k-th derivative with respect to the global parameter at a piece end. */
function derivative(points: Pt[], k: number, span: number, atEnd: boolean): Pt {
    const n = points.length - 1, first = atEnd ? n - k : 0, out = [0, 0];
    for (let j = 0; j <= k; j++) {
        const sign = (k - j) % 2 === 0 ? 1 : -1;
        for (let d = 0; d < 2; d++) out[d] += sign * binom(k, j) * points[first + j][d];
    }
    return out.map(v => v * fall(n, k) / span ** k);
}

describe('fixture scenes', () => {
    test('all five steps use the one lesson fixture, a view box and the planned alpha with ten samples and visible derived points', () => {
        expect(scenes).toHaveLength(5);
        scenes.forEach((scene, i) => {
            expect(scene.basedOn).toBe('lesson-fixture');
            expect((scene as any).curve.points).toEqual(fixture);
            expect((scene as any).view).toEqual(view);
            expect(scene.actions).toEqual([
                {name: 'set-parameterization-alpha', value: STEP_ALPHA[i]},
                {name: 'set-parameterization-samples', value: SAMPLES},
                {name: 'hide-spline-fixed-points', value: false},
            ]);
        });
        expect(fixture).toEqual([[-7, -2], [-7, 1.5], [-5, 0.5], [-4, 1.5], [-3.2, -1], [4, 2.5], [6, -1.5], [2, -3.5]]);
        expect(view).toEqual([-9, 5, 9, -5]);
    });

    test('the served lesson exposes the fixture as a prepared scene', () => {
        const served = getLessonForDemonstration('spline-parameterization')!;
        served.steps.forEach(step => {
            const first: any = step.scene?.actions[0];
            expect(first.source).toBe('lesson-fixture');
            expect(first.curve.points).toEqual(fixture);
        });
    });
});

describe('construction', () => {
    test('eight free points, five pieces, four joints, twelve derived points; the curve starts and ends at the end points', () => {
        for (const alpha of ALPHAS) {
            const s = at(alpha);
            expect(s.getPoints()).toHaveLength(8);
            expect(pieces(s)).toHaveLength(5);
            expect(derived(s)).toHaveLength(12);
            close(pieces(s)[0][0], fixture[0], 9);
            close(pieces(s)[4][3], fixture[7], 9);
            close(joint(s, 5), fixture[7], 9);
        }
    });

    test('edge lengths are distinctly unequal and match the stated values', () => {
        const c = chords();
        expect(c).toHaveLength(5);
        expect(c[0]).toBeCloseTo(Math.sqrt(41) / 2, 12);
        expect(c[1]).toBeCloseTo(Math.SQRT2, 12);
        expect(c[2]).toBeCloseTo(Math.sqrt(6.89), 12);
        expect(c[3]).toBeCloseTo(Math.sqrt(64.09), 12);
        expect(c[4]).toBeCloseTo(Math.sqrt(40), 12);
        const total = c.reduce((a, b) => a + b, 0);
        expect(total).toBeCloseTo(21.571, 3);
        expect(Math.max(...c) / Math.min(...c)).toBeGreaterThan(5);
        expect(c.indexOf(Math.min(...c))).toBe(1);
        expect(c.indexOf(Math.max(...c))).toBe(3);
        // every other chord is at least 1.5 times the shortest: no two edges nearly equal in the visible pattern
        expect(Math.min(...c.filter((_, i) => i !== 1))).toBeGreaterThan(1.8 * Math.min(...c));
    });

    test('knot spacings equal the normalised chord^alpha for alpha = 0, 1/2, 1 (repo and independent formula)', () => {
        for (const alpha of ALPHAS) {
            const u = knots(at(alpha));
            const spans = u.slice(1).map((v, i) => v - u[i]);
            expect(u[0]).toBe(0);
            expect(u[u.length - 1]).toBeCloseTo(1, 12);
            independentSpans(alpha).forEach((span, i) => expect(spans[i]).toBeCloseTo(span, 12));
        }
        independentSpans(0).forEach(span => expect(span).toBeCloseTo(0.2, 12));
        const half = independentSpans(0.5);
        expect(Math.min(...half)).toBeCloseTo(0.1196, 4);
        expect(Math.max(...half)).toBeCloseTo(0.2846, 4);
        const one = independentSpans(1);
        expect(one[1]).toBeCloseTo(0.0656, 4);
        expect(one[3]).toBeCloseTo(0.3711, 4);
        expect(one[1].toFixed(3)).toBe('0.066');
        expect(one[3].toFixed(3)).toBe('0.371');
    });

    test('positions, first and second derivatives agree at every joint for every alpha (with parameter-interval scaling)', () => {
        for (const alpha of ALPHAS) {
            const s = at(alpha), all = pieces(s), u = knots(s), sp = u.slice(1).map((v, i) => v - u[i]);
            for (let j = 0; j < all.length - 1; j++) {
                for (let k = 0; k <= 2; k++) {
                    const left = k === 0 ? all[j][3] : derivative(all[j], k, sp[j], true);
                    const right = k === 0 ? all[j + 1][0] : derivative(all[j + 1], k, sp[j + 1], false);
                    expect(norm(sub(left, right))).toBeLessThan(1e-8);
                }
            }
        }
    });

    test('for alpha = 0 the inner joints are the midpoints of the neighbouring thirds points (independent formula)', () => {
        const s = at(0), lerp = (a: Pt, b: Pt, t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        const mid = (a: Pt, b: Pt) => lerp(a, b, 0.5);
        // pieces 2 and 3 lie on the edges p2p3 and p3p4 at thirds; the joints between pieces 2-3 and 3-4 are midpoints of adjacent thirds points
        close(joint(s, 2), mid(lerp(fixture[2], fixture[3], 2 / 3), lerp(fixture[3], fixture[4], 1 / 3)), 9);
        close(joint(s, 3), mid(lerp(fixture[3], fixture[4], 2 / 3), lerp(fixture[4], fixture[5], 1 / 3)), 9);
        close(joint(s, 3), [-32 / 15, 0], 9);
    });
});

describe('alpha changes the shape, the free points stay', () => {
    test('free points are identical for every alpha; joints, derived points and the curve differ', () => {
        const results = ALPHAS.map(alpha => at(alpha));
        results.forEach(s => expect(s.getPoints().map(p => [p.X(), p.Y()])).toEqual(fixture));
        for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) {
            for (let k = 1; k <= 4; k++) expect(dist(joint(results[a], k), joint(results[b], k))).toBeGreaterThan(0.1);
            const da = derived(results[a]), db = derived(results[b]);
            expect(da.some((p, i) => dist(p, db[i]) > 0.1)).toBe(true);
            // same parameter, different point: the curve itself is different, not only the sample positions
            for (const t of [0.25, 0.5, 0.75]) expect(dist([results[a].eval(t).X(), results[a].eval(t).Y()], [results[b].eval(t).X(), results[b].eval(t).Y()])).toBeGreaterThan(0.1);
        }
        // the third joint moves by about 1.25 units between alpha = 0 and alpha = 1
        close(joint(results[0], 3), [-2.133, 0]);
        close(joint(results[1], 3), [-2.845, 0.094]);
        close(joint(results[2], 3), [-3.325, 0.385]);
        expect(dist(joint(results[0], 3), joint(results[2], 3))).toBeCloseTo(1.25, 2);
        expect(Math.max(...[1, 2, 3, 4].map(k => dist(joint(results[0], k), joint(results[2], k))))).toBeCloseTo(dist(joint(results[0], 3), joint(results[2], 3)), 12);
    });

    test('the curve is not the same locus: its points move off the alpha = 0 curve, not along it', () => {
        // sample the alpha = 0 curve densely; the alpha = 1 curve leaves it by more than 0.1 somewhere
        const dense = (s: C2CubicBezierSpline) => Array.from({length: 401}, (_, i) => { const p = s.eval(i / 400); return [p.X(), p.Y()]; });
        const base = dense(at(0)), other = dense(at(1));
        const leave = Math.max(...other.map(p => Math.min(...base.map(q => dist(p, q)))));
        expect(leave).toBeGreaterThan(0.1);
    });
});

describe('ten samples', () => {
    test('the sample parameters exclude the end points and the count is ten', () => {
        const ts = sampleTs(SAMPLES);
        expect(ts).toHaveLength(10);
        expect(ts[0]).toBeCloseTo(1 / 11, 12);
        expect(ts[9]).toBeCloseTo(10 / 11, 12);
        expect(Math.min(...ts)).toBeGreaterThan(0);
        expect(Math.max(...ts)).toBeLessThan(1);
    });

    test('pieces per alpha: 2,2,2,2,2 at alpha = 0 and 1,1,1,4,3 at alpha = 1, away from knot boundaries', () => {
        expect(piecesOfSample(at(0))).toEqual([2, 2, 2, 2, 2]);
        expect(piecesOfSample(at(1))).toEqual([1, 1, 1, 4, 3]);
        expect(knotMargin(at(0))).toBeGreaterThan(0.01);
        expect(knotMargin(at(1))).toBeGreaterThan(0.01);
        expect(piecesOfSample(at(0.5)).reduce((a, b) => a + b, 0)).toBe(10);
    });

    test('largest-to-smallest gap ratio is 5.1, 3.5, 2.9 and decreases with alpha', () => {
        const [r0, r5, r1] = ALPHAS.map(a => gapRatio(at(a)));
        expect(r0.toFixed(1)).toBe('5.1');
        expect(r5.toFixed(1)).toBe('3.5');
        expect(r1.toFixed(1)).toBe('2.9');
        expect(r0).toBeGreaterThan(r5);
        expect(r5).toBeGreaterThan(r1);
    });
});

describe('layout', () => {
    test('every free point, derived point, sample and the whole curve lie inside the view for every alpha', () => {
        const [xmin, ymax, xmax, ymin] = view;
        const inside = (p: Pt, margin = 0.5) => {
            expect(p[0]).toBeGreaterThan(xmin + margin); expect(p[0]).toBeLessThan(xmax - margin);
            expect(p[1]).toBeGreaterThan(ymin + margin); expect(p[1]).toBeLessThan(ymax - margin);
        };
        for (const alpha of ALPHAS) {
            const s = at(alpha);
            [...fixture, ...derived(s), ...samples(s)].forEach(p => inside(p));
            for (let i = 0; i <= 200; i++) inside([s.eval(i / 200).X(), s.eval(i / 200).Y()]);
        }
    });

    test('free points are well separated, so their labels do not overlap', () => {
        let min = Infinity;
        fixture.forEach((p, i) => fixture.slice(i + 1).forEach(q => { min = Math.min(min, dist(p, q)); }));
        expect(min).toBeGreaterThanOrEqual(Math.SQRT2 - 1e-12);
        // view width is 18 units, so the closest labels are at least 7% of the width apart
        expect(min / (view[2] - view[0])).toBeGreaterThan(0.07);
    });
});

describe('prose numbers in both languages', () => {
    const steps = lesson.steps;
    const comma = (s: string) => s.replace('.', '{,}');
    const every = (value: string, texts: {sl: string; en: string}[]) => {
        texts.forEach(t => expect(t.sl).toContain(comma(value)));
        texts.forEach(t => expect(t.en).toContain(value));
    };
    const sl = (value: string) => comma(value);

    test('worked example: chords, totals and spacings', () => {
        const [spacing, junction] = lesson.workedExamples;
        expect(spacing.calculationLatex).toContain('\\sqrt2\\approx1.414');
        expect(spacing.calculationLatex).toContain('\\sqrt{\\tfrac{6409}{100}}\\approx8.006');
        expect(spacing.calculationLatex).toContain('\\approx21.571');
        expect(spacing.resultLatex).toContain('\\tfrac15');
        expect(spacing.resultLatex).toContain('\\approx0.066');
        expect(spacing.resultLatex).toContain('\\approx0.371');
        every('0.066', [spacing.check]); every('0.371', [spacing.check]);
        expect(spacing.check.sl).toContain('\\tfrac15');
        expect(junction.calculationLatex).toContain('(-2.133,\\,0)');
        expect(junction.calculationLatex).toContain('(-2.845,\\,0.094)');
        expect(junction.calculationLatex).toContain('(-3.325,\\,0.385)');
        expect(junction.resultLatex).toBe('\\lVert J_3(1)-J_3(0)\\rVert\\approx1.25');
        every('1.25', [junction.check]);
    });

    test('steps state the verified counts, ratios, pieces and joint', () => {
        every('10', [steps[0].explanation]);
        expect(steps[0].explanation.sl).toContain('\\(8\\) prostih točk');
        expect(steps[0].explanation.sl).toContain('\\(5\\) odsekov');
        expect(steps[0].explanation.en).toContain('\\(8\\) free points');
        expect(steps[0].explanation.en).toContain('\\(5\\) pieces');
        expect(steps[0].explanation.sl).toContain('\\tfrac{k}{11}');
        expect(steps[0].explanation.en).toContain('\\tfrac{k}{11}');
        expect(steps[0].expectedObservations[0].sl).toContain(sl('3.5'));
        expect(steps[0].expectedObservations[0].en).toContain('3.5');
        for (const field of [steps[1].explanation]) { every('1.414', [field]); every('8.006', [field]); every('0.066', [field]); every('0.371', [field]); expect(field.sl).toContain('\\tfrac15'); expect(field.en).toContain('\\tfrac15'); }
        expect(steps[2].explanation.sl).toContain('\\(2,2,2,2,2\\) od \\(10\\)');
        expect(steps[2].explanation.en).toContain('\\(2,2,2,2,2\\) out of \\(10\\)');
        expect(steps[2].explanation.sl).toContain('(-2{,}133;\\ 0)');
        expect(steps[2].explanation.en).toContain('(-2.133,\\ 0)');
        every('5.1', [steps[2].expectedObservations[0]]);
        expect(steps[3].explanation.sl).toContain('\\(1,1,1,4,3\\) od \\(10\\)');
        expect(steps[3].explanation.en).toContain('\\(1,1,1,4,3\\) out of \\(10\\)');
        expect(steps[3].explanation.sl).toContain('(-3{,}325;\\ 0{,}385)');
        expect(steps[3].explanation.en).toContain('(-3.325,\\ 0.385)');
        every('1.25', [steps[3].expectedObservations[0]]);
        every('2.9', [steps[3].expectedObservations[0]]);
        every('5.1', [steps[4].explanation]); every('3.5', [steps[4].explanation]); every('2.9', [steps[4].explanation]);
    });

    test('the lesson explains that the spline itself changes and does not conflate this with one fixed Bézier locus', () => {
        const { summary } = lesson;
        expect(summary.sl).toContain('ponovno parametriziranje ene same Bézierjeve krivulje');
        expect(summary.en).toContain('reparameterization of one fixed Bézier curve');
        expect(steps[3].explanation.en).toContain('the shape of the spline changes too');
        expect(steps[4].explanation.en).toContain('on a spline it also moves the derived points');
        expect(steps[4].explanation.sl).toContain('pri zlepku premakne tudi izpeljane točke');
    });

    test('no number of the previous 25-sample, nine-point scenes is left in the steps or examples', () => {
        const json = JSON.stringify([lesson.steps, lesson.workedExamples, lesson.formulaBlocks, lesson.learningGoals]);
        ['1{,}581', '8{,}078', '19{,}380', '0{,}92', '4,4,4,5,4,4', '2,5,3,3,2,10', '5{,}7', '\\\\(25\\\\) vzor', '\\\\(25\\\\) sample', '1.581', '8.078', '19.380'].forEach(old => expect(json).not.toContain(old));
    });
});
