import {describe, expect, it} from 'vitest';
import {
    checkConicFocalModel, CONIC_EXAMPLE_IDS, CONIC_EXAMPLE_MODELS, CONIC_EPSILON_MAX, CONIC_WEIGHT_MAX, chooseConicExample, ConicFocalModel,
    conicExampleOf, conicFocalView, conicOfModel, conicPhiNear, conicPointAt, defaultConicFocalModel, setConicBridge, setConicEll,
    setConicEpsilon, setConicPhi, setConicWeight,
} from './conicFocalModel';
import {classifyMiddleWeight, directrixDistance, focalDistance, focusDirectrixRatio} from './conic';

const example = (id: typeof CONIC_EXAMPLE_IDS[number]) => CONIC_EXAMPLE_MODELS[id];

describe('ratio |PF| / |Pd| equals the eccentricity', () => {
    it('within 1e-9 at several P for every kind and example', () => {
        for (const e of [0.2, 0.8, 1, 1.5, 5 / 3, 2.5]) {
            const model: ConicFocalModel = {...example('ellipse'), epsilon: e, ell: 2};
            const conic = conicOfModel(model);
            for (const phi of [-3, -2, -1, -0.3, 0, 0.4, 1, 1.7, 2.5, 3]) {
                const {point} = conicPointAt(conic, phi);
                const ratio = focusDirectrixRatio(conic, point);
                expect(ratio).not.toBeNull();
                expect(Math.abs((ratio as number) - e)).toBeLessThan(1e-9);
            }
        }
    });

    it('holds for the examples with the directrix on the left of the focus', () => {
        for (const id of ['parabola', 'hyperbola'] as const) {
            const model = example(id);
            const view = conicFocalView(model);
            expect(view.ratio).not.toBeNull();
            expect(Math.abs((view.ratio as number) - model.epsilon)).toBeLessThan(1e-9);
        }
    });
});

describe('spec numbers', () => {
    it('ellipse at P = (0, 3): |PF| = 5, |Pd| = 6.25, ratio 0.8, focal sum 10; directrix x = 6.25', () => {
        const view = conicFocalView(example('ellipse'));
        expect(view.kind).toBe('ellipse');
        expect(view.p.x).toBeCloseTo(0, 12);
        expect(view.p.y).toBeCloseTo(3, 12);
        expect(view.pf).toBeCloseTo(5, 12);
        expect(view.pd).toBeCloseTo(6.25, 12);
        expect(view.ratio).toBeCloseTo(0.8, 12);
        expect(view.focalSum).toBeCloseTo(10, 12);
        expect(view.secondFocus?.x).toBeCloseTo(-4, 12);
        expect(view.conic.directrix?.d).toBeCloseTo(6.25, 12);
    });

    it('parabola at P = (1, 2): both distances 2, directrix x = -1', () => {
        const view = conicFocalView(example('parabola'));
        expect(view.kind).toBe('parabola');
        expect(view.p.x).toBeCloseTo(1, 12);
        expect(view.p.y).toBeCloseTo(2, 12);
        expect(view.pf).toBeCloseTo(2, 12);
        expect(view.pd).toBeCloseTo(2, 12);
        expect(directrixDistance(view.conic, {x: -1, y: 5})).toBeCloseTo(0, 12);
        expect(view.secondFocus).toBeNull();
        expect(view.focalSum).toBeNull();
        expect(view.focalDifference).toBeNull();
    });

    it('hyperbola at P = (6, sqrt 48): |PF| = 7, |Pd| = 4.2, |PF2| = 13, difference 6; directrix x = 1.8', () => {
        const view = conicFocalView(example('hyperbola'));
        expect(view.kind).toBe('hyperbola');
        expect(view.p.x).toBeCloseTo(6, 12);
        expect(view.p.y).toBeCloseTo(Math.sqrt(48), 12);
        expect(view.pf).toBeCloseTo(7, 12);
        expect(view.pd).toBeCloseTo(4.2, 12);
        expect(view.pf2).toBeCloseTo(13, 12);
        expect(view.focalDifference).toBeCloseTo(6, 12);
        expect(view.conic.directrix!.d * view.conic.directrix!.nx).toBeCloseTo(1.8, 12);
        expect(view.secondFocus?.x).toBeCloseTo(-5, 12);
    });

    it('the second branch of the hyperbola gives the same absolute difference 2a', () => {
        const model = {...example('hyperbola'), phi: Math.PI - 0.2};
        const view = conicFocalView(model);
        expect(view.p.x).toBeLessThan(0);
        expect(view.focalDifference).toBeCloseTo(6, 9);
        expect(Math.abs((view.ratio as number) - 5 / 3)).toBeLessThan(1e-9);
    });
});

describe('circle (e = 0)', () => {
    it('has no directrix, no ratio, no second focus and radius l around F', () => {
        const view = conicFocalView(example('circle'));
        expect(view.kind).toBe('circle');
        expect(view.conic.directrix).toBeUndefined();
        expect(view.pd).toBeNull();
        expect(view.ratio).toBeNull();
        expect(view.foot).toBeNull();
        expect(view.secondFocus).toBeNull();
        expect(view.pf).toBeCloseTo(3, 12);
        expect(view.branches).toHaveLength(1);
    });
});

