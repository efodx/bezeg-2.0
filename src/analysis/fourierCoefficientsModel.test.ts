import {
    changeFourierDecayN, changeFourierK, checkFourierCoefficientsModel, chooseFourierLayout, chooseFourierScale, chooseFourierSelections, chooseFourierView,
    DEFAULT_FOURIER_COEFFICIENTS_MODEL, FOURIER_COEFFICIENTS_LAYOUTS, FourierCoefficientsIssue, FourierCoefficientsModel, fourierDefaultValues, fourierPartialSumAt,
    fourierProductPolygons, fourierProjection, fourierSeamMidpoint, fourierShape, fourierSlots, parseFourierCoefficientsModel, selectFourierCoefficient,
    setFourierOverlay, setFourierValue, snapFourierValue,
} from './fourierCoefficientsModel';

const valid = DEFAULT_FOURIER_COEFFICIENTS_MODEL;
const PI = Math.PI;

const issueOf = (data: unknown) => {
    const check = checkFourierCoefficientsModel(data);
    return check.ok ? 'ok' : check.issue;
};
const kindOf = (data: unknown) => {
    const issue = issueOf(data);
    return issue === 'ok' ? 'ok' : issue?.kind;
};
const jumpModel: FourierCoefficientsModel = {...valid, layout: 'jump', values: fourierDefaultValues('jump'), selected: {term: 'b', k: 1}};

/** Absolute shoelace area of a closed polygon. */
function shoelace(p: { x: number[]; y: number[] }): number {
    let s = 0;
    for (let i = 0; i + 1 < p.x.length; i++) s += p.x[i] * p.y[i + 1] - p.x[i + 1] * p.y[i];
    return Math.abs(s) / 2;
}

describe('defaults and round trip', () => {
    test('the default model is valid, projection view, abs layout, K 16, a_1, overlay on', () => {
        expect(checkFourierCoefficientsModel(valid)).toEqual({ok: true, model: valid});
        expect(valid).toMatchObject({view: 'projection', layout: 'abs', K: 16, selected: {term: 'a', k: 1}, overlay: true, n: 11, scale: 'linear'});
        expect(valid.selections).toEqual(['square', 'abs', 'smooth']);
        expect(valid.values).toEqual([PI, 0]);
    });

    test('every layout has a default value per slot', () => {
        for (const layout of FOURIER_COEFFICIENTS_LAYOUTS) expect(fourierDefaultValues(layout)).toHaveLength(fourierSlots(layout).length);
    });

    test('check then parse round trips every layout and drops unknown properties', () => {
        for (const layout of FOURIER_COEFFICIENTS_LAYOUTS) {
            const model: FourierCoefficientsModel = {...valid, layout, values: fourierDefaultValues(layout), view: 'decay', scale: 'log', n: 101, overlay: false};
            const stored = JSON.parse(JSON.stringify(model));
            expect(parseFourierCoefficientsModel(stored)).toEqual(model);
            expect(parseFourierCoefficientsModel({...stored, extra: 1})).toEqual(model);
        }
    });

    test('an exact pi value survives an import', () => {
        expect(parseFourierCoefficientsModel({...valid, values: [PI, 0]})?.values[0]).toBe(PI);
    });
});

describe('every rejection reason', () => {
    const reasons: Array<[FourierCoefficientsIssue['kind'], unknown]> = [
        ['view', {...valid, view: 'x'}],
        ['layout', {...valid, layout: 'x'}],
        ['values-count', {...valid, values: [1]}],
        ['value', {...valid, values: [5, 0]}],
        ['k', {...valid, K: 33}],
        ['term', {...valid, selected: {term: 'c', k: 1}}],
        ['harmonic', {...valid, selected: {term: 'a', k: 17}}],
        ['no-b0', {...valid, selected: {term: 'b', k: 0}}],
        ['overlay', {...valid, overlay: 'yes'}],
        ['selections', {...valid, selections: ['square', 'abs', 'nope']}],
        ['selections-distinct', {...valid, selections: ['square', 'square', 'abs']}],
        ['n', {...valid, n: 102}],
        ['scale', {...valid, scale: 'sqrt'}],
    ];
    test.each(reasons)('the import reason %s', (kind, data) => {
        expect(kindOf(data)).toBe(kind);
    });

    test('the edit-only reasons: handle and k-below-selected', () => {
        expect(setFourierValue(valid, 2, 1)).toEqual({ok: false, issue: {kind: 'handle', count: 2}});
        expect(setFourierValue(valid, 0.5, 1)).toMatchObject({ok: false, issue: {kind: 'handle'}});
        const selected = selectFourierCoefficient(valid, 'a', 10);
        expect(selected.ok).toBe(true);
        if (selected.ok) expect(changeFourierK(selected.model, 5)).toEqual({ok: false, issue: {kind: 'k-below-selected', selected: 10}});
    });

    test('wrong types and missing fields give the generic issue', () => {
        for (const data of [null, 3, 'x', []]) expect(issueOf(data)).toBeUndefined();
        for (const data of [{...valid, values: 'x'}, {...valid, values: [PI, 'x']}, {...valid, K: '16'}, {...valid, selected: 1}, {...valid, selected: {term: 'a'}}, {...valid, n: '11'}]) {
            expect(issueOf(data)).toBeUndefined();
        }
        const {scale: _scale, ...missing} = valid;
        expect(kindOf(missing)).toBe('scale');
    });

    test('every kind of the union is covered by the tests above', () => {
        const covered = new Set([...reasons.map(([kind]) => kind), 'handle', 'k-below-selected']);
        expect(covered.size).toBe(15);
    });
});

