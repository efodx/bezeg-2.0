import {
    evaluatePolePolar, isLineAtInfinity, matchesExample, NUMERICAL_TOLERANCE, parsePolePolarModel, POLE_POLAR_CONIC_IDS, POLE_POLAR_CONICS, POLE_POLAR_DENOMINATOR,
    POLE_POLAR_EXAMPLE_IDS, POLE_POLAR_EXAMPLES, POLE_POLAR_NUMERATOR_LIMIT, POLE_POLAR_VIEW_BOX, PolePolarModel, pointOf, pointText, serializePolePolarModel,
} from './polePolarModel';
import {moveP, nudgeP, setConic, setDirection, setNumerators} from './polePolarEdit';
import {describePolePolar, exactEquation, numericalEquation} from './polePolarText';
import {classify, conic, evaluate, polar, pole, side, tangentPoints} from '../../projective/conic';
import {equal, Hom, lineAtInfinity, toAffine} from '../../projective/homogeneous';
import {conicPolyline} from './PolePolarGraph';
import {renderMessage, setLanguage, t} from '../../localization';

beforeEach(() => setLanguage('sl'));

const dot = (l: Hom, p: Hom): bigint => l[0] * p[0] + l[1] * p[1] + l[2] * p[2];
const model = (patch: Partial<PolePolarModel>): PolePolarModel => ({...POLE_POLAR_EXAMPLES.default, example: 'custom', ...patch});
const fraction = (f: {num: bigint; den: bigint}) => `${f.num}/${f.den}`;
const finite = (p: Hom) => {
    const a = toAffine(p);
    if (a.kind !== 'finite') throw new Error('ideal');
    return [fraction(a.x), fraction(a.y)];
};

test('the four conic ids classify as ellipse, circle, parabola and hyperbola', () => {
    expect(POLE_POLAR_CONIC_IDS.map(id => classify(POLE_POLAR_CONICS[id]))).toEqual(['ellipse', 'circle', 'parabola', 'hyperbola']);
    expect(POLE_POLAR_CONICS.ellipse).toEqual(conic(9, 0, 25, 0, 0, -225));
});

test('acceptance 1: the default values are exact through polar, pole and tangentPoints', () => {
    const scene = evaluatePolePolar(POLE_POLAR_EXAMPLES.default);
    const c = POLE_POLAR_CONICS.ellipse;
    const p = pointOf(POLE_POLAR_EXAMPLES.default);
    expect(finite(p)).toEqual(['1/1', '21/5']);
    expect(scene.side).toBe('outside');
    expect(side(c, p)).toBe('outside');
    // the polar is x/25 + 7y/15 = 1, that is 3x + 35y - 75 = 0 (up to the sign of the triple)
    const line = polar(c, p);
    expect(line.status === 'ok' && equal(line.line, [3n, 35n, -75n])).toBe(true);
    expect(exactEquation(scene.polar!)).toBe('3x + 35y − 75 = 0');
    // the pole of that polar is P again
    const back = pole(c, scene.polar!);
    expect(back.status === 'ok' && equal(back.point, p)).toBe(true);
    const found = tangentPoints(c, p);
    expect(found.status).toBe('outside');
    expect(scene.tangency).toHaveLength(2);
    const touch = scene.tangency.map(point => point.exact ? finite(point.point) : undefined);
    expect(touch).toEqual(expect.arrayContaining([['4/1', '9/5'], ['-3/1', '12/5']]));
    // tangent lines 4x/25 + y/5 = 1 and -3x/25 + 4y/15 = 1 (4x + 5y - 25 = 0 and -9x + 20y - 75 = 0)
    const lines = scene.tangents.map(tangent => tangent.exact ? tangent.line : undefined);
    expect(lines.some(l => l !== undefined && equal(l, [4n, 5n, -25n]))).toBe(true);
    expect(lines.some(l => l !== undefined && equal(l, [-9n, 20n, -75n]))).toBe(true);
    expect(scene.tangents.map(tangent => tangent.exact ? exactEquation(tangent.line) : '').sort()).toEqual(['4x + 5y − 25 = 0', '9x − 20y + 75 = 0']);
    expect(scene.numerical).toBe(false);
});

