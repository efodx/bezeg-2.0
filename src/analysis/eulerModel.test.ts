import {
    checkEulerModel, chooseEulerExample, chooseEulerStep, DEFAULT_EULER_MODEL, EulerModel, eulerView, exactAt, exactReaches, moveEulerInitial,
    nextRevealed, parseEulerModel, plannedSteps, setEulerEnd, setEulerX0,
} from './eulerModel';
import {eulerExample, eulerPath, EulerStep} from './odeEuler';

const model = (patch: Partial<EulerModel>): EulerModel => ({...DEFAULT_EULER_MODEL, ...patch});
const run = (example: EulerModel['example'], step: EulerStep) => eulerView(model({example, step}));
const shown = (value: number | undefined, decimals: number) => Number(value!.toFixed(decimals));

describe('the numbers of lesson N5 (end x = 1 from (0, 1))', () => {
    test("y' = y: end values 2.25, 2.4414, 2.5658; errors 0.468, 0.277, 0.152; ratios 1.69, 1.82", () => {
        const views = ([0.5, 0.25, 0.125] as const).map(step => run('exponential', step));
        expect(views.map(view => shown(view.endValue, 4))).toEqual([2.25, 2.4414, 2.5658]);
        // the error is shown with four significant digits; the lesson's three decimals are the exact error rounded
        expect(views.map(view => shown(view.exact! - view.endValue!, 3))).toEqual([0.468, 0.277, 0.152]);
        expect(views.map(view => view.error)).toEqual([0.4683, 0.2769, 0.1525]);
        expect(views.map(view => view.doubleError)).toEqual([0.7183, 0.4683, 0.2769]);
        expect(shown(views[1].ratio, 2)).toBe(1.69);
        expect(shown(views[2].ratio, 2)).toBe(1.82);
        expect(shown(views[0].ratio, 2)).toBe(1.53);
    });

    test("y' = x - y: end values 0.5, 0.6328, 0.6872 against 2/e; errors 0.2358, 0.1029, 0.0485", () => {
        const views = ([0.5, 0.25, 0.125] as const).map(step => run('linear-relaxation', step));
        expect(views.map(view => shown(view.endValue, 4))).toEqual([0.5, 0.6328, 0.6872]);
        expect(views[0].exact).toBeCloseTo(2 / Math.E, 12);
        expect(views.map(view => shown(Math.abs(view.exact! - view.endValue!), 4))).toEqual([0.2358, 0.1029, 0.0485]);
        expect(views.map(view => view.error)).toEqual([0.2358, 0.1029, 0.04854]);
    });

    test('the ratio is the quotient of the error at 2h and the error at h as displayed', () => {
        const view = run('exponential', 0.25);
        expect(view.doubleStep).toBe(0.5);
        expect(view.ratio).toBeCloseTo(view.doubleError! / view.error!, 12);
    });

    test('the first Euler step equals y0 + h F(x0, y0) exactly for h = 0.5', () => {
        const start = model({example: 'linear-relaxation', x0: 0.5, y0: 0.75, step: 0.5, xEnd: 2});
        expect(eulerView(start).path.nodes[1]).toEqual({x: 1, y: 0.75 + 0.5 * (0.5 - 0.75)});
        const growth = model({example: 'exponential', x0: 0, y0: 1, step: 0.5});
        expect(eulerView(growth).path.nodes[1].y).toBe(1 + 0.5 * eulerExample('exponential').F(0, 1));
    });
});

describe('divergent runs', () => {
    test("y' = y² from (0, 1) with h = 0.5 reaches x = 1 but has no exact value (pole at 1); with end 3 it leaves the window", () => {
        const atOne = eulerView(model({example: 'blow-up'}));
        expect(atOne.path.termination).toBe('reached-end');
        expect(atOne.exact).toBeUndefined();
        expect(atOne.error).toBeUndefined();
        expect(exactReaches(model({example: 'blow-up'}))).toBe(false);
        const longer = eulerView(model({example: 'blow-up', xEnd: 3}));
        expect(longer.path.termination).toBe('left-window');
        expect(longer.endValue).toBeUndefined();
        expect(longer.visibleNodes).toBe(longer.path.nodes);
        expect(longer.path.nodes.every(node => Number.isFinite(node.y) && Math.abs(node.y) <= 1000)).toBe(true);
    });

    test('the exact curve is cut at the pole and outside [x0, xEnd]', () => {
        const blow = model({example: 'blow-up', xEnd: 3});
        expect(exactAt(blow, 0.5)).toBeCloseTo(2, 12);
        expect(exactAt(blow, 1)).toBeNaN();
        expect(exactAt(blow, 2)).toBeNaN();
        expect(exactAt(blow, -1)).toBeNaN();
    });
});