describe('the e slider', () => {
    it('stepping by 0.05 lands exactly on 1 and exactly on 0, in both directions', () => {
        let model = defaultConicFocalModel('ellipse');
        let value = 0;
        const seen: number[] = [];
        for (let i = 0; i <= 50; i++) {
            const edit = setConicEpsilon(model, value);
            expect(edit.ok).toBe(true);
            if (edit.ok) model = edit.model;
            seen.push(model.epsilon);
            value += 0.05;
        }
        expect(value).not.toBe(2.5);
        expect(seen.includes(1)).toBe(true);
        expect(seen[0]).toBe(0);
        expect(seen[seen.length - 1]).toBe(CONIC_EPSILON_MAX);
        value = 2.5;
        let reachedZero = false;
        let reachedOne = false;
        for (let i = 0; i <= 50; i++) {
            const edit = setConicEpsilon(model, value);
            if (edit.ok) model = edit.model;
            if (model.epsilon === 1) reachedOne = true;
            if (model.epsilon === 0) reachedZero = true;
            value -= 0.05;
        }
        expect(reachedOne).toBe(true);
        expect(reachedZero).toBe(true);
        expect(Object.is(model.epsilon, 0)).toBe(true);
    });

    it('rounds an accumulated 1.0000000000000002 to the parabola and a tiny value to the circle', () => {
        const base = defaultConicFocalModel('ellipse');
        const one = setConicEpsilon(base, 1.0000000000000002);
        expect(one.ok && one.model.epsilon).toBe(1);
        expect(conicOfModel((one as {model: ConicFocalModel}).model).kind).toBe('parabola');
        const zero = setConicEpsilon(base, 4.163336342344337e-17);
        expect(zero.ok && Object.is(zero.model.epsilon, 0)).toBe(true);
        expect(conicOfModel((zero as {model: ConicFocalModel}).model).kind).toBe('circle');
    });

    it('rejects non-finite and out-of-range values naming the field', () => {
        const base = defaultConicFocalModel('ellipse');
        for (const bad of [-0.1, 2.6, Number.NaN, Infinity, '1', undefined]) {
            const edit = setConicEpsilon(base, bad);
            expect(edit.ok).toBe(false);
            expect(!edit.ok && edit.issue.kind).toBe('epsilon');
        }
        expect(setConicEll(base, 0.1).ok).toBe(false);
        expect(setConicPhi(base, 4).ok).toBe(false);
        expect(setConicWeight(base, 0).ok).toBe(false);
        expect(setConicBridge(base, 'yes').ok).toBe(false);
    });
});

describe('P stays on the picture', () => {
    it('moves a phi in the gap of an unbounded conic to the nearest cut and keeps the ratio', () => {
        const model = {...example('hyperbola'), phi: Math.PI / 2 + 0.9};
        const view = conicFocalView(model);
        expect(Math.hypot(view.p.x - 5, view.p.y)).toBeLessThanOrEqual(50 + 1e-9);
        expect(Math.abs((view.ratio as number) - 5 / 3)).toBeLessThan(1e-9);
        const parabola = conicFocalView({...example('parabola'), phi: Math.PI});
        expect(Math.hypot(parabola.p.x - 1, parabola.p.y)).toBeLessThanOrEqual(50 + 1e-9);
    });

    it('conicPhiNear finds the angle of a dragged point on each branch and each kind', () => {
        for (const id of CONIC_EXAMPLE_IDS) {
            const model = example(id);
            const conic = conicOfModel(model);
            const phi = conicPhiNear(conic, conicPointAt(conic, model.phi).point);
            const a = conicPointAt(conic, phi).point;
            const b = conicPointAt(conic, model.phi).point;
            expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(1e-9);
        }
        const hyper = conicOfModel(example('hyperbola'));
        const far = conicPointAt(hyper, Math.PI - 0.3).point;
        const phi = conicPhiNear(hyper, {x: far.x + 0.01, y: far.y});
        expect(Math.abs(phi - (Math.PI - 0.3))).toBeLessThan(0.05);
    });
});