test('acceptance 2: for grid points with rational tangency both residuals are exactly 0; an irrational one is flagged numerical', () => {
    let rational = 0;
    let irrational: PolePolarModel | undefined;
    for (let x = -POLE_POLAR_NUMERATOR_LIMIT; x <= POLE_POLAR_NUMERATOR_LIMIT; x += 1) {
        for (let y = -POLE_POLAR_NUMERATOR_LIMIT; y <= POLE_POLAR_NUMERATOR_LIMIT; y += 1) {
            const m = model({p: {x, y}});
            const scene = evaluatePolePolar(m);
            if (scene.side !== 'outside') continue;
            if (scene.numerical) {
                irrational ??= m;
                continue;
            }
            if (scene.tangency.length !== 2) continue;
            rational++;
            scene.tangency.forEach((point, i) => {
                if (!point.exact) throw new Error('exact expected');
                const tangent = scene.tangents[i];
                if (!tangent.exact) throw new Error('exact expected');
                expect(dot(scene.polar!, point.point)).toBe(0n);
                expect(evaluate(scene.conic, point.point)).toBe(0n);
                expect(dot(tangent.line, scene.p)).toBe(0n);
                expect(dot(tangent.line, point.point)).toBe(0n);
            });
        }
    }
    expect(rational).toBeGreaterThan(3);
    expect(irrational).toBeDefined();
    const scene = evaluatePolePolar(irrational!);
    expect(scene.numerical).toBe(true);
    expect(scene.side).toBe('outside');
    const text = describePolePolar(scene, t, 'en');
    expect(text.numerical).toContain('10⁻⁹');
    expect(String(NUMERICAL_TOLERANCE)).toBe('1e-9');
    expect(text.tangency[0]).toMatch(/\(-?\d|\(−?\d/);
    expect(text.tangents[0]).toMatch(/\d\.\d/);
    // decimal tangent lines pass through P within the tolerance
    for (const tangent of scene.tangents) {
        if (tangent.exact) throw new Error('numerical expected');
        const [a, b, c] = tangent.coefficients;
        const p = scene.p.map(Number);
        expect(Math.abs((a * p[0] + b * p[1] + c * p[2]) / Math.hypot(a, b) / p[2])).toBeLessThan(1e-6);
    }
});

test('acceptance 3: inside, on and outside are exact, including a point exactly on the conic', () => {
    const region = (m: PolePolarModel) => evaluatePolePolar(m).side;
    expect(region(POLE_POLAR_EXAMPLES.on)).toBe('on');
    expect(region(POLE_POLAR_EXAMPLES.inside)).toBe('inside');
    expect(region(POLE_POLAR_EXAMPLES.default)).toBe('outside');
    // circle: (3, 4) is on, (3, 4.2) outside, (3, 3.8) inside
    expect(region(model({conic: 'circle', p: {x: 15, y: 20}}))).toBe('on');
    expect(region(model({conic: 'circle', p: {x: 15, y: 21}}))).toBe('outside');
    expect(region(model({conic: 'circle', p: {x: 15, y: 19}}))).toBe('inside');
    // a parabola point (2, 1) is on x^2 = 4y; (0, 1/5) is inside (above the vertex), (0, -1/5) is outside
    expect(region(model({conic: 'parabola', p: {x: 10, y: 5}}))).toBe('on');
    expect(region(model({conic: 'parabola', p: {x: 0, y: 1}}))).toBe('inside');
    expect(region(model({conic: 'parabola', p: {x: 0, y: -1}}))).toBe('outside');
    // hyperbola 9x^2 - 16y^2 = 144: (4, 0) is on, the centre is between the branches (outside)
    expect(region(model({conic: 'hyperbola', p: {x: 20, y: 0}}))).toBe('on');
    expect(region(model({conic: 'hyperbola', p: {x: 0, y: 0}}))).toBe('outside');
    expect(region(model({conic: 'hyperbola', p: {x: 25, y: 0}}))).toBe('inside');
    // on: one marker, and the polar is the tangent at P
    const on = evaluatePolePolar(POLE_POLAR_EXAMPLES.on);
    expect(on.tangency).toHaveLength(1);
    expect(on.tangents).toHaveLength(1);
    expect(on.tangency[0].exact && finite(on.tangency[0].point)).toEqual(['4/1', '9/5']);
    expect(exactEquation(on.polar!)).toBe('4x + 5y − 25 = 0');
    // inside: no tangents, and the polar misses the conic
    const inside = evaluatePolePolar(POLE_POLAR_EXAMPLES.inside);
    expect(inside.tangency).toEqual([]);
    expect(inside.tangents).toEqual([]);
    expect(describePolePolar(inside, t, 'sl').tangents).toEqual([]);
});

test('acceptance 4: an ideal P has a polar through the centre; the pole of the line at infinity is the centre', () => {
    const scene = evaluatePolePolar(POLE_POLAR_EXAMPLES.infinity);
    expect(scene.ideal).toBe(true);
    expect(equal(scene.polar!, [1n, 0n, 0n])).toBe(true);
    expect(exactEquation(scene.polar!)).toBe('x = 0');
    expect(dot(scene.polar!, [0n, 0n, 1n])).toBe(0n);
    expect(scene.side).toBe('outside');
    expect(pointText(scene.p)).toBe('(1, 0)');
    const centreOf = (id: typeof POLE_POLAR_CONIC_IDS[number]) => {
        const c = POLE_POLAR_CONICS[id];
        const result = pole(c, lineAtInfinity());
        return result.status === 'ok' ? toAffine(result.point) : undefined;
    };
    for (const id of ['ellipse', 'circle', 'hyperbola'] as const) {
        const centre = centreOf(id);
        expect(centre?.kind).toBe('finite');
        expect(centre?.kind === 'finite' && [fraction(centre.x), fraction(centre.y)]).toEqual(['0/1', '0/1']);
    }
    const parabola = centreOf('parabola');
    expect(parabola?.kind).toBe('ideal');
    expect(parabola?.kind === 'ideal' && parabola.direction[0]).toBe(0n);
    const parabolaScene = evaluatePolePolar(model({conic: 'parabola'}));
    expect(parabolaScene.centre?.kind).toBe('ideal');
    setLanguage('en');
    expect(describePolePolar(parabolaScene, t, 'en').centre).toContain('no finite centre');
    // the polar of every ideal point passes through the centre, for a centred conic
    for (const direction of [{dx: 1, dy: 2}, {dx: -3, dy: 1}, {dx: 0, dy: 1}]) {
        const s = evaluatePolePolar(model({ideal: direction}));
        expect(dot(s.polar!, [0n, 0n, 1n])).toBe(0n);
    }
});

test('every example is inside the view box: P, the tangency points and the vertices of the bounded conics', () => {
    const [left, top, right, bottom] = POLE_POLAR_VIEW_BOX;
    const inside = (x: number, y: number) => x > left && x < right && y > bottom && y < top;
    for (const id of POLE_POLAR_EXAMPLE_IDS) {
        const example = POLE_POLAR_EXAMPLES[id];
        expect(Math.abs(example.p.x)).toBeLessThanOrEqual(POLE_POLAR_NUMERATOR_LIMIT);
        expect(inside(example.p.x / POLE_POLAR_DENOMINATOR, example.p.y / POLE_POLAR_DENOMINATOR)).toBe(true);
        for (const point of evaluatePolePolar(example).tangency) {
            const view = point.exact ? point.view : undefined;
            if (view?.kind === 'finite') expect(inside(view.view.x, view.view.y)).toBe(true);
        }
    }
    // the extreme finite P of the model is still on the board
    expect(inside(POLE_POLAR_NUMERATOR_LIMIT / POLE_POLAR_DENOMINATOR, -POLE_POLAR_NUMERATOR_LIMIT / POLE_POLAR_DENOMINATOR)).toBe(true);
    const vertices = {ellipse: [[5, 0], [-5, 0], [0, 3], [0, -3]], circle: [[5, 0], [-5, 0], [0, 5], [0, -5]], hyperbola: [[4, 0], [-4, 0]], parabola: [[0, 0]]} as const;
    for (const id of POLE_POLAR_CONIC_IDS) {
        for (const [x, y] of vertices[id]) {
            expect(evaluate(POLE_POLAR_CONICS[id], [BigInt(x), BigInt(y), 1n])).toBe(0n);
            expect(inside(x, y)).toBe(true);
        }
        // the drawn polyline has points and never leaves the box
        const line = conicPolyline(id);
        expect(line.x.length).toBeGreaterThan(50);
        line.x.forEach((x, i) => {
            if (Number.isNaN(x)) return;
            expect(x).toBeGreaterThanOrEqual(left - 1e-6);
            expect(x).toBeLessThanOrEqual(right + 1e-6);
            expect(line.y[i]).toBeGreaterThanOrEqual(bottom - 1e-6);
            expect(line.y[i]).toBeLessThanOrEqual(top + 1e-6);
        });
    }
    // the hyperbola is two pieces separated by one NaN
    expect(conicPolyline('hyperbola').x.filter(Number.isNaN)).toHaveLength(1);
});

test('editing a named example makes it custom and a matching model keeps its name', () => {
    expect(POLE_POLAR_EXAMPLE_IDS.filter(id => id !== 'custom').every(id => matchesExample(POLE_POLAR_EXAMPLES[id]))).toBe(true);
    expect(matchesExample(POLE_POLAR_EXAMPLES.custom)).toBe(false);
    const d = POLE_POLAR_EXAMPLES.default;
    expect(moveP(d, {x: 1.2, y: 4.2}).example).toBe('custom');
    expect(moveP(d, {x: 1.2, y: 4.2}).p).toEqual({x: 6, y: 21});
    expect(moveP(d, {x: 1.04, y: 4.2})).toBe(d);
    expect(setNumerators(d, {x: 6, y: 21}).example).toBe('custom');
    expect(setConic(d, 'circle').example).toBe('custom');
    expect(setConic(d, 'ellipse')).toBe(d);
    expect(setDirection(d, {dx: 1, dy: 0}).example).toBe('custom');
    expect(setDirection(d, undefined)).toBe(d);
    expect(matchesExample({...d, conic: 'circle'})).toBe(false);
    expect(matchesExample({...POLE_POLAR_EXAMPLES.infinity, ideal: {dx: 1, dy: 1}})).toBe(false);
});

test('P snaps to the 1/5 grid, clamps, steps by 0.2 and an ideal P turns its direction skipping zero', () => {
    const d = POLE_POLAR_EXAMPLES.default;
    expect(moveP(d, {x: 0.31, y: -0.29}).p).toEqual({x: 2, y: -1});
    expect(moveP(d, {x: 100, y: -100}).p).toEqual({x: 50, y: -50});
    expect(moveP(d, {x: NaN, y: 0})).toBe(d);
    expect(nudgeP(d, 1, 0).p).toEqual({x: 6, y: 21});
    expect(nudgeP(d, 0, -5).p).toEqual({x: 5, y: 16});
    expect(nudgeP(setNumerators(d, {x: 50, y: 0}), 1, 0).p).toEqual({x: 50, y: 0});
    const ideal = POLE_POLAR_EXAMPLES.infinity;
    expect(nudgeP(ideal, 0, 5).ideal).toEqual({dx: 1, dy: 1});
    expect(nudgeP({...ideal, ideal: {dx: 1, dy: 0}}, -1, 0).ideal).toEqual({dx: -1, dy: 0});
    expect(setDirection(ideal, {dx: 0, dy: 0})).toBe(ideal);
    expect(setDirection(ideal, {dx: 9, dy: -9}).ideal).toEqual({dx: 5, dy: -5});
    // leaving the ideal mode restores the finite P
    expect(setDirection(ideal, undefined).p).toEqual({x: 5, y: 21});
    expect(setDirection(ideal, undefined).ideal).toBeUndefined();
});

test('import: valid data round-trips; an edited named example becomes custom; bad data is refused with an actionable message', () => {
    for (const id of POLE_POLAR_EXAMPLE_IDS) {
        const data = JSON.parse(JSON.stringify(serializePolePolarModel(POLE_POLAR_EXAMPLES[id])));
        const parsed = parsePolePolarModel(data);
        expect(parsed.ok && parsed.value).toEqual(serializePolePolarModel(POLE_POLAR_EXAMPLES[id]));
    }
    const edited = parsePolePolarModel({example: 'default', conic: 'circle', p: {x: 5, y: 21}});
    expect(edited.ok && edited.value.example).toBe('custom');
    const moved = parsePolePolarModel({example: 'on', conic: 'ellipse', p: {x: 21, y: 9}});
    expect(moved.ok && moved.value.example).toBe('custom');
    const refusal = (data: unknown) => {
        const parsed = parsePolePolarModel(data);
        if (parsed.ok) throw new Error('should be refused');
        return renderMessage(parsed.rejection);
    };
    const base = {example: 'default', conic: 'ellipse', p: {x: 5, y: 21}};
    expect(refusal(null)).toContain('objekt');
    expect(refusal({...base, example: 'nope'})).toContain('default, on, inside, infinity, custom');
    expect(refusal({...base, conic: 'cubic'})).toContain('ellipse, circle, parabola, hyperbola');
    expect(refusal({...base, p: {x: 51, y: 0}})).toContain('p.x');
    expect(refusal({...base, p: {x: 1.5, y: 0}})).toContain('p.x');
    expect(refusal({...base, p: {x: 1}})).toContain('p.y');
    expect(refusal({...base, p: 3})).toContain('p');
    expect(refusal({...base, ideal: {dx: 0, dy: 0}})).toContain('(0, 0)');
    expect(refusal({...base, ideal: {dx: 6, dy: 1}})).toContain('ideal.dx');
    expect(refusal({...base, ideal: 'x'})).toContain('ideal');
    setLanguage('en');
    expect(refusal({...base, conic: 'cubic'})).toContain('the conic field must be one of');
});

test('the readouts are exact integers with Unicode minus and the labels are the same in both languages', () => {
    expect(exactEquation([-3n, -35n, 75n])).toBe('3x + 35y − 75 = 0');
    expect(exactEquation([0n, -1n, 4n])).toBe('y − 4 = 0');
    expect(exactEquation([-1n, 0n, 0n])).toBe('x = 0');
    expect(numericalEquation([2, -1, 0.5], 'sl')).toBe('x − 0,5y + 0,25 = 0');
    const text = describePolePolar(evaluatePolePolar(POLE_POLAR_EXAMPLES.default), t, 'sl');
    expect(text.region).toBe('outside');
    expect(text.polar).toContain('3x + 35y − 75 = 0');
    expect(text.tangency.join(' ')).toContain('(4, 9/5)');
    expect(text.tangency.join(' ')).toContain('(−3, 12/5)');
    expect(text.tangents[0]).toContain('t₁');
    expect(text.numerical).toBeUndefined();
    setLanguage('en');
    expect(describePolePolar(evaluatePolePolar(POLE_POLAR_EXAMPLES.infinity), t, 'en').status).toContain('point at infinity');
    expect(describePolePolar(evaluatePolePolar(POLE_POLAR_EXAMPLES.on), t, 'en').status).toContain('lies on the conic');
    expect(describePolePolar(evaluatePolePolar(POLE_POLAR_EXAMPLES.inside), t, 'en').status).toContain('inside');
});

const centreModel: PolePolarModel = {example: 'custom', conic: 'ellipse', p: {x: 0, y: 0}};
const axisModel: PolePolarModel = {example: 'custom', conic: 'parabola', p: {x: 0, y: 0}, ideal: {dx: 0, dy: 1}};

test('the polar of the centre and the tangent at the parabola axis point are the line at infinity, never a finite equation', () => {
    for (const model of [centreModel, {...centreModel, conic: 'circle' as const}, {...centreModel, conic: 'hyperbola' as const}, axisModel]) {
        const scene = evaluatePolePolar(model);
        expect(isLineAtInfinity(scene.polar!)).toBe(true);
        const text = describePolePolar(scene, t, 'sl');
        expect(text.polar).toBe('Polara p je premica v neskončnosti.');
        expect(text.polar).not.toMatch(/=/);
        if (scene.side !== 'outside') expect(text.tangents).toEqual([]);
    }
    setLanguage('en');
    expect(describePolePolar(evaluatePolePolar(centreModel), t, 'en').polar).toBe('Polar p is the line at infinity.');
    expect(isLineAtInfinity([1n, 0n, 0n])).toBe(false);
});

test('the parabola ideal axis point lies on the conic and its status says the tangent is the line at infinity', () => {
    const scene = evaluatePolePolar(axisModel);
    expect(scene.side).toBe('on');
    const text = describePolePolar(scene, t, 'sl');
    expect(text.status).toContain('premica v neskončnosti');
    expect(text.region).toBe('on');
    setLanguage('en');
    expect(describePolePolar(scene, t, 'en').status).toContain('line at infinity');
});
