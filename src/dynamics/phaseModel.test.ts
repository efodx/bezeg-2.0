import {
    DEFAULT_LOGISTIC_STATE, DEFAULT_PHASE_STATE, ENTRY_RANGE, R_RANGE, RING_COUNT, SEED_RANGE, STEP_RANGE, X_RANGE, ZOOM_RANGE,
    centreOf, classifyLogisticR, deriveLogistic, derivePhase, energyStatus, equilibriumChoices, halfWidthOf, matrixOf, periodCacheSize, parseLogisticState,
    parsePhaseState, pendulumEnergy, serializeLogisticState, serializePhaseState, snapDragInteger, typedInteger, withSystem,
    type LogisticState, type PhaseState,
} from './phaseModel';

const phase = (patch: Partial<PhaseState>): PhaseState => ({...DEFAULT_PHASE_STATE, ...patch});
const rejectedPhase = (data: unknown) => {
    const result = parsePhaseState(data);
    if (result.ok) throw new Error('expected a rejection');
    return result.error;
};
const rejectedLogistic = (data: unknown) => {
    const result = parseLogisticState(data);
    if (result.ok) throw new Error('expected a rejection');
    return result.error;
};
const firstStep = (points: readonly (readonly [number, number])[], index: number) => points[index];

describe('phase state: parse, round trip, errors', () => {
    it('round-trips the default and several states through JSON', () => {
        const states: PhaseState[] = [
            DEFAULT_PHASE_STATE,
            phase({system: 'pendulum', equilibrium: 1, zoom: 3, seeds: [{X: 0, Y: 40}, {X: -80, Y: 80}]}),
            phase({system: 'weak-spiral', A: 16, B: -16, C: 0, D: -1, seeds: Array.from({length: 6}, (_, i) => ({X: i - 3, Y: 3 - i}))}),
        ];
        for (const state of states) {
            const parsed = parsePhaseState(JSON.parse(JSON.stringify(serializePhaseState(state))));
            expect(parsed).toEqual({ok: true, value: state});
        }
    });

    it('drops derived and unknown fields instead of reading them', () => {
        const parsed = parsePhaseState({...DEFAULT_PHASE_STATE, type: 'saddle', plane: {kind: 'centre'}, orbits: [1, 2], extra: 7});
        expect(parsed).toEqual({ok: true, value: DEFAULT_PHASE_STATE});
        expect(Object.keys(serializePhaseState(DEFAULT_PHASE_STATE)).sort()).toEqual(['A', 'B', 'C', 'D', 'equilibrium', 'seeds', 'system', 'zoom']);
    });

    it('stores no negative zero', () => {
        const parsed = parsePhaseState({...DEFAULT_PHASE_STATE, A: -0, seeds: [{X: -0, Y: -0}]});
        expect(parsed.ok && Object.is(parsed.value.A, 0) && Object.is(parsed.value.seeds[0].X, 0) && Object.is(parsed.value.seeds[0].Y, 0)).toBe(true);
    });

    it('rejects every bad field with its name and a reason', () => {
        const base = serializePhaseState(DEFAULT_PHASE_STATE);
        expect(rejectedPhase(null)).toMatchObject({field: 'state', reason: 'not-an-object'});
        expect(rejectedPhase([])).toMatchObject({field: 'state', reason: 'not-an-object'});
        expect(rejectedPhase({...base, system: 'lorenz'})).toMatchObject({field: 'system', reason: 'unknown-value'});
        expect(rejectedPhase({...base, system: undefined})).toMatchObject({field: 'system', reason: 'missing'});
        for (const field of ['A', 'B', 'C', 'D']) {
            expect(rejectedPhase({...base, [field]: 17})).toMatchObject({field, reason: 'out-of-range'});
            expect(rejectedPhase({...base, [field]: -17})).toMatchObject({field, reason: 'out-of-range'});
            expect(rejectedPhase({...base, [field]: 0.5})).toMatchObject({field, reason: 'off-grid'});
            expect(rejectedPhase({...base, [field]: Number.NaN})).toMatchObject({field, reason: 'not-finite'});
            expect(rejectedPhase({...base, [field]: '3'})).toMatchObject({field, reason: 'not-finite'});
            expect(rejectedPhase({...base, [field]: undefined})).toMatchObject({field, reason: 'missing'});
        }
        expect(rejectedPhase({...base, seeds: []})).toMatchObject({field: 'seeds', reason: 'out-of-range'});
        expect(rejectedPhase({...base, seeds: Array(7).fill({X: 0, Y: 0})})).toMatchObject({field: 'seeds', reason: 'out-of-range'});
        expect(rejectedPhase({...base, seeds: 'x'})).toMatchObject({field: 'seeds', reason: 'not-an-object'});
        expect(rejectedPhase({...base, seeds: undefined})).toMatchObject({field: 'seeds', reason: 'missing'});
        expect(rejectedPhase({...base, seeds: [{X: 0, Y: 0}, 5]})).toMatchObject({field: 'seeds[1]', reason: 'not-an-object'});
        expect(rejectedPhase({...base, seeds: [{X: 81, Y: 0}]})).toMatchObject({field: 'seeds[0].X', reason: 'out-of-range'});
        expect(rejectedPhase({...base, seeds: [{X: 0, Y: 1.5}]})).toMatchObject({field: 'seeds[0].Y', reason: 'off-grid'});
        expect(rejectedPhase({...base, zoom: 7})).toMatchObject({field: 'zoom', reason: 'out-of-range'});
        expect(rejectedPhase({...base, zoom: -1})).toMatchObject({field: 'zoom', reason: 'out-of-range'});
        expect(rejectedPhase({...base, equilibrium: 2})).toMatchObject({field: 'equilibrium', reason: 'out-of-range'});
    });

    it('rejects an equilibrium the system does not have, and says so', () => {
        const error = rejectedPhase({...serializePhaseState(DEFAULT_PHASE_STATE), equilibrium: 1});
        expect(error).toMatchObject({field: 'equilibrium', reason: 'inconsistent'});
        expect(error.message).toMatch(/linear/);
        expect(parsePhaseState({...serializePhaseState(DEFAULT_PHASE_STATE), system: 'pendulum', equilibrium: 1}).ok).toBe(true);
    });

    it('accepts the range edges and rejects one beyond (never clamps)', () => {
        for (const A of [ENTRY_RANGE.min, ENTRY_RANGE.max]) expect(parsePhaseState({...DEFAULT_PHASE_STATE, A}).ok).toBe(true);
        for (const X of [SEED_RANGE.min, SEED_RANGE.max]) expect(parsePhaseState({...DEFAULT_PHASE_STATE, seeds: [{X, Y: X}]}).ok).toBe(true);
        for (const zoom of [ZOOM_RANGE.min, ZOOM_RANGE.max]) expect(parsePhaseState({...DEFAULT_PHASE_STATE, zoom}).ok).toBe(true);
        expect(ENTRY_RANGE).toEqual({min: -16, max: 16});
    });

    it('withSystem keeps the state when unchanged and resets an equilibrium the new system lacks', () => {
        const pendulum = phase({system: 'pendulum', equilibrium: 1});
        expect(withSystem(pendulum, 'pendulum')).toBe(pendulum);
        expect(withSystem(pendulum, 'weak-spiral').equilibrium).toBe(0);
        expect(withSystem(phase({equilibrium: 0}), 'pendulum').equilibrium).toBe(0);
        expect(equilibriumChoices('pendulum')).toBe(2);
        expect(equilibriumChoices('linear')).toBe(1);
    });
});

