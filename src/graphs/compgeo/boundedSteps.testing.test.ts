import {stepWhile} from './boundedSteps.testing';

describe('stepWhile', () => {
    test('steps until the condition fails', () => {
        let step = 0;
        stepWhile(() => step < 5, () => { step++; });
        expect(step).toBe(5);
    });

    test('fails instead of hanging when a step makes no progress', () => {
        let calls = 0;
        expect(() => stepWhile(() => true, () => { calls++; }, 10)).toThrow('The trace did not finish within 10 steps.');
        expect(calls).toBe(10);
    });
});
