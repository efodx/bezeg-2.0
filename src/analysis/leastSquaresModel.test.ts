import {designMatrix} from './leastSquares';
import {
    addLsqPoint, changeLsqDegree, checkLeastSquaresModel, DEFAULT_LEAST_SQUARES_MODEL, leastSquaresFit, leastSquaresView, LeastSquaresModel,
    LSQ_POINTS_MAX, lsqDegreeMax, moveLsqPoint, normalEquations, parseLeastSquaresModel, removeLsqPoint, setLsqLine,
} from './leastSquaresModel';

const model = (patch: Partial<LeastSquaresModel> = {}): LeastSquaresModel => ({...DEFAULT_LEAST_SQUARES_MODEL, ...patch});
const near = (actual: readonly number[], expected: readonly number[], tolerance = 1e-9) => {
    expect(actual).toHaveLength(expected.length);
    expected.forEach((value, i) => expect(Math.abs(actual[i] - value), `index ${i}: ${actual[i]} vs ${value}`).toBeLessThanOrEqual(tolerance));
};
const fitOf = (m: LeastSquaresModel) => {
    const view = leastSquaresView(m);
    if (!view.fit.ok) throw new Error('no fit');
    return view.fit.fit;
};

describe('the spec defaults (I4)', () => {
    test('the data are (0,1), (1,2), (2,2), (3,4); degree 1; fit mode', () => {
        expect(DEFAULT_LEAST_SQUARES_MODEL).toMatchObject({points: [[0, 1], [1, 2], [2, 2], [3, 4]], degree: 1, manualLine: false});
    });

    test('degree 1: y = 0.9x + 0.9, residuals 0.1, 0.2, -0.7, 0.4, sum of squares 0.7', () => {
        const fit = fitOf(model());
        near(fit.coefficients, [0.9, 0.9]);
        near(fit.residuals, [0.1, 0.2, -0.7, 0.4]);
        expect(fit.residuals.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 12);
        expect(fit.residualSumOfSquares).toBeCloseTo(0.7, 12);
    });

    test('degree 2: y = 1.15 + 0.15x + 0.25x^2, sum of squares 0.45', () => {
        const fit = fitOf(model({degree: 2}));
        near(fit.coefficients, [1.15, 0.15, 0.25]);
        expect(fit.residualSumOfSquares).toBeCloseTo(0.45, 12);
    });

    test('degree 3: y = 1 + 2.5x - 2x^2 + 0.5x^3 through all four points, sum of squares ~ 0', () => {
        const fit = fitOf(model({degree: 3}));
        near(fit.coefficients, [1, 2.5, -2, 0.5]);
        expect(fit.residualSumOfSquares).toBeLessThan(1e-20);
    });

    test('moving (3,4) to (3,8) at degree 1: y = 2.1x + 0.1, sum of squares 8.7', () => {
        const moved = moveLsqPoint(model(), 3, [3, 8]);
        if (!moved.ok) throw new Error('refused');
        const fit = fitOf(moved.model);
        near(fit.coefficients, [0.1, 2.1]);
        expect(fit.residualSumOfSquares).toBeCloseTo(8.7, 12);
    });
});