describe('typed input and dragging', () => {
    it('accepts on-grid values and returns the integer', () => {
        expect(typedInteger(-3.25, 4, ENTRY_RANGE, 'a')).toEqual({ok: true, value: -13});
        expect(typedInteger(0, 4, ENTRY_RANGE, 'a')).toEqual({ok: true, value: 0});
        expect(typedInteger(2.05, 20, SEED_RANGE, 'x')).toEqual({ok: true, value: 41});
        expect(typedInteger(3.45, 100, R_RANGE, 'r')).toEqual({ok: true, value: 345});
    });

    it('refuses off-grid, out-of-range and non-finite values, never rounding or clamping them', () => {
        const refusal = (result: ReturnType<typeof typedInteger>) => (result.ok ? 'accepted' : result.error.reason);
        expect(refusal(typedInteger(0.3, 4, ENTRY_RANGE, 'a'))).toBe('off-grid');
        expect(refusal(typedInteger(4.25, 4, ENTRY_RANGE, 'a'))).toBe('out-of-range');
        expect(refusal(typedInteger(-4.25, 4, ENTRY_RANGE, 'a'))).toBe('out-of-range');
        expect(refusal(typedInteger(Number.NaN, 4, ENTRY_RANGE, 'a'))).toBe('not-finite');
        expect(refusal(typedInteger(Infinity, 4, ENTRY_RANGE, 'a'))).toBe('not-finite');
        expect(refusal(typedInteger(2.499, 100, R_RANGE, 'r'))).toBe('off-grid');
        expect(refusal(typedInteger(2.49, 100, R_RANGE, 'r'))).toBe('out-of-range');
        expect(refusal(typedInteger(4.01, 100, R_RANGE, 'r'))).toBe('out-of-range');
        expect(typedInteger(0.3, 4, ENTRY_RANGE, 'a')).toMatchObject({error: {field: 'a'}});
    });

    it('a drag snaps to the nearest grid value, clamps into the range and ignores non-finite coordinates', () => {
        expect(snapDragInteger(1.13, 4, ENTRY_RANGE)).toBe(5);
        expect(snapDragInteger(-0.1, 4, ENTRY_RANGE)).toBe(0);
        expect(Object.is(snapDragInteger(-0.001, 4, ENTRY_RANGE), 0)).toBe(true);
        expect(snapDragInteger(9, 4, ENTRY_RANGE)).toBe(16);
        expect(snapDragInteger(-9, 4, ENTRY_RANGE)).toBe(-16);
        expect(snapDragInteger(Number.NaN, 4, ENTRY_RANGE)).toBeUndefined();
        expect(snapDragInteger(1.234, 20, SEED_RANGE)).toBe(25);
    });
});

