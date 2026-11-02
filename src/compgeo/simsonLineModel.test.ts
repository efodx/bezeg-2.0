import {
    activeSimsonExampleId, analyseSimson, DEFAULT_SIMSON_SETTINGS, FOOT_NAMES, isSimsonOffset, resolveOffset, SIMSON_EXAMPLES, SIMSON_OFFSETS,
    simsonExample, SimsonAnalysis, SimsonSettings, simsonTFromBoard, stepSimsonT,
} from './simsonLineModel';
import {SIMSON_GLIDER_TOLERANCE} from './simson';

const T1 = [{x: 0, y: 0}, {x: 7, y: 0}, {x: 2, y: 5}];
const exactAt = (x: number, y: number): SimsonSettings => ({...DEFAULT_SIMSON_SETTINGS, mode: 'exact', pPrime: {x, y}});
const gliderAt = (t: number, epsilon = 0): SimsonSettings => ({...DEFAULT_SIMSON_SETTINGS, mode: 'glider', t, epsilon});
function triangle(analysis: SimsonAnalysis) {
    if (analysis.kind !== 'triangle') throw new Error(`expected a triangle, got ${analysis.kind}`);
    return analysis;
}
const text = (r: {format(): string} | {x: {format(): string}; y: {format(): string}}) =>
    'format' in r ? r.format() : `(${r.x.format()}, ${r.y.format()})`;

/** The lattice points of x^2 + y^2 - 7x - 3y = 0 (the default circumcircle), found without the model. */
function latticePointsOnCircle(): [number, number][] {
    const found: [number, number][] = [];
    for (let x = -20; x <= 20; x++) for (let y = -20; y <= 20; y++) if (x * x + y * y - 7 * x - 3 * y === 0) found.push([x, y]);
    return found;
}

