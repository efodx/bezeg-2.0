import CurvatureBezierCurveGraph, {CURVATURE_T_DEFAULT, PARABOLA_CONTROL_POINTS} from './CurvatureBezierCurveGraph';
import {CurvatureOverlay, curvatureFrame} from './CurvatureOverlay';
import {curvatureCurvePresetCollection} from '../curvePresetCollections';
import {setLanguage, t} from '../../../localization';

/** Counts live language subscriptions, so a leaked listener shows even though the overlay also guards its callback. */
const liveSubscriptions = vi.hoisted(() => ({count: 0}));
vi.mock('../../../localization', async importOriginal => {
    const original = await importOriginal<typeof import('../../../localization')>();
    return {
        ...original,
        onLanguageChange: (listener: () => void) => {
            liveSubscriptions.count++;
            const unsubscribe = original.onLanguageChange(listener);
            let released = false;
            return () => { if (!released) { released = true; liveSubscriptions.count--; } unsubscribe(); };
        },
    };
});

type Pt = [number, number];

/** Independent Bernstein evaluation of a Bezier curve (does not use the curvature kernel). */
function bezier(points: Pt[], t: number): Pt {
    const n = points.length - 1;
    let x = 0, y = 0;
    for (let i = 0; i <= n; i++) {
        let binom = 1;
        for (let k = 0; k < i; k++) binom = binom * (n - k) / (k + 1);
        const b = binom * t ** i * (1 - t) ** (n - i);
        x += b * points[i][0];
        y += b * points[i][1];
    }
    return [x, y];
}

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        renderer: {},
        create: vi.fn((type: string, parents: any[], attributes: any) => {
            const object: any = {type, parents, attributes, board, X: () => 0, Y: () => 0};
            board.objectsList.push(object);
            return object;
        }),
        removeObject: vi.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((o: any) => !list.includes(o));
        }),
        getBoundingBox: () => [-5, 5, 5, -5],
        update: vi.fn(),
    };
    return board;
}

function overlayFor(points: Pt[], parameter = 0.5) {
    const board = fakeBoard();
    const state = {parameter};
    const overlay = new CurvatureOverlay({board, controlPoints: () => points, parameter: () => state.parameter, fontSize: () => 14});
    return {board, overlay, state};
}

const PARABOLA: Pt[] = PARABOLA_CONTROL_POINTS as Pt[];
const CUBIC: Pt[] = [[0, 0], [1, 0], [2, 1], [3, 3]];

describe('curvatureFrame numbers', () => {
    test('parabola y = x^2 at x = 0 and x = 1 (spec L2)', () => {
        const at0 = curvatureFrame(PARABOLA, 0.5)!;
        expect(at0.status).toBe('circle');
        if (at0.status !== 'circle') return;
        expect(at0.kappa).toBeCloseTo(2, 9);
        expect(at0.radius).toBeCloseTo(0.5, 9);
        expect(at0.centre[0]).toBeCloseTo(0, 9);
        expect(at0.centre[1]).toBeCloseTo(0.5, 9);

        const at1 = curvatureFrame(PARABOLA, 1)!;
        if (at1.status !== 'circle') throw new Error('expected a circle');
        expect(at1.kappa).toBeCloseTo(0.17889, 4);
        expect(at1.radius).toBeCloseTo(5.5902, 4);
        expect(at1.centre[0]).toBeCloseTo(-4, 9);
        expect(at1.centre[1]).toBeCloseTo(3.5, 9);
    });

    test('cubic (0,0),(1,0),(2,1),(3,3) at t = 0, 1/2, 1 (spec L2)', () => {
        const kappas = [0, 0.5, 1].map(t => {
            const f = curvatureFrame(CUBIC, t)!;
            if (f.status !== 'circle') throw new Error('expected a circle');
            return f.kappa;
        });
        expect(kappas[0]).toBeCloseTo(2 / 3, 9);
        expect(kappas[1]).toBeCloseTo(0.2357, 4);
        expect(kappas[2]).toBeCloseTo(0.05963, 4);
    });
});