describe('derived phase portrait', () => {
    it('classifies the default stable node with hand values tau = -7, delta = 10, Delta = 9', () => {
        const derived = derivePhase(DEFAULT_PHASE_STATE);
        expect(matrixOf(DEFAULT_PHASE_STATE)).toEqual([[-4, -1], [-2, -3]]);
        expect(derived.plane).toMatchObject({type: {kind: 'node', stability: 'stable'}, tau: -7, delta: 10, discriminant: 9});
        expect(derived.hyperbolic).toBe(true);
        expect(derived.jacobian).toEqual([[-4, -1], [-2, -3]]);
        expect(derived.ring).toEqual([]);
        expect(derived.energies).toEqual([]);
    });

    it('draws the default seed to the closed solution x(1) = (0,0496037; -0,0857316) (step 50 of the orbit)', () => {
        const orbit = derivePhase(DEFAULT_PHASE_STATE).orbits[0];
        const [x, y] = firstStep(orbit.forward, 50);
        // (2/3) e^-5 (1, 1) + (1/3) e^-2 (1, -2), the eigen-decomposition of the matrix of the spec.
        expect(x).toBeCloseTo((2 / 3) * Math.exp(-5) + (1 / 3) * Math.exp(-2), 6);
        expect(y).toBeCloseTo((2 / 3) * Math.exp(-5) - (2 / 3) * Math.exp(-2), 6);
        expect(orbit.forward).toHaveLength(501);
        expect(orbit.forwardStop).toBe('complete');
        expect(orbit.backwardStop).toBe('left-view'); // a stable node expands backward
    });

    it('reports the stop of an orbit that leaves the view or starts outside it', () => {
        const unstable = derivePhase(phase({A: 16, B: 4, C: 8, D: 12})).orbits[0]; // E of linear-maps L3: eigenvalues 5, 2
        expect(unstable.forwardStop).toBe('left-view');
        expect(unstable.backwardStop).toBe('complete');
        const zoomed = derivePhase(phase({zoom: 6})).orbits[0]; // half-width 1/16, the seed (1, 0) is outside
        expect(zoomed.forward).toHaveLength(1);
        expect(zoomed.forwardStop).toBe('left-view');
        expect(halfWidthOf(6)).toBe(1 / 16);
    });

    it('classifies a centre, a saddle and a degenerate matrix by the exact table (no tolerance)', () => {
        expect(derivePhase(phase({A: 0, B: -4, C: 4, D: 0})).plane.type).toEqual({kind: 'centre'});
        expect(derivePhase(phase({A: 4, B: 0, C: 0, D: -4})).plane).toMatchObject({type: {kind: 'saddle'}, tau: 0, delta: -1});
        expect(derivePhase(phase({A: 0, B: 0, C: 0, D: 0})).plane.type).toEqual({kind: 'non-isolated', case: 'all-fixed'});
        expect(derivePhase(phase({A: 0, B: 0, C: 0, D: 0})).hyperbolic).toBe(false);
        expect(derivePhase(phase({A: 0, B: -4, C: 4, D: 0})).hyperbolic).toBe(false);
        expect(derivePhase(phase({A: -1, B: -4, C: 4, D: -1})).plane.type).toEqual({kind: 'spiral', stability: 'stable'}); // PP1 spiral
    });

    it('linearizes the pendulum: a saddle at (pi, 0), a centre at (0, 0); weak-spiral is a non-hyperbolic centre', () => {
        const top = derivePhase(phase({system: 'pendulum', equilibrium: 1, seeds: [{X: 0, Y: 0}]}));
        expect(top.jacobian).toEqual([[0, 1], [1, 0]]);
        expect(top.plane).toMatchObject({type: {kind: 'saddle'}, tau: 0, delta: -1});
        expect(top.hyperbolic).toBe(true);
        expect(top.centre).toEqual([Math.PI, 0]);
        expect(top.view.xMin).toBe(Math.PI - 4);
        const bottom = derivePhase(phase({system: 'pendulum', equilibrium: 0}));
        expect(bottom.jacobian).toEqual([[0, 1], [-1, 0]]);
        expect(bottom.plane.type).toEqual({kind: 'centre'});
        expect(bottom.hyperbolic).toBe(false);
        const weak = derivePhase(phase({system: 'weak-spiral'}));
        expect(weak.jacobian).toEqual([[0, -1], [1, 0]]);
        expect(weak.plane.type).toEqual({kind: 'centre'});
        expect(weak.hyperbolic).toBe(false);
        expect(centreOf(phase({system: 'weak-spiral'}))).toEqual([0, 0]);
    });

    it('draws a ring of nonlinear and linearized orbits around the equilibrium of a nonlinear system, scaled by the zoom', () => {
        for (const zoom of [0, 3]) {
            const derived = derivePhase(phase({system: 'pendulum', equilibrium: 1, zoom}));
            expect(derived.ring).toHaveLength(RING_COUNT);
            expect(derived.ringLinear).toHaveLength(RING_COUNT);
            const radius = 0.75 * 4 / 2 ** zoom;
            for (const orbit of derived.ring) expect(Math.hypot(orbit.start[0] - Math.PI, orbit.start[1])).toBeCloseTo(radius, 12);
        }
        // Near a saddle the nonlinear and linear orbits start together and stay close for a short time at a deep zoom.
        const deep = derivePhase(phase({system: 'pendulum', equilibrium: 1, zoom: 6}));
        const [nx, ny] = deep.ring[0].forward[5];
        const [lx, ly] = deep.ringLinear[0].forward[5];
        // sin(u) = u - u^3/6 + ...: the two fields differ by about r^3/6 per unit time, over t = 0,1 at radius r = 0,75/16.
        const r = 0.75 / 16;
        const gap = Math.hypot(nx - lx, ny - ly);
        expect(gap).toBeGreaterThan(0);
        expect(gap).toBeLessThan((r ** 3 * 0.1) / 3);
    });

    it('follows weak-spiral to r(t) = r0 / sqrt(1 + 2 r0^2 t): 0,5773503 at t = 1 from (1, 0)', () => {
        const orbit = derivePhase(phase({system: 'weak-spiral', seeds: [{X: 20, Y: 0}]})).orbits[0];
        const [x, y] = orbit.forward[50];
        expect(Math.hypot(x, y)).toBeCloseTo(1 / Math.sqrt(3), 6);
        expect(Math.hypot(...orbit.forward[500])).toBeCloseTo(1 / Math.sqrt(1 + 2 * 10), 6); // 0,2182179 at t = 10
    });

    it('conserves the pendulum energy along a swing, H0 = -cos 1', () => {
        const orbit = derivePhase(phase({system: 'pendulum', seeds: [{X: 20, Y: 0}]})).orbits[0];
        expect(orbit.forwardStop).toBe('complete');
        const H0 = -Math.cos(1);
        for (const [theta, omega] of orbit.forward) expect(Math.abs(pendulumEnergy(theta, omega) - H0)).toBeLessThan(1e-6);
    });
});