describe('orthogonality and the normal equations', () => {
    test.each([1, 2, 3])('degree %i: the residuals the view draws are orthogonal to every design-matrix column (|inner product| <= 1e-10)', degree => {
        const m = model({degree});
        const design = designMatrix(m.points.map(p => p[0]), degree);
        const residuals = leastSquaresView(m).residuals;
        for (let k = 0; k <= degree; k++) {
            expect(Math.abs(design.reduce((s, row, i) => s + row[k] * residuals[i], 0)), `column ${k}`).toBeLessThanOrEqual(1e-10);
        }
    });

    test.each([1, 2, 3])('degree %i: the residual vector is orthogonal to every design-matrix column (|inner product| <= 1e-10)', degree => {
        const m = model({degree});
        const fit = fitOf(m);
        const design = designMatrix(m.points.map(p => p[0]), degree);
        for (let k = 0; k <= degree; k++) {
            const inner = design.reduce((s, row, i) => s + row[k] * fit.residuals[i], 0);
            expect(Math.abs(inner), `column ${k}`).toBeLessThanOrEqual(1e-10);
        }
    });

    /** Gaussian elimination with partial pivoting, independent of the kernel's QR. */
    const gauss = (a: readonly (readonly number[])[], b: readonly number[]): number[] => {
        const n = b.length;
        const m = a.map((row, i) => [...row, b[i]]);
        for (let c = 0; c < n; c++) {
            let pivot = c;
            for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
            [m[c], m[pivot]] = [m[pivot], m[c]];
            for (let r = c + 1; r < n; r++) {
                const f = m[r][c] / m[c][c];
                for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
            }
        }
        const x = new Array<number>(n).fill(0);
        for (let r = n - 1; r >= 0; r--) {
            let s = m[r][n];
            for (let k = r + 1; k < n; k++) s -= m[r][k] * x[k];
            x[r] = s / m[r][r];
        }
        return x;
    };

    test.each([1, 2])('degree %i: the displayed system A^T A c = A^T y has the numbers of the fit and its solution is the QR coefficients', degree => {
        const fit = fitOf(model({degree}));
        const shown = normalEquations(fit)!;
        expect(shown).toBeDefined();
        if (degree === 1) {
            expect(shown.matrix).toEqual([[4, 6], [6, 14]]);
            expect(shown.rhs).toEqual([9, 18]);
        }
        near(gauss(shown.matrix, shown.rhs), fit.coefficients, 1e-9);
        near(shown.coefficients, fit.coefficients, 0);
    });

    test('the normal equations are displayed for degree 1 and 2 only', () => {
        expect(normalEquations(fitOf(model({degree: 3})))).toBeUndefined();
    });
});

describe('degree rule and fit availability', () => {
    test('the degree range is 1..min(points - 1, 5)', () => {
        expect(lsqDegreeMax(2)).toBe(1);
        expect(lsqDegreeMax(4)).toBe(3);
        expect(lsqDegreeMax(6)).toBe(5);
        expect(lsqDegreeMax(12)).toBe(5);
    });

    test('a degree >= points is refused by an edit and by a file', () => {
        expect(changeLsqDegree(model(), 4)).toEqual({ok: false, issue: {kind: 'degree', min: 1, max: 3}});
        expect(changeLsqDegree(model(), 0).ok).toBe(false);
        expect(changeLsqDegree(model(), 2.5).ok).toBe(false);
        expect(checkLeastSquaresModel({...model(), degree: 4})).toEqual({ok: false, issue: {kind: 'degree', min: 1, max: 3}});
        expect(checkLeastSquaresModel({...model(), degree: 3}).ok).toBe(true);
    });

    test('the kernel flags the underdetermined fit; the model never holds one', () => {
        expect(leastSquaresFit(model().points, 4)).toEqual({ok: false, reason: 'underdetermined'});
    });

    test('removing a point clamps the degree to points - 1, down to 2 points and degree 1', () => {
        let m = model({degree: 3});
        for (const [points, degree] of [[3, 2], [2, 1]]) {
            const removed = removeLsqPoint(m);
            if (!removed.ok) throw new Error('refused');
            m = removed.model;
            expect(m.points).toHaveLength(points);
            expect(m.degree).toBe(degree);
            expect(leastSquaresView(m).fit.ok).toBe(true);
        }
        expect(removeLsqPoint(m)).toEqual({ok: false, issue: {kind: 'points', min: 2, max: 12}});
    });

    test('adding points stops at the maximum', () => {
        let m = model();
        while (m.points.length < LSQ_POINTS_MAX) {
            const added = addLsqPoint(m);
            if (!added.ok) throw new Error('refused');
            m = added.model;
        }
        expect(addLsqPoint(m).ok).toBe(false);
        expect(new Set(m.points.map(p => p[0])).size).toBe(LSQ_POINTS_MAX);
    });

    test('all-equal x (vertical data) has no fit and a reason; fewer than 2 points have none either', () => {
        const vertical = model({points: [[1, 0], [1, 1], [1, 2]], degree: 1});
        expect(leastSquaresView(vertical).fit).toEqual({ok: false, reason: 'vertical'});
        expect(leastSquaresView(vertical).drawn).toBeUndefined();
        expect(leastSquaresView(vertical).sumOfSquares).toBeUndefined();
        expect(leastSquaresFit([[0, 0]], 1)).toEqual({ok: false, reason: 'too-few'});
        expect(leastSquaresFit([], 1)).toEqual({ok: false, reason: 'too-few'});
    });

    test('too few distinct x for the degree is flagged rank deficient, not thrown', () => {
        expect(leastSquaresFit([[0, 0], [0, 1], [1, 2]], 2)).toEqual({ok: false, reason: 'rank'});
    });

    test('dragging every point onto one x keeps the model valid and removes the curve', () => {
        const a = moveLsqPoint(model(), 1, [0, 2]);
        const b = a.ok ? moveLsqPoint(a.model, 2, [0, 3]) : a;
        const c = b.ok ? moveLsqPoint(b.model, 3, [0, 4]) : b;
        if (!c.ok) throw new Error('refused');
        expect(leastSquaresView(c.model).fit).toEqual({ok: false, reason: 'vertical'});
    });
});