describe('out-of-range and non-finite values are rejected, never clamped', () => {
    test('import', () => {
        for (const bad of [4.0001, -4.0001, NaN, Infinity, -Infinity]) expect(parseFourierCoefficientsModel({...valid, values: [bad, 0]})).toBeUndefined();
        for (const ok of [4, -4, 0.123456, 3.14159]) expect(parseFourierCoefficientsModel({...valid, values: [ok, 0]})?.values[0]).toBe(ok);
        for (const bad of [0, 1.5, NaN, Infinity, 33]) expect(parseFourierCoefficientsModel({...valid, K: bad})).toBeUndefined();
        for (const bad of [0, 2.5, NaN, 102]) expect(parseFourierCoefficientsModel({...valid, n: bad})).toBeUndefined();
        expect(parseFourierCoefficientsModel({...valid, selected: {term: 'a', k: 1.5}})).toBeUndefined();
        expect(parseFourierCoefficientsModel({...valid, selected: {term: 'a', k: -1}})).toBeUndefined();
    });

    test('edits return a reason and leave the model alone', () => {
        for (const bad of [4.01, -4.01, NaN, Infinity, '1', undefined]) expect(setFourierValue(valid, 0, bad)).toEqual({ok: false, issue: {kind: 'value', min: -4, max: 4}});
        expect(setFourierValue(valid, 0, 3.14159)).toMatchObject({ok: true, model: {values: [3.14159, 0]}});
        for (const bad of [0, 33, 8.5, NaN]) expect(changeFourierK(valid, bad)).toMatchObject({ok: false, issue: {kind: 'k'}});
        for (const bad of [0, 102, 4.5, NaN]) expect(changeFourierDecayN(valid, bad)).toMatchObject({ok: false, issue: {kind: 'n'}});
        expect(selectFourierCoefficient(valid, 'a', 17)).toMatchObject({ok: false, issue: {kind: 'harmonic'}});
        expect(selectFourierCoefficient(valid, 'a', NaN)).toMatchObject({ok: false, issue: {kind: 'harmonic'}});
    });

    test('valid edits, identity on no change, and layout choice resets values', () => {
        expect(setFourierOverlay(valid, true)).toEqual({ok: true, model: valid});
        expect(setFourierOverlay(valid, 1)).toMatchObject({ok: false});
        expect(chooseFourierView(valid, 'decay')).toMatchObject({ok: true, model: {view: 'decay'}});
        expect(chooseFourierView(valid, 'x')).toMatchObject({ok: false});
        expect(chooseFourierScale(valid, 'log')).toMatchObject({ok: true, model: {scale: 'log'}});
        expect(chooseFourierSelections(valid, ['abs', 'square', 'smooth'])).toMatchObject({ok: true});
        expect(chooseFourierSelections(valid, ['abs', 'abs', 'smooth'])).toMatchObject({ok: false, issue: {kind: 'selections-distinct'}});
        expect(changeFourierDecayN(valid, 101)).toMatchObject({ok: true, model: {n: 101}});
        const edited = setFourierValue(valid, 1, 1);
        expect(edited.ok && edited.model.values).toEqual([PI, 1]);
        const same = chooseFourierLayout(valid, 'abs');
        expect(same.ok && same.model).toBe(valid);
        const changed = chooseFourierLayout(edited.ok ? edited.model : valid, 'jump');
        expect(changed.ok && changed.model.values).toEqual(fourierDefaultValues('jump'));
    });
});

describe('snapFourierValue', () => {
    test('snaps to 0.05, clamps the drag to the range, and never returns negative zero', () => {
        expect(snapFourierValue(0.12)).toBe(0.1);
        expect(snapFourierValue(0.13)).toBe(0.15);
        expect(snapFourierValue(PI)).toBe(3.15);
        expect(snapFourierValue(9)).toBe(4);
        expect(snapFourierValue(-9)).toBe(-4);
        expect(Object.is(snapFourierValue(-0.01), 0)).toBe(true);
    });
});