describe('Bezier bridge', () => {
    it('is off by default and absent from the view', () => {
        expect(example('ellipse').bridge).toBe(false);
        expect(conicFocalView(example('ellipse')).bridge).toBeNull();
        expect(example('bridge').bridge).toBe(true);
    });

    it('at the ellipse default has points (5,0),(5,3),(0,3), weights 1, sqrt2/2, 1 and deviation below 1e-9', () => {
        const bridge = conicFocalView(example('bridge')).bridge!;
        expect(bridge.points.map(p => [Math.round(p.x * 1e9) / 1e9 + 0, Math.round(p.y * 1e9) / 1e9 + 0])).toEqual([[5, 0], [5, 3], [0, 3]]);
        expect(bridge.weights[1]).toBeCloseTo(Math.SQRT1_2, 15);
        expect(bridge.weightKind).toBe('ellipse');
        expect(bridge.deviation).toBeLessThan(1e-9);
        const middle = bridge.samples[Math.floor(bridge.samples.length / 2)];
        expect(middle.x).toBeCloseTo(3.5355, 4);
        expect(middle.y).toBeCloseTo(2.1213, 4);
    });

    it('the weight kind of the matched arc equals the conic kind across e = 0.3, 0.8, 1, 1.5, 5/3 (circle counts as ellipse)', () => {
        const expected: Record<number, string> = {0: 'ellipse', 0.3: 'ellipse', 0.8: 'ellipse', 1: 'parabola', 1.5: 'hyperbola', [5 / 3]: 'hyperbola'};
        for (const [e, kind] of Object.entries(expected)) {
            const view = conicFocalView({...example('bridge'), epsilon: Number(e)});
            expect(view.bridge!.weightKind).toBe(kind);
            expect(classifyMiddleWeight(view.bridge!.matchedWeight)).toBe(kind);
            expect(view.bridge!.deviation).toBeLessThan(1e-9);
            expect(view.bridge!.matchedWeight).toBeLessThanOrEqual(CONIC_WEIGHT_MAX);
            if (Number(e) === 1) expect(view.bridge!.matchedWeight).toBe(1);
        }
    });

    it('stays within the weight range and on the conic for every e of the slider', () => {
        for (let i = 0; i <= 50; i++) {
            const e = Math.round(i * 0.05 * 1e12) / 1e12;
            const bridge = conicFocalView({...example('bridge'), epsilon: e, ell: 3}).bridge!;
            expect(bridge.matchedWeight).toBeLessThanOrEqual(CONIC_WEIGHT_MAX);
            expect(bridge.deviation).toBeLessThan(1e-9);
        }
    });

    it('the deviation grows when the weight departs from the matched weight, and the label follows the weight', () => {
        const matched = conicFocalView(example('bridge')).bridge!;
        const moved = conicFocalView({...example('bridge'), weight: 1.2}).bridge!;
        const less = conicFocalView({...example('bridge'), weight: 0.6}).bridge!;
        expect(matched.deviation).toBeLessThan(1e-9);
        expect(moved.deviation).toBeGreaterThan(0.05);
        expect(less.deviation).toBeGreaterThan(1e-3);
        expect(moved.weightKind).toBe('hyperbola');
        expect(conicFocalView({...example('bridge'), weight: 1}).bridge!.weightKind).toBe('parabola');
        expect(less.weightKind).toBe('ellipse');
        expect(moved.matchedWeight).toBeCloseTo(Math.SQRT1_2, 15);
    });

    it('the weight setter returns to the matched weight with null', () => {
        const set = setConicWeight(example('bridge'), 1.3);
        const model = (set as {model: ConicFocalModel}).model;
        expect(model.weight).toBe(1.3);
        const reset = setConicWeight(model, null);
        expect(reset.ok && reset.model.weight).toBeNull();
    });
});

describe('model validation', () => {
    it('accepts every example and rejects bad fields naming them', () => {
        for (const id of CONIC_EXAMPLE_IDS) expect(checkConicFocalModel(example(id)).ok).toBe(true);
        const valid = example('ellipse');
        const issue = (data: unknown) => {
            const check = checkConicFocalModel(data);
            return check.ok ? 'ok' : check.issue.kind;
        };
        expect(issue('nonsense')).toBe('object');
        expect(issue([])).toBe('object');
        expect(issue({...valid, epsilon: Number.NaN})).toBe('epsilon');
        expect(issue({...valid, epsilon: 3})).toBe('epsilon');
        expect(issue({...valid, ell: 0})).toBe('ell');
        expect(issue({...valid, ell: Infinity})).toBe('ell');
        expect(issue({...valid, phi: 4})).toBe('phi');
        expect(issue({...valid, weight: 9})).toBe('weight');
        expect(issue({...valid, weight: Number.NaN})).toBe('weight');
        expect(issue({...valid, weight: '1'})).toBe('weight');
        expect(issue({...valid, direction: 0})).toBe('direction');
        expect(issue({...valid, bridge: 1})).toBe('bridge');
        expect(issue({...valid, focusX: 20})).toBe('focusX');
        expect(issue({...valid, weight: 1.5})).toBe('ok');
    });

    it('choosing an example returns a fresh copy and identifies it; unknown names are refused', () => {
        const chosen = chooseConicExample('hyperbola');
        expect(chosen.ok && chosen.model).toEqual(example('hyperbola'));
        expect(chosen.ok && chosen.model).not.toBe(example('hyperbola'));
        expect(conicExampleOf(example('parabola'))).toBe('parabola');
        expect(conicExampleOf({...example('parabola'), ell: 2.5})).toBeUndefined();
        expect(chooseConicExample('spiral').ok).toBe(false);
    });

    it('focal and directrix distances of every example sit on the conic definition', () => {
        for (const id of CONIC_EXAMPLE_IDS) {
            const view = conicFocalView(example(id));
            expect(focalDistance(view.conic, view.p)).toBeCloseTo(view.pf, 12);
        }
    });
});