describe('pendulum energy status', () => {
    it('matches the checked values: separatrix at (0, 2) exactly, swing at (0; 1,9), rotation at (0; 2,25)', () => {
        expect(energyStatus({X: 0, Y: 40})).toEqual({kind: 'separatrix-exact', H: 1});
        expect(energyStatus({X: 0, Y: -40})).toMatchObject({kind: 'separatrix-exact'});
        expect(energyStatus({X: 0, Y: 38})).toMatchObject({kind: 'swing'});
        expect(energyStatus({X: 0, Y: 38}).H).toBeCloseTo(0.805, 12);
        expect(energyStatus({X: 0, Y: 45})).toMatchObject({kind: 'rotation'});
        expect(energyStatus({X: 0, Y: 45}).H).toBeCloseTo(1.53125, 12);
        expect(energyStatus({X: 20, Y: 0}).H).toBeCloseTo(-0.540302, 6);
        expect(derivePhase(phase({system: 'pendulum', seeds: [{X: 0, Y: 40}, {X: 0, Y: 41}]})).energies.map(e => e.kind)).toEqual(['separatrix-exact', 'rotation']);
    });

    it('agrees with the half-angle form over the whole seed grid, and is exact nowhere off theta = 0', () => {
        // H - 1 = omega^2/2 - 2 cos^2(theta/2): a different formula from the implementation's cos(theta).
        for (let X = SEED_RANGE.min; X <= SEED_RANGE.max; X++) {
            for (let Y = SEED_RANGE.min; Y <= SEED_RANGE.max; Y += 1) {
                const theta = X / 20;
                const omega = Y / 20;
                const reference = omega * omega / 2 - 2 * Math.cos(theta / 2) ** 2;
                const status = energyStatus({X, Y}).kind;
                if (X !== 0) expect(status).not.toBe('separatrix-exact');
                if (Math.abs(reference) < 1e-6) continue; // within rounding of the separatrix: either label is honest
                expect(status).toBe(reference < 0 ? 'swing' : 'rotation');
            }
        }
    });

    it('is exact at theta = 0 exactly when |omega| = 2 (an integer test), for every Y', () => {
        for (let Y = SEED_RANGE.min; Y <= SEED_RANGE.max; Y++) {
            expect(energyStatus({X: 0, Y}).kind === 'separatrix-exact').toBe(Math.abs(Y) === 40);
        }
    });
});