describe('exact coefficients of the default shapes', () => {
    test('abs: a_0/2 = pi/2, a_1 = -4/pi, a_2 = 0, a_3, a_5, all b_k = 0', () => {
        const {coefficients: c, selectedValue, squareIntegral} = fourierProjection(valid);
        expect(c.a[0] / 2).toBeCloseTo(PI / 2, 9);
        expect(c.a[1]).toBeCloseTo(-4 / PI, 9);
        expect(c.a[1]).toBeCloseTo(-1.27324, 5);
        expect(c.a[2]).toBeCloseTo(0, 9);
        expect(c.a[3]).toBeCloseTo(-4 / (9 * PI), 9);
        expect(c.a[3]).toBeCloseTo(-0.141471, 6);
        expect(c.a[5]).toBeCloseTo(-4 / (25 * PI), 9);
        expect(c.a[5]).toBeCloseTo(-0.05093, 5);
        for (let k = 0; k <= 16; k++) expect(c.b[k]).toBeCloseTo(0, 9);
        expect(selectedValue).toBe(c.a[1]);
        expect(squareIntegral).toBeCloseTo((2 * PI * PI) / 3, 9);
    });

    test('jump: b_1, b_2, b_5 of sign(x - 1)', () => {
        const {coefficients: c, selectedValue} = fourierProjection(jumpModel);
        expect(c.b[1]).toBeCloseTo(0.9805869033, 9);
        expect(c.b[2]).toBeCloseTo(-0.4507735384, 9);
        expect(c.b[5]).toBeCloseTo(0.1634409457, 9);
        expect(selectedValue).toBe(c.b[1]);
    });
});

describe('seam midpoint', () => {
    test('a seam-jump layout shows the midpoint of the one-sided limits', () => {
        expect(fourierSeamMidpoint(fourierShape('jump', fourierDefaultValues('jump')))).toBe(0);
        const model = {...valid, layout: 'free' as const, values: [1, 0, 0, 0, 3]};
        expect(fourierProjection(model).seamMidpoint).toBe(2);
    });

    test('abs shows the shared value at both ends', () => {
        const shape = fourierShape('abs', [2, 0]);
        expect(fourierSeamMidpoint(shape)).toBe(2);
        expect(shape.left[2]).toBe(2);
        expect(shape.right[0]).toBe(2);
    });
});

describe('decay fields', () => {
    test('n and scale are validated, duplicates rejected, three ids required', () => {
        expect(kindOf({...valid, n: 1})).toBe('ok');
        expect(kindOf({...valid, n: 0})).toBe('n');
        expect(kindOf({...valid, scale: 'log'})).toBe('ok');
        expect(kindOf({...valid, scale: 'LOG'})).toBe('scale');
        expect(kindOf({...valid, selections: ['square', 'abs']})).toBe('selections');
        expect(kindOf({...valid, selections: ['square', 'abs', 'smooth', 'sawtooth']})).toBe('selections');
        expect(kindOf({...valid, selections: ['abs', 'smooth', 'abs']})).toBe('selections-distinct');
    });
});

describe('b_0', () => {
    test('b_0 is rejected on import and on selection; a_0 is allowed', () => {
        expect(selectFourierCoefficient(valid, 'b', 0)).toEqual({ok: false, issue: {kind: 'no-b0'}});
        expect(selectFourierCoefficient(valid, 'a', 0)).toMatchObject({ok: true});
        expect(parseFourierCoefficientsModel({...valid, selected: {term: 'b', k: 0}})).toBeUndefined();
    });
});

describe('products and partial sums', () => {
    test('the signed area of the product polygons is pi times the coefficient (a and b)', () => {
        for (const [model, term, k] of [[valid, 'a', 1], [jumpModel, 'b', 1]] as const) {
            const {shape, coefficients} = fourierProjection(model);
            const polygons = fourierProductPolygons(shape, term, k);
            const exact = PI * (term === 'a' ? coefficients.a[k] : coefficients.b[k]);
            expect(shoelace(polygons.positive) - shoelace(polygons.negative)).toBeCloseTo(polygons.area, 9);
            expect(Math.abs(polygons.area - exact)).toBeLessThan(0.02 * Math.abs(exact));
        }
    });

    test('the partial sum at a point matches the direct sum', () => {
        const model = {...jumpModel, K: 7};
        const {coefficients: c} = fourierProjection(model);
        for (const x of [-2.5, -0.3, 0.7, 2]) {
            let direct = c.a[0] / 2;
            for (let k = 1; k <= 7; k++) direct += c.a[k] * Math.cos(k * x) + c.b[k] * Math.sin(k * x);
            expect(fourierPartialSumAt(c, 7, x)).toBeCloseTo(direct, 12);
        }
    });
});