describe('the reveal', () => {
    test('shows the first k steps, Next step advances and returns to all steps after the last', () => {
        const base = model({step: 0.25});
        expect(eulerView(model({...base, revealed: 2})).visibleNodes).toHaveLength(3);
        expect(eulerView(model({...base, revealed: 0})).visibleNodes).toHaveLength(1);
        expect(eulerView(model({...base, revealed: 99})).visibleNodes).toHaveLength(5);
        expect(nextRevealed(base, 4)).toBe(1);
        expect(nextRevealed(model({...base, revealed: 3}), 4)).toBeNull();
        expect(plannedSteps(base)).toBe(4);
    });
});

describe('edits', () => {
    test('typed values outside the ranges or breaking the order are rejected with the rule they broke', () => {
        expect(moveEulerInitial(DEFAULT_EULER_MODEL, 11, 1)).toMatchObject({ok: false, issue: {kind: 'x-range'}});
        expect(moveEulerInitial(DEFAULT_EULER_MODEL, 0, 10.5)).toMatchObject({ok: false, issue: {kind: 'y-range'}});
        expect(moveEulerInitial(DEFAULT_EULER_MODEL, NaN, 0)).toMatchObject({ok: false});
        expect(setEulerX0(DEFAULT_EULER_MODEL, 1.5)).toMatchObject({ok: false, issue: {kind: 'order', moving: 'x0'}});
        expect(setEulerEnd(DEFAULT_EULER_MODEL, -0.5)).toMatchObject({ok: false, issue: {kind: 'order', moving: 'xEnd'}});
        expect(setEulerEnd(DEFAULT_EULER_MODEL, Infinity)).toMatchObject({ok: false});
        expect(chooseEulerStep(DEFAULT_EULER_MODEL, 0.3)).toMatchObject({ok: false, issue: {kind: 'step'}});
        expect(chooseEulerExample(DEFAULT_EULER_MODEL, 'logistic')).toMatchObject({ok: false, issue: {kind: 'example'}});
    });

    test('the widest allowed run is at most the kernel limit, so an accepted model never throws in the kernel', () => {
        const widest = model({x0: -10, xEnd: 10, step: 0.0625});
        expect(plannedSteps(widest)).toBe(320);
        expect(() => eulerPath(eulerExample('exponential'), -10, 1, 0.0625, 10)).not.toThrow();
        expect(() => eulerView(model({x0: -10, y0: 10, xEnd: 10, step: 0.0625, example: 'blow-up'}))).not.toThrow();
    });
});

describe('the Preset model', () => {
    const valid = {example: 'linear-relaxation', x0: -1, y0: 2, step: 0.25, xEnd: 3, showExact: false, revealed: 4};

    test('a valid model round trips and drops unknown properties', () => {
        expect(parseEulerModel({...valid, extra: 1})).toEqual(valid);
        expect(parseEulerModel({...valid, revealed: null})).toEqual({...valid, revealed: null});
        expect(parseEulerModel(DEFAULT_EULER_MODEL)).toEqual(DEFAULT_EULER_MODEL);
    });

    test.each([
        ['example', {example: 'logistic'}, 'example'], ['x0 range', {x0: 10.5}, 'x-range'], ['xEnd range', {xEnd: -11}, 'x-range'],
        ['y0 range', {y0: 10.01}, 'y-range'], ['order', {x0: 2, xEnd: 1}, 'order'], ['step', {step: 0.3}, 'step'], ['step 2', {step: 2}, 'step'],
        ['toggle', {showExact: 'yes'}, 'toggle'], ['reveal negative', {revealed: -1}, 'reveal'], ['reveal fraction', {revealed: 1.5}, 'reveal'],
        ['reveal too large', {revealed: 321}, 'reveal'],
    ])('rejects %s with the rule it broke', (_name, patch, kind) => {
        const check = checkEulerModel({...valid, ...patch});
        expect(check).toMatchObject({ok: false, issue: {kind}});
        expect(parseEulerModel({...valid, ...patch})).toBeUndefined();
    });

    test.each([[null], [[]], [{}], ['text'], [{...valid, x0: NaN}], [{...valid, y0: '1'}], [{...valid, revealed: undefined}], [{...valid, step: '0.5'}]])(
        'rejects data of the wrong shape without a specific rule: %j', data => {
            expect(parseEulerModel(data)).toBeUndefined();
        });
});
