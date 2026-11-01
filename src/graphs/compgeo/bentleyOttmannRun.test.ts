import {Rational} from '../../compgeo/rational';
import type {Segment} from '../../compgeo/sweep/segments';
import {BENTLEY_OTTMANN_EXAMPLE_1, BENTLEY_OTTMANN_EXAMPLE_2} from './bentleyOttmannPresetCollection';
import {rationalText, runBentleyOttmann} from './bentleyOttmannRun';
import {segmentsOf} from '../../compgeo/pointSetModel';

const seg = (ax: number, ay: number, bx: number, by: number): Segment => ({a: {x: ax, y: ay}, b: {x: bx, y: by}});
const C2 = segmentsOf(BENTLEY_OTTMANN_EXAMPLE_1);

/** The status after each popped event, taken at the last step of that event (before the next pop). */
function statusPerEvent(run: ReturnType<typeof runBentleyOttmann>) {
    const out: number[][] = [];
    for (let i = 0; i < run.length; i++) {
        const next = i + 1 < run.length ? run.event(i + 1) : undefined;
        if (run.event(i)?.note !== 'start' && (next === undefined || next.note === 'pop' || next.note === 'done')) out.push([...run.view(i).status]);
    }
    return out;
}

describe('runBentleyOttmann', () => {
    test('the default example pops the 13 events of the spec with the listed status after each', () => {
        const run = runBentleyOttmann(C2);
        expect(run.refusal).toBeUndefined();
        expect(run.eventCount).toBe(13);
        const pops = [...Array(run.length).keys()].filter(i => run.event(i)?.note === 'pop');
        expect(pops).toHaveLength(13);
        expect(pops.map(i => `${run.view(i).position!.x.format()},${run.view(i).position!.y.format()}`)).toEqual([
            '2,5', '4,5', '0,4', '6,4', '33/20,29/10', '87/20,29/10', '3,2', '21/16,7/8', '75/16,7/8', '0,0', '6,0', '1,-1', '5,-1',
        ]);
        expect(statusPerEvent(run).slice(0, 13)).toEqual([
            [2], [2, 3], [1, 2, 3], [1, 2, 3, 0], [2, 1, 3, 0], [2, 1, 0, 3], [2, 0, 1, 3], [0, 2, 1, 3], [0, 2, 3, 1],
            [2, 3, 1], [2, 3], [3], [],
        ]);
    });

    test('step 0 is the full queue before any pop; the leading schedule events are not steps', () => {
        const run = runBentleyOttmann(C2);
        expect(run.event(0)?.note).toBe('start');
        expect(run.view(0).position).toBeNull();
        expect(run.view(0).queue).toHaveLength(8);
        expect(run.view(0).queue.map(q => q.kind).slice(0, 4)).toEqual(['upper', 'upper', 'upper', 'upper']);
        expect(run.event(1)?.note).toBe('pop');
        expect(run.view(run.length - 1).done).toBe(true);
    });

    test('the five crossings with exact fractions, and the counter equals the neighbour tests of the trace', () => {
        const run = runBentleyOttmann(C2);
        const last = run.view(run.length - 1);
        const crossings = last.reports.filter(r => r.segments.length === 2).map(r => `${r.segments.join('')}@${r.point.x.format()},${r.point.y.format()}`);
        expect(crossings.sort()).toEqual(['01@3,2', '02@21/16,7/8', '03@87/20,29/10', '12@33/20,29/10', '13@75/16,7/8']);
        expect(run.pairTotal).toBe(6);
        let tests = 0;
        for (let i = 0; i < run.length; i++) {
            if (run.event(i)?.note === 'test') tests++;
            expect(run.view(i).neighbourTests).toBe(tests);
        }
        expect(last.neighbourTests).toBe(tests);
    });

    test('the degenerate example reports one point with all four segments and reverses the block in one swap', () => {
        const run = runBentleyOttmann(segmentsOf(BENTLEY_OTTMANN_EXAMPLE_2));
        const last = run.view(run.length - 1);
        expect(last.reports.map(r => r.segments)).toEqual([[0, 1, 2, 3]]);
        const swaps = [...Array(run.length).keys()].map(i => run.event(i)).filter(e => e?.note === 'swap');
        expect(swaps.map(e => e?.block)).toEqual([[0, 3]]);
        const at = [...Array(run.length).keys()].find(i => run.event(i)?.note === 'swap')!;
        expect(run.view(at - 1).status).toHaveLength(4);
        expect([...run.view(at).status]).toEqual([...run.view(at - 1).status].reverse());
    });

    test('a refused input gives an empty run with the refusal', () => {
        const run = runBentleyOttmann([seg(0, 0, 4, 0), seg(2, 0, 6, 0)]);
        expect(run.refusal).toEqual({reason: 'overlap', pair: [0, 1]});
        expect([run.length, run.view(0).queue.length, run.clamp(5)]).toEqual([0, 0, 0]);
    });

    test('stale step indices are clamped', () => {
        const run = runBentleyOttmann(C2);
        expect([run.clamp(-3), run.clamp(1e9), run.clamp(NaN), run.clamp(2.7)]).toEqual([0, run.length - 1, 0, 2]);
    });
});

describe('rationalText', () => {
    const decimal = (v: number, d: number) => v.toFixed(d).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
    test('shows the fraction next to its decimal and marks a rounded decimal', () => {
        expect(rationalText(Rational.of(21, 16), decimal)).toMatchObject({fraction: '21/16', decimal: '1,3125', exact: true, integer: false});
        expect(rationalText(Rational.of(1, 3), decimal)).toMatchObject({fraction: '1/3', decimal: '0,3333', exact: false});
        expect(rationalText(Rational.of(3), decimal)).toMatchObject({fraction: '3', integer: true});
    });
});