describe('tangency of the osculating circle', () => {
    // Residual of |r(t+d) - c| - R is O(d^3): halving d divides it by 8.
    const residual = (points: Pt[], t: number, delta: number) => {
        const f = curvatureFrame(points, t)!;
        if (f.status !== 'circle') throw new Error('expected a circle');
        const [x, y] = bezier(points, t + delta);
        return Math.hypot(x - f.centre[0], y - f.centre[1]) - f.radius;
    };

    test.each([
        [CUBIC, 0.3], [CUBIC, 0.7], [PARABOLA, 0.4],
        [[[-4, -3], [-3, 2], [2, 2], [3, -2]] as Pt[], 0.35],
    ])('centre sits at distance 1/kappa along N and the residual is third order (%#)', (points, t) => {
        const f = curvatureFrame(points, t)!;
        if (f.status !== 'circle') throw new Error('expected a circle');
        const [x, y] = bezier(points, t);
        expect(Math.hypot(f.centre[0] - x, f.centre[1] - y)).toBeCloseTo(f.radius, 9);
        // c - r = N / kappa, so it is orthogonal to T and parallel to N.
        expect((f.centre[0] - x) * f.tangent[0] + (f.centre[1] - y) * f.tangent[1]).toBeCloseTo(0, 9);
        expect(f.centre[0] - x).toBeCloseTo(f.normal[0] / f.kappa, 9);
        expect(f.centre[1] - y).toBeCloseTo(f.normal[1] / f.kappa, 9);
        for (const sign of [1, -1]) {
            const big = Math.abs(residual(points, t, sign * 0.02));
            const small = Math.abs(residual(points, t, sign * 0.01));
            expect(big).toBeGreaterThan(1e-12);
            expect(big / small).toBeGreaterThan(6.5);
            expect(big / small).toBeLessThan(9.5);
        }
    });

    test('a first-order-only fit (wrong radius) fails the same residual test', () => {
        const f = curvatureFrame(CUBIC, 0.3)!;
        if (f.status !== 'circle') throw new Error('expected a circle');
        const wrong = f.radius * 1.1;
        const at = (delta: number) => {
            const [x, y] = bezier(CUBIC, 0.3 + delta);
            return Math.abs(Math.hypot(x - f.centre[0], y - f.centre[1]) - wrong);
        };
        expect(at(0.02) / at(0.01)).toBeLessThan(3);
    });
});

describe('zero curvature and singular points', () => {
    test('a straight segment and an inflection give a line, scale independent', () => {
        for (const scale of [1e-6, 1, 1e6]) {
            const straight = [[0, 0], [1, 1], [2, 2]].map(p => [p[0] * scale, p[1] * scale] as Pt);
            expect(curvatureFrame(straight, 0.4)!.status).toBe('line');
            const inflection = [[0, 0], [1, 1], [2, -1], [3, 0]].map(p => [p[0] * scale, p[1] * scale] as Pt);
            expect(curvatureFrame(inflection, 0.5)!.status).toBe('line');
            expect(curvatureFrame(inflection, 0.25)!.status).toBe('circle');
        }
    });

    test('a coincident control polygon is singular, never NaN', () => {
        const f = curvatureFrame([[1, 1], [1, 1], [3, 3]], 0);
        expect(f!.status).toBe('singular');
    });

    test('the readout says radius infinite for a line and undefined for a singular point', () => {
        const {overlay: line} = overlayFor([[0, 0], [1, 1], [2, 2]]);
        expect(line.readoutText()).toContain(t('curvature_status_line'));
        expect(line.readoutText()).not.toMatch(/Infinity|NaN/);
        const {overlay: singular} = overlayFor([[1, 1], [1, 1], [3, 3]], 0);
        expect(singular.readoutText()).toBe(t('curvature_status_singular'));
    });

    test('the circle element is hidden on a line, the line element is shown', () => {
        const {board} = overlayFor([[0, 0], [1, 1], [2, 2]]);
        const visible = (type: string) => board.objectsList.find((o: any) => o.type === type).attributes.visible();
        expect(visible('circle')).toBe(false);
        expect(visible('line')).toBe(true);
        const {board: curved} = overlayFor(PARABOLA);
        expect(curved.objectsList.find((o: any) => o.type === 'circle').attributes.visible()).toBe(true);
    });
});

describe('overlay readout and circle elements', () => {
    test('the readout shows kappa and the radius in the current language', () => {
        const {overlay} = overlayFor(PARABOLA);
        setLanguage('sl');
        expect(overlay.readoutText()).toBe('Ukrivljenost κ = 2\nKrivinski polmer R = 0,5\nSmerni kot tangente φ = 0°');
        setLanguage('en');
        expect(overlay.readoutText()).toBe('Curvature κ = 2\nRadius of curvature R = 0.5\nTangent direction angle φ = 0°');
        setLanguage('sl');
    });

    test('the circle element follows the parameter lazily', () => {
        const {board, state} = overlayFor(PARABOLA, 0.5);
        const circle = board.objectsList.find((o: any) => o.type === 'circle');
        expect(circle.parents[1]()).toBeCloseTo(0.5, 9);
        state.parameter = 1;
        expect(circle.parents[1]()).toBeCloseTo(5.5902, 4);
    });
});

