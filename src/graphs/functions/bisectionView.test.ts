import {describe, expect, test} from 'vitest';
import {bisectionExample, bisectionHistory, type BisectionExampleId} from '../../analysis/bisection';
import {bisectionFollowView, bisectionViewMarks} from './bisectionView';

const LESSON_BRACKETS: readonly [BisectionExampleId, number, number][] = [['square-minus-two', 1, 2], ['sign-step', -1, 1], ['cubic', -1.5, 2]];

describe('the bisection follow view', () => {
    for (const [example, a, b] of LESSON_BRACKETS) {
        test(`${example}: every iteration frames (a, f(a)), (b, f(b)), (m, f(m)) and the bracket`, () => {
            const f = bisectionExample(example).value;
            for (let step = 0; step <= 30; step++) {
                const history = bisectionHistory(example, a, b, step);
                const [left, top, right, bottom] = bisectionFollowView(history);
                const last = history.steps.at(-1);
                // The board draws the bracket the last step bisected (a, b, m), not the one it leaves; the bracket it leaves lies inside it.
                const [shownA, shownB] = last ? [last.a, last.b] : [history.a, history.b];
                const points: [number, number][] = [[shownA, f(shownA)], [shownB, f(shownB)], [shownA, 0], [shownB, 0], [history.currentA, 0], [history.currentB, 0]];
                if (last) points.push([last.mid, f(last.mid)], [last.mid, 0]);
                for (const [x, y] of points) {
                    expect(x, `step ${step} x`).toBeGreaterThanOrEqual(left);
                    expect(x, `step ${step} x`).toBeLessThanOrEqual(right);
                    expect(y, `step ${step} y of x=${x}`).toBeLessThan(top);
                    expect(y, `step ${step} y of x=${x}`).toBeGreaterThan(bottom);
                }
                if (history.termination !== undefined) break;
            }
        });
        test(`${example}: the marks name the same points`, () => {
            const f = bisectionExample(example).value;
            const history = bisectionHistory(example, a, b, 2);
            const must = bisectionViewMarks(history).must;
            const last = history.steps.at(-1)!;
            for (const x of [last.a, last.b, last.mid]) {
                expect(must).toContainEqual({kind: 'point', x, y: 0});
                expect(must).toContainEqual({kind: 'point', x, y: f(x)});
            }
        });
    }
});