function seeded(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let r = Math.imul(s ^ (s >>> 15), 1 | s);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

describe('exact mode on the default triangle', () => {
    test('the independent enumeration finds exactly the eight lattice points of spec T4, and each reports exact collinear', () => {
        const lattice = latticePointsOnCircle();
        expect(lattice.map(([x, y]) => `${x},${y}`).sort()).toEqual(
            ['0,0', '0,3', '2,-2', '2,5', '5,-2', '5,5', '7,0', '7,3'].sort());
        for (const [x, y] of lattice) {
            const view = triangle(analyseSimson(T1, exactAt(x, y)));
            expect(view.collinear, `${x},${y}`).toBe(true);
            expect(view.exact!.onCircle).toBe(true);
            expect(view.exact!.orient.isZero()).toBe(true);
            expect(view.exact!.power.isZero()).toBe(true);
            expect(['collinear-exact', 'coincident']).toContain(view.status);
            expect(view.line).toBeDefined();
        }
    });

    test('the feet for P\' = (2, -2) and (0, 3) are the exact rationals of the spec', () => {
        const first = triangle(analyseSimson(T1, exactAt(2, -2)));
        expect(first.feet.map(f => text(f.exact!))).toEqual(['(11/2, 3/2)', '(-12/29, -30/29)', '(2, 0)']);
        const second = triangle(analyseSimson(T1, exactAt(0, 3)));
        expect(second.feet.map(f => text(f.exact!))).toEqual(['(2, 5)', '(30/29, 75/29)', '(0, 0)']);
        expect(first.status).toBe('collinear-exact');
        expect(first.feet.map(f => f.name)).toEqual([...FOOT_NAMES]);
    });

    test('every other grid point of the window is not collinear with |power| >= 1, and the power is the integer x^2+y^2-7x-3y', () => {
        const onCircle = new Set(latticePointsOnCircle().map(([x, y]) => `${x},${y}`));
        let checked = 0;
        for (let x = -20; x <= 20; x++) {
            for (let y = -20; y <= 20; y++) {
                if (onCircle.has(`${x},${y}`)) continue;
                const view = triangle(analyseSimson(T1, exactAt(x, y)));
                const power = view.exact!.power;
                expect(view.collinear, `${x},${y}`).toBe(false);
                expect(view.status).toBe('not-collinear');
                expect(view.exact!.onCircle).toBe(false);
                expect(Math.abs(power.toNumber())).toBeGreaterThanOrEqual(1);
                expect(power.toNumber()).toBe(x * x + y * y - 7 * x - 3 * y);
                expect(view.line).toBeUndefined();
                checked++;
            }
        }
        expect(checked).toBe(41 * 41 - 8);
    });

    test('the exact area ratio equals the closed form |R^2 - OP^2| / (4 R^2) of the power, as a rational', () => {
        const view = triangle(analyseSimson(T1, exactAt(6, 4)));
        // power = 36 + 16 - 42 - 12 = -2, R^2 = 29/2: |power| / (4 R^2) = 2 / 58 = 1/29.
        expect(text(view.exact!.power)).toBe('-2');
        expect(text(view.exact!.areaRatio)).toBe('1/29');
        expect(view.status).toBe('not-collinear');
    });

    test('P\' at a vertex gives coincident feet: two distinct feet, a defined line and the coincidence status', () => {
        const view = triangle(analyseSimson(T1, simsonExample('vertex')));
        expect(view.status).toBe('coincident');
        expect(view.collinear).toBe(true);
        expect(view.exact!.distinctCount).toBe(2);
        expect(view.linePair).toBeDefined();
        const [i, j] = view.linePair!;
        expect(view.feet[i].exact!.equals(view.feet[j].exact!)).toBe(false);
        expect(view.line).toBeDefined();
        // The feet on the two sides through B are B itself.
        expect(view.feet.filter(f => f.exact!.x.toNumber() === 7 && f.exact!.y.toNumber() === 0)).toHaveLength(2);
    });

    test('a foot outside its side segment is reported normally, with the line through it', () => {
        const view = triangle(analyseSimson(T1, exactAt(2, -2)));
        const e = view.feet[1];
        // E lies on line CA at (-12/29, -30/29), before A = (0, 0): outside the segment CA.
        expect(e.x).toBeLessThan(0);
        expect(e.board).toEqual({x: e.x, y: e.y});
        expect(view.status).toBe('collinear-exact');
        expect(view.line).toBeDefined();
    });
});

describe('glider mode on the default triangle', () => {
    test('over 2000 seeded positions the relative pedal area is at least 10^6 times below the tolerance, and the status is collinear within', () => {
        const random = seeded(20261102);
        let worst = 0;
        for (let i = 0; i < 2000; i++) {
            const view = triangle(analyseSimson(T1, gliderAt(random() * 360)));
            worst = Math.max(worst, view.glider!.relative);
            expect(view.status).toBe('collinear-within');
            expect(view.collinear).toBe(true);
            expect(view.line).toBeDefined();
        }
        expect(worst * 1e6).toBeLessThanOrEqual(SIMSON_GLIDER_TOLERANCE);
    });

    test.each([[0.001, 0.000500], [0.01, 0.005025], [0.05, 0.025625], [0.2, 0.110]])(
        'offset %f gives the spec ratio %f and the oracle |R^2 - OP^2| / (4 R^2); the status is not collinear', (epsilon, ratio) => {
            const random = seeded(7);
            for (const sign of [1, -1]) {
                for (let i = 0; i < 20; i++) {
                    const e = sign * epsilon;
                    const view = triangle(analyseSimson(T1, gliderAt(random() * 360, e)));
                    const oracle = Math.abs(1 - (1 + e) ** 2) / 4;
                    expect(Math.abs(view.glider!.relative - oracle)).toBeLessThan(1e-12);
                    if (sign === 1) expect(Math.abs(view.glider!.relative - ratio)).toBeLessThan(1e-6);
                    expect(view.status).toBe('not-collinear');
                    expect(view.collinear).toBe(false);
                    expect(view.line).toBeUndefined();
                    expect(view.glider!.epsilon).toBe(e);
                }
            }
        });

    test('the glider is at distance R(1 + epsilon) from O at angle t, and an unknown offset reads as 0', () => {
        const view = triangle(analyseSimson(T1, gliderAt(90, 0.2)));
        expect(view.p.x).toBeCloseTo(3.5, 9);
        expect(view.p.y).toBeCloseTo(1.5 + view.radius * 1.2, 9);
        expect(resolveOffset(0.123)).toBe(0);
        expect(triangle(analyseSimson(T1, gliderAt(10, 0.123))).glider!.epsilon).toBe(0);
        expect(SIMSON_OFFSETS).toEqual([-0.2, -0.05, -0.01, -0.001, 0, 0.001, 0.01, 0.05, 0.2]);
        expect(isSimsonOffset(0.01)).toBe(true);
        expect(isSimsonOffset(0.02)).toBe(false);
    });

    test('t is normalised: 420 and 60 give the same glider, and a negative t wraps', () => {
        const a = triangle(analyseSimson(T1, gliderAt(60)));
        const b = triangle(analyseSimson(T1, gliderAt(420)));
        const c = triangle(analyseSimson(T1, gliderAt(-300)));
        expect(b.p.x).toBeCloseTo(a.p.x, 9);
        expect(c.p.y).toBeCloseTo(a.p.y, 9);
        expect(stepSimsonT(359, 2)).toBe(1);
        expect(stepSimsonT(0, -1)).toBe(359);
    });

    test('the board angle about O inverts the position', () => {
        const view = triangle(analyseSimson(T1, gliderAt(123)));
        expect(simsonTFromBoard(T1, view.p.x, view.p.y)).toBeCloseTo(123, 9);
        expect(simsonTFromBoard(T1, Number.NaN, 0)).toBeUndefined();
        expect(simsonTFromBoard([{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 2}], 1, 1)).toBeUndefined();
    });
});

describe('degenerate and missing input', () => {
    test.each([['glider', gliderAt(60)], ['exact', exactAt(2, -2)]] as const)('a collinear or coincident triple is typed degenerate in %s mode, with no NaN and no throw', (_name, settings) => {
        for (const points of [[{x: 0, y: 0}, {x: 1, y: 1}, {x: 3, y: 3}], [{x: 2, y: 2}, {x: 2, y: 2}, {x: 2, y: 2}]]) {
            const analysis = analyseSimson(points, settings);
            expect(analysis.kind).toBe('degenerate');
            expect(JSON.stringify(analysis)).not.toMatch(/NaN|Infinity|null/);
        }
        expect(analyseSimson(T1.slice(0, 2), settings)).toEqual({kind: 'missing', have: 2});
    });

    test('a valid result has only finite numbers', () => {
        for (const settings of [gliderAt(33, 0.05), exactAt(6, 4), exactAt(7, 0)]) {
            const view = triangle(analyseSimson(T1, settings));
            for (const value of [view.radius, view.p.x, view.p.y, ...view.feet.flatMap(f => [f.x, f.y])]) expect(Number.isFinite(value)).toBe(true);
        }
    });

    test('a P\' far away leaves a foot without board coordinates and no line, never a huge number', () => {
        const view = triangle(analyseSimson(T1, exactAt(2 ** 25, -(2 ** 25))));
        expect(view.feet.every(f => Number.isFinite(f.x))).toBe(true);
        expect(view.status).toBe('not-collinear');
    });
});

describe('examples', () => {
    test('each example is on the T1 triangle with the stated mode and point', () => {
        expect(SIMSON_EXAMPLES.map(e => e.id)).toEqual(['default', 'grid-on-circle', 'grid-off-circle', 'vertex']);
        const byId = Object.fromEntries(SIMSON_EXAMPLES.map(e => [e.id, e]));
        expect(byId['default']).toMatchObject({mode: 'glider', t: 60, epsilon: 0});
        expect(byId['grid-on-circle']).toMatchObject({mode: 'exact', pPrime: {x: 2, y: -2}});
        expect(byId['grid-off-circle']).toMatchObject({mode: 'exact', pPrime: {x: 6, y: 4}});
        expect(byId['vertex']).toMatchObject({mode: 'exact', pPrime: {x: 7, y: 0}});
        for (const e of SIMSON_EXAMPLES) expect(e.points).toEqual(T1);
        expect(text(triangle(analyseSimson(T1, byId['grid-off-circle'])).exact!.power)).toBe('-2');
    });

    test('an example is active only while the vertices, the mode and (exact mode) P\' still equal it', () => {
        const vertex = simsonExample('vertex');
        expect(activeSimsonExampleId('vertex', T1, vertex)).toBe('vertex');
        expect(activeSimsonExampleId('vertex', T1, {...vertex, pPrime: {x: 6, y: 0}})).toBeUndefined();
        expect(activeSimsonExampleId('vertex', T1, {...vertex, mode: 'glider'})).toBeUndefined();
        expect(activeSimsonExampleId('vertex', [{x: 0, y: 0}, {x: 7, y: 0}, {x: 2, y: 4}], vertex)).toBeUndefined();
        expect(activeSimsonExampleId('default', T1, {...simsonExample('default'), t: 200, pPrime: {x: 1, y: 1}})).toBe('default');
        expect(activeSimsonExampleId(undefined, T1, vertex)).toBeUndefined();
    });
});