describe('tangent direction angle', () => {
    test('cubic: 0 degrees at t = 0 and atan2(2, 1) at t = 1, shown for circle and line, not singular', () => {
        const at = (t: number) => overlayFor(CUBIC, t).overlay.readoutText();
        setLanguage('en');
        expect(at(0)).toContain('Tangent direction angle φ = 0°');
        expect(at(1)).toContain('Tangent direction angle φ = 63.4349°');
        expect(overlayFor([[0, 0], [1, 1], [2, 2]]).overlay.readoutText()).toContain('φ = 45°');
        expect(overlayFor([[0, 0], [-1, 1], [-2, 2]]).overlay.readoutText()).toContain('φ = 135°');
        expect(overlayFor([[1, 1], [1, 1], [3, 3]], 0).overlay.readoutText()).not.toContain('φ');
        setLanguage('sl');
        expect(at(1)).toContain('Smerni kot tangente φ = 63,4349°');
    });
});

describe('overlay disposal', () => {
    test('dispose removes every owned element and is idempotent', () => {
        const {board, overlay} = overlayFor(PARABOLA);
        const owned = [...overlay.ownedElements()];
        expect(owned.length).toBeGreaterThan(8);
        expect(owned.every(element => board.objectsList.includes(element))).toBe(true);
        overlay.dispose();
        expect(board.objectsList).toEqual([]);
        overlay.dispose();
        expect(board.removeObject).toHaveBeenCalledTimes(1);
    });

    test('a language change redraws while alive and not after dispose', () => {
        const before = liveSubscriptions.count;
        const {board, overlay} = overlayFor(PARABOLA);
        setLanguage('en');
        expect(board.update).toHaveBeenCalledTimes(1);
        expect(liveSubscriptions.count).toBe(before + 1);
        overlay.dispose();
        expect(liveSubscriptions.count).toBe(before);
        setLanguage('sl');
        expect(board.update).toHaveBeenCalledTimes(1);
    });
});

function makeGraph() {
    const graph = Object.create(CurvatureBezierCurveGraph.prototype) as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    const points = PARABOLA.map(p => ({X: () => p[0], Y: () => p[1]}));
    graph.jxgCurves = [{getCurve: () => ({getPoints: () => points})}];
    graph.store.replaceState({...graph.getInitialState(), initialized: true});
    graph.setState = vi.fn((patch: any) => { graph.store.setState(patch); });
    return graph;
}

describe('CurvatureBezierCurveGraph', () => {
    test('the initial state holds the parameter and the parabola is the default preset', () => {
        const graph = makeGraph();
        expect(graph.state.curvatureT).toBe(CURVATURE_T_DEFAULT);
        expect(graph.defaultPreset()).toEqual([['JSXBezierCurve', expect.objectContaining({points: PARABOLA})]]);
    });

    test('preset round trip through the collection check keeps the data', () => {
        const graph = makeGraph();
        const preset = graph.defaultPreset();
        const checked = curvatureCurvePresetCollection.check(JSON.parse(JSON.stringify(preset)));
        expect('rejection' in checked).toBe(false);
        expect((checked as any).data).toEqual(preset);
        expect(graph.presetCollection()).toBe(curvatureCurvePresetCollection);
        expect('rejection' in curvatureCurvePresetCollection.check([['JSXRationalBezierCurve', {points: [[0, 0]], weights: [1]}]])).toBe(true);
    });

    test('the overlay reads the live curve and the state parameter', () => {
        const graph = makeGraph();
        graph.ensureOverlay();
        const circle = graph.board.objectsList.find((o: any) => o.type === 'circle');
        expect(circle.parents[1]()).toBeCloseTo(0.5, 9);
        graph.setCurvatureT(1);
        expect(circle.parents[1]()).toBeCloseTo(5.5902, 4);
    });

    test('ensureOverlay replaces rather than stacks, and scene disposal removes all of it', () => {
        const graph = makeGraph();
        graph.ensureOverlay();
        const first = graph.board.objectsList.length;
        graph.ensureOverlay();
        expect(graph.board.objectsList.length).toBe(first);
        graph.disposeFigureSceneResources();
        expect(graph.board.objectsList).toEqual([]);
    });

    test('unmount disposes the overlay before the board goes', () => {
        const graph = makeGraph();
        graph.ensureOverlay();
        const board = graph.board;
        const order: string[] = [];
        const remove = board.removeObject;
        board.removeObject = vi.fn((o: any) => { order.push('removed'); return remove(o); });
        graph.graphSession = {isReady: true, isAlive: true, dispose: () => order.push('session')};
        graph.pendingCallbacks = [];
        graph.unmount();
        expect(order[0]).toBe('removed');
        expect(board.objectsList).toEqual([]);
    });

    test('reset restores the parameter', () => {
        const graph = makeGraph();
        graph.setCurvatureT(0.9);
        expect(graph.lessonDefaultState().curvatureT).toBe(CURVATURE_T_DEFAULT);
    });
});
