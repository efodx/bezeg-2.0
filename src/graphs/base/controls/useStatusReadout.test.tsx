import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {useStatusReadout} from './useStatusReadout';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

test('a settled readout does not publish during rapid changes and publishes the last text once after the quiet period', () => {
    const {result, rerender} = renderHook(({text}) => useStatusReadout(text, true), {initialProps: {text: 'Korak 1 od 5'}});
    const readout = result.current;
    const seen: string[] = [];
    const unsubscribe = readout.subscribe(() => seen.push(readout.getSnapshot()));
    for (let move = 0; move < 12; move += 1) {
        rerender({text: `Korak 1 od ${3 + (move % 2)}`});
        act(() => { vi.advanceTimersByTime(40); });
    }
    expect(seen).toEqual([]);
    act(() => { vi.advanceTimersByTime(600); });
    expect(seen).toEqual(['Korak 1 od 4.']);
    unsubscribe();
});

test('every compgeo trace readout that a point drag can change is settled', () => {
    const dir = join(__dirname, '..', '..', 'compgeo');
    for (const file of ['BentleyOttmann', 'BezierHulls', 'Delaunay', 'EarClipping', 'IntervalSweep', 'MonotonePartition', 'MonotoneTriangulation', 'Voronoi', 'Triangulation']) {
        const source = readFileSync(join(dir, `${file}Controls.tsx`), 'utf8');
        const start = source.indexOf('useStatusReadout(');
        const end = start + source.slice(start).search(/;\r?\n/);
        expect(source.slice(start, end), file).toMatch(/, true\)$/);
    }
});