describe('logistic state: parse, round trip, errors', () => {
    it('round-trips states and drops derived and unknown fields', () => {
        for (const state of [DEFAULT_LOGISTIC_STATE, {R: 250, X: 1, step: 0}, {R: 400, X: 99, step: 60}]) {
            expect(parseLogisticState(JSON.parse(JSON.stringify(serializeLogisticState(state))))).toEqual({ok: true, value: state});
        }
        expect(parseLogisticState({...DEFAULT_LOGISTIC_STATE, period: 8, kind: 'chaos'})).toEqual({ok: true, value: DEFAULT_LOGISTIC_STATE});
        expect(Object.keys(serializeLogisticState(DEFAULT_LOGISTIC_STATE)).sort()).toEqual(['R', 'X', 'step']);
    });

    it('rejects bad values without clamping', () => {
        const base = serializeLogisticState(DEFAULT_LOGISTIC_STATE);
        expect(rejectedLogistic(undefined)).toMatchObject({field: 'state', reason: 'not-an-object'});
        expect(rejectedLogistic({...base, R: 249})).toMatchObject({field: 'R', reason: 'out-of-range'});
        expect(rejectedLogistic({...base, R: 401})).toMatchObject({field: 'R', reason: 'out-of-range'});
        expect(rejectedLogistic({...base, R: 300.5})).toMatchObject({field: 'R', reason: 'off-grid'});
        expect(rejectedLogistic({...base, R: undefined})).toMatchObject({field: 'R', reason: 'missing'});
        expect(rejectedLogistic({...base, X: 0})).toMatchObject({field: 'X', reason: 'out-of-range'});
        expect(rejectedLogistic({...base, X: 100})).toMatchObject({field: 'X', reason: 'out-of-range'});
        expect(rejectedLogistic({...base, step: 61})).toMatchObject({field: 'step', reason: 'out-of-range'});
        expect(rejectedLogistic({...base, step: Number.POSITIVE_INFINITY})).toMatchObject({field: 'step', reason: 'not-finite'});
        expect([R_RANGE, X_RANGE, STEP_RANGE]).toEqual([{min: 250, max: 400}, {min: 1, max: 99}, {min: 0, max: 60}]);
    });
});

