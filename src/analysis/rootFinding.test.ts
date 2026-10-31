import {secantLine, tangentLine} from './derivative';
import {
    isRootFindingExampleId, isRootFindingStepCount, isRootStart, isSecantStartPair, newtonHistory, ROOT_FINDING_EXAMPLE_IDS,
    ROOT_FINDING_EXAMPLES, ROOT_FINDING_MAX_STEPS, ROOT_START_MAX, ROOT_START_MIN, rootFindingExample, secantHistory,
} from './rootFinding';

const square = ROOT_FINDING_EXAMPLES['square-minus-two'];
const cycle = ROOT_FINDING_EXAMPLES['cubic-two-cycle'];

/** Independent bisection on a sign-change bracket, used only to check stored reference roots. */
function bisect(f: (x: number) => number, a: number, b: number): number {
    for (let i = 0; i < 200; i++) {
        const m = (a + b) / 2;
        if (f(a) * f(m) <= 0) b = m; else a = m;
    }
    return (a + b) / 2;
}

describe('root finding examples (acceptance 1)', () => {
    it('lists the closed example set with plain and undelimited LaTeX forms', () => {
        expect(ROOT_FINDING_EXAMPLE_IDS.map(id => ROOT_FINDING_EXAMPLES[id].plain)).toEqual(['x^2 - 2', 'x^3 - 2x + 2', 'x^3 - x']);
        for (const id of ROOT_FINDING_EXAMPLE_IDS) {
            const example = rootFindingExample(id);
            expect(example.id).toBe(id);
            expect(example.latex).not.toMatch(/\\\(|\\\[|\$/);
            expect(example.derivativeLatex).not.toMatch(/\\\(|\\\[|\$/);
            expect(isRootStart(example.defaultStart) && isSecantStartPair(example.defaultStart, example.defaultSecondStart)).toBe(true);
        }
    });

    it('has hand-written derivatives matching a central difference quotient', () => {
        for (const id of ROOT_FINDING_EXAMPLE_IDS) {
            const {value, derivative} = ROOT_FINDING_EXAMPLES[id];
            for (let x = -3; x <= 3; x += 0.37) {
                const h = 1e-5;
                expect(derivative(x)).toBeCloseTo((value(x + h) - value(x - h)) / (2 * h), 6);
            }
        }
    });

    it('stores reference roots that bisection confirms and the iterations did not produce', () => {
        const brackets = {'square-minus-two': [1, 2], 'cubic-two-cycle': [-2, -1], 'cubic-three-roots': [0.5, 2]} as const;
        for (const id of ROOT_FINDING_EXAMPLE_IDS) {
            const example = ROOT_FINDING_EXAMPLES[id];
            const [a, b] = brackets[id];
            expect(Math.abs(bisect(example.value, a, b) - example.referenceRoot)).toBeLessThan(1e-12);
            expect(example.referenceRootSource).toMatch(/bisection/);
        }
    });
});

describe('Newton history (acceptance 2, 3)', () => {
    it('matches the N1 iterates and errors', () => {
        const history = newtonHistory('square-minus-two', 1, 4);
        const expected = [1, 1.5, 1.4166667, 1.4142157, 1.4142136];
        history.iterates.forEach((x, k) => expect(x).toBeCloseTo(expected[k], 7));
        expect(history.termination).toBe('running');
        expect(history.stepsTaken).toBe(4);
        const errors = history.iterates.slice(1).map(x => Math.abs(x - square.referenceRoot));
        [8.6e-2, 2.5e-3, 2.1e-6, 1.6e-12].forEach((e, k) => expect(errors[k] / e).toBeGreaterThan(0.95));
        [8.6e-2, 2.5e-3, 2.1e-6, 1.6e-12].forEach((e, k) => expect(errors[k] / e).toBeLessThan(1.1));
    });

    it('moves to the x-intercept of the tangent at the previous iterate', () => {
        const history = newtonHistory('square-minus-two', 1, 4);
        for (let k = 0; k < 4; k++) {
            const tangent = tangentLine(square, history.iterates[k]);
            expect(history.iterates[k + 1]).toBeCloseTo(-tangent.intercept / tangent.slope, 12);
            expect(Math.abs(history.iterates[k + 1] + tangent.intercept / tangent.slope)).toBeLessThan(1e-12);
        }
    });

    it('stops on a flat tangent, an exact root and a non-finite value without dividing by zero', () => {
        const flat = newtonHistory('square-minus-two', 0, 5);
        expect(flat.termination).toBe('flat-tangent');
        expect(flat.iterates).toEqual([0]);
        const root = newtonHistory('cubic-three-roots', 1, 5);
        expect(root).toMatchObject({termination: 'root-found', iterates: [1], stepsTaken: 0});
        const spy = vi.spyOn(square, 'value').mockReturnValue(Number.NaN);
        try {
            expect(newtonHistory('square-minus-two', 1, 3).termination).toBe('non-finite');
        } finally {
            spy.mockRestore();
        }
    });

    it('detects an exact root reached by iteration', () => {
        const history = newtonHistory('cubic-three-roots', 2, 10);
        expect(history.termination === 'root-found' || history.termination === 'running').toBe(true);
        expect(Math.abs(history.iterates[history.iterates.length - 1] - 1)).toBeLessThan(1e-10);
    });

    it('reports running before and step-cap at the cap, and is deterministic', () => {
        expect(newtonHistory('square-minus-two', 1, 0).termination).toBe('running');
        expect(newtonHistory('cubic-three-roots', 0.5, 3)).toEqual(newtonHistory('cubic-three-roots', 0.5, 3));
    });
});

describe('N2 when Newton fails (acceptance 4)', () => {
    it('cycles 1, 0 exactly according to the integer recurrence', () => {
        // The recurrence x -> x - (x^3 - 2x + 2) / (3x^2 - 2) = (2x^3 - 2) / (3x^2 - 2) stays integral on 0 and 1.
        const step = (x: number): number => (2 * x ** 3 - 2) / (3 * x ** 2 - 2);
        expect([step(0), step(step(0))]).toEqual([1, 0]);
        const history = newtonHistory('cubic-two-cycle', 0, 10);
        expect(history.iterates).toEqual([0, 1, 0]);
        expect(history.termination).toBe('repeated-iterate');
        expect(history.stepsTaken).toBeLessThan(ROOT_FINDING_MAX_STEPS);
    });

    it('converges from -2 to the bisection root', () => {
        const history = newtonHistory('cubic-two-cycle', -2, 30);
        const last = history.iterates[history.iterates.length - 1];
        expect(Math.abs(last - bisect(cycle.value, -2, -1))).toBeLessThan(1e-10);
        expect(Math.abs(last - (-1.769292354238631))).toBeLessThan(1e-10);
        expect(['root-found', 'repeated-iterate', 'running']).toContain(history.termination);
    });

    it('reports the distinct cap status for a long non-repeating run, and running below the cap', () => {
        const capped = newtonHistory('cubic-two-cycle', 0.14, ROOT_FINDING_MAX_STEPS);
        expect(capped.termination).toBe('step-cap');
        expect(capped.stepsTaken).toBe(ROOT_FINDING_MAX_STEPS);
        expect(newtonHistory('cubic-two-cycle', 0.14, ROOT_FINDING_MAX_STEPS - 1).termination).toBe('running');
    });
});

describe('secant history (acceptance 5)', () => {
    it('matches the N3 iterates', () => {
        const history = secantHistory('square-minus-two', 1, 2, 4);
        const expected = [1, 2, 1.333333, 1.4, 1.414634, 1.414211];
        expect(history.iterates).toHaveLength(6);
        history.iterates.forEach((x, k) => expect(x).toBeCloseTo(expected[k], 6));
        expect(history.stepsTaken).toBe(4);
        expect(history.termination).toBe('running');
    });

    it('moves to the x-intercept of the secant through the last two iterates', () => {
        const history = secantHistory('square-minus-two', 1, 2, 4);
        for (let k = 1; k < 5; k++) {
            const h = history.iterates[k] - history.iterates[k - 1];
            const line = secantLine(square, history.iterates[k - 1], h);
            expect(Math.abs(history.iterates[k + 1] + line.intercept / line.slope)).toBeLessThan(1e-12);
        }
    });

    it('rejects equal starts and stops on a flat secant', () => {
        expect(() => secantHistory('square-minus-two', 1, 1, 3)).toThrow(RangeError);
        expect(isSecantStartPair(1, 1)).toBe(false);
        const flat = secantHistory('square-minus-two', -1, 1, 3);
        expect(flat.termination).toBe('flat-secant');
        expect(flat.iterates).toEqual([-1, 1]);
    });

    it('stops on a repeated iterate', () => {
        const history = secantHistory('cubic-three-roots', 0.5, 2, 60);
        expect(history.termination).not.toBe('step-cap');
        expect(history.stepsTaken).toBeLessThan(ROOT_FINDING_MAX_STEPS);
    });
});

describe('validation (acceptance 6)', () => {
    it('rejects non-finite and out-of-range starts, bad step counts and unknown ids', () => {
        for (const bad of [Number.NaN, Infinity, -Infinity, ROOT_START_MIN - 0.01, ROOT_START_MAX + 0.01]) {
            expect(isRootStart(bad)).toBe(false);
            expect(() => newtonHistory('square-minus-two', bad, 1)).toThrow(RangeError);
            expect(() => secantHistory('square-minus-two', bad, 1, 1)).toThrow(RangeError);
            expect(() => secantHistory('square-minus-two', 1, bad, 1)).toThrow(RangeError);
        }
        expect(isRootStart('1')).toBe(false);
        expect(isRootStart(ROOT_START_MIN) && isRootStart(ROOT_START_MAX)).toBe(true);
        for (const bad of [-1, 1.5, ROOT_FINDING_MAX_STEPS + 1, Number.NaN]) {
            expect(isRootFindingStepCount(bad)).toBe(false);
            expect(() => newtonHistory('square-minus-two', 1, bad)).toThrow(RangeError);
        }
        expect(isRootFindingExampleId('nope')).toBe(false);
        expect(isRootFindingExampleId(3)).toBe(false);
        // @ts-expect-error an id outside the closed list is rejected at runtime too
        expect(() => rootFindingExample('nope')).toThrow(RangeError);
        // @ts-expect-error an id outside the closed list is rejected at runtime too
        expect(() => newtonHistory('nope', 1, 1)).toThrow(RangeError);
    });
});