describe('manual line', () => {
    test('the sum of squares of the manual line comes from the kernel and is shown beside the optimal 0.7', () => {
        const view = leastSquaresView(model({manualLine: true, slope: 1, intercept: 1}));
        // residuals of y = x + 1: 0, 0, -1, 0
        near(view.residuals, [0, 0, -1, 0]);
        expect(view.sumOfSquares).toBeCloseTo(1, 12);
        expect(view.optimalSumOfSquares).toBeCloseTo(0.7, 12);
        expect(view.drawn).toEqual([1, 1]);
    });

    test('at the best line the manual sum equals the optimum, and any other line is larger', () => {
        const best = leastSquaresView(model({manualLine: true, slope: 0.9, intercept: 0.9}));
        expect(best.sumOfSquares).toBeCloseTo(best.optimalSumOfSquares!, 12);
        for (const [slope, intercept] of [[0.95, 0.9], [0.9, 0.8], [0, 0]]) {
            expect(leastSquaresView(model({manualLine: true, slope, intercept})).sumOfSquares!).toBeGreaterThan(0.7);
        }
    });

    test('slope and intercept are limited', () => {
        expect(setLsqLine(model(), 'slope', 11).ok).toBe(false);
        expect(setLsqLine(model(), 'intercept', Number.NaN).ok).toBe(false);
        expect(setLsqLine(model(), 'slope', 2)).toMatchObject({ok: true, model: {slope: 2}});
    });
});

describe('the validity rule of a stored model', () => {
    const valid = {...model(), points: [[0, 1], [1, 2], [2, 2], [3, 4]]};

    test('a valid model is accepted and unknown properties are dropped', () => {
        expect(parseLeastSquaresModel({...valid, extra: 1})).toEqual(model());
    });

    test.each([
        [{...valid, points: [[0, 1]]}, {kind: 'points', min: 2, max: 12}],
        [{...valid, points: 'x'}, {kind: 'points', min: 2, max: 12}],
        [{...valid, points: Array.from({length: 13}, (_, i) => [i, i])}, {kind: 'points', min: 2, max: 12}],
        [{...valid, points: [[0, 1], [1, 'a'], [2, 2]]}, {kind: 'coordinate', index: 1, limit: 20}],
        [{...valid, points: [[0, 1], [1, 2], [21, 2]]}, {kind: 'coordinate', index: 2, limit: 20}],
        [{...valid, points: [[0, 1], [1, 2, 3], [2, 2]]}, {kind: 'coordinate', index: 1, limit: 20}],
        [{...valid, degree: 0}, {kind: 'degree', min: 1, max: 3}],
        [{...valid, degree: '1'}, {kind: 'degree', min: 1, max: 3}],
        [{...valid, slope: 11}, {kind: 'line', field: 'slope', limit: 10}],
        [{...valid, intercept: null}, {kind: 'line', field: 'intercept', limit: 20}],
        [{...valid, manualLine: 1}, {kind: 'flag', field: 'manualLine'}],
        [{...valid, showSquares: 'yes'}, {kind: 'flag', field: 'showSquares'}],
        [{...valid, showNormalEquations: undefined}, {kind: 'flag', field: 'showNormalEquations'}],
    ])('rejects %j with %j', (data, issue) => {
        expect(checkLeastSquaresModel(data)).toEqual({ok: false, issue});
        expect(parseLeastSquaresModel(data)).toBeUndefined();
    });

    test('a non-object is rejected without an issue', () => {
        expect(checkLeastSquaresModel(null)).toEqual({ok: false, issue: undefined});
        expect(checkLeastSquaresModel([])).toEqual({ok: false, issue: undefined});
    });
});