describe('derived logistic values', () => {
    it('caches the period only for grid-valid R: an off-grid or out-of-range R is rejected, never stored', () => {
        const before = periodCacheSize();
        for (const R of [250.5, 251.25, 99, 401, 1e6, -5, NaN]) expect(() => deriveLogistic({R, X: 20, step: 0})).toThrow(RangeError);
        expect(periodCacheSize()).toBe(before);
        deriveLogistic({R: 250, X: 20, step: 0});
        deriveLogistic({R: 250, X: 20, step: 0});
        expect(periodCacheSize()).toBeLessThanOrEqual(before + 1);
        expect(periodCacheSize()).toBeLessThanOrEqual(R_RANGE.max - R_RANGE.min + 1);
    });

    const at = (R: number, X = 20, step = 0): LogisticState => ({R, X, step});

    it('labels by integer tests: fixed point for R < 300, neutral at 300, 2-cycle to 344, then computed only', () => {
        expect(deriveLogistic(at(290)).kind).toBe('fixed-attracting');
        expect(deriveLogistic(at(300)).kind).toBe('neutral-at-3');
        expect(deriveLogistic(at(310)).kind).toBe('two-cycle-attracting');
        expect(deriveLogistic(at(344)).kind).toBe('two-cycle-attracting');
        expect(deriveLogistic(at(345)).kind).toBe('beyond-two-cycle');
        expect(deriveLogistic(at(345)).exact).toBe(false);
        expect(deriveLogistic(at(310)).exact).toBe(true);
    });

    it('matches an independent integer test of the multipliers over every R', () => {
        for (let R = 250; R <= 400; R++) {
            // |f'(x*)| < 1 with f'(x*) = 2 - R/100: |200 - R| < 100 (integers).
            const fixed = Math.abs(200 - R) < 100;
            // 2-cycle multiplier 4 + 2r - r^2 in units of 1e-4: 40000 + 200 R - R^2; attracting iff |.| < 10000 and R > 300.
            const twoCycle = R > 300 && Math.abs(40000 + 200 * R - R * R) < 10000;
            const expected = fixed ? 'fixed-attracting' : R === 300 ? 'neutral-at-3' : twoCycle ? 'two-cycle-attracting' : 'beyond-two-cycle';
            expect(classifyLogisticR(R)).toBe(expected);
        }
        expect(40000 + 200 * 344 - 344 * 344).toBe(-9536); // |.| < 10000
        expect(40000 + 200 * 345 - 345 * 345).toBe(-10025);
    });

    it('gives the checked values: fixed point, 2-cycle at r = 3,1, multiplier 0,59, period table', () => {
        const stable = deriveLogistic(at(290));
        expect(stable.fixedPoint).toBeCloseTo(1 - 1 / 2.9, 12);
        expect(stable.fixedMultiplier).toBeCloseTo(-0.9, 12);
        expect(stable.twoCycle).toBeNull();
        expect(stable.twoCycleMultiplier).toBeNull();
        const two = deriveLogistic(at(310));
        expect(two.twoCycle![0]).toBeCloseTo(0.558014, 6);
        expect(two.twoCycle![1]).toBeCloseTo(0.764567, 6);
        expect(two.twoCycleMultiplier).toBeCloseTo(0.59, 12);
        const period = (R: number) => { const p = deriveLogistic(at(R)).period; return p.kind === 'computed' ? p.period : 0; };
        expect([290, 310, 344, 346, 354, 355].map(period)).toEqual([1, 2, 2, 4, 4, 8]);
        expect(deriveLogistic(at(310)).period).toMatchObject({kind: 'computed', tolerance: 1e-9});
        expect(deriveLogistic(at(400)).period.kind).toBe('none-found');
    });

    it('the 2-cycle values satisfy f(a) = b and f(b) = a (independent of the formula)', () => {
        for (const R of [301, 310, 344, 350, 400]) {
            const [a, b] = deriveLogistic(at(R)).twoCycle!;
            const f = (x: number) => (R / 100) * x * (1 - x);
            expect(f(a)).toBeCloseTo(b, 12);
            expect(f(b)).toBeCloseTo(a, 12);
        }
    });

    it('iterates from the stored start: x0 = 0,2 at r = 4 gives 0,64, 0,9216, 0,28901376 by hand', () => {
        const derived = deriveLogistic(at(400, 20, 3));
        expect(derived.x0).toBe(0.2);
        expect(derived.iterates).toHaveLength(4);
        expect(derived.iterates[1]).toBeCloseTo(0.64, 14);
        expect(derived.iterates[2]).toBeCloseTo(0.9216, 14);
        expect(derived.iterates[3]).toBeCloseTo(0.28901376, 12);
        expect(deriveLogistic(at(290, 20, 0)).iterates).toEqual([0.2]);
    });

    it('does not let the stored start change the computed period (it always starts from 0,2)', () => {
        expect(deriveLogistic(at(355, 50)).period).toEqual(deriveLogistic(at(355, 20)).period);
    });
});
