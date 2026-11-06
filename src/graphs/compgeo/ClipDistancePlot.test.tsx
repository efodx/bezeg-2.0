import React, {Profiler} from 'react';
import {act, render} from '@testing-library/react';
import {clipBezierPair, ClipPoint} from '../../bezeg/impl/kernels/bezier-clipping';
import {ClippingStepView, clippingStepView} from './bezierClippingView';
import {ClipDistancePlot, ClipDistancePlotController, clipDistancePaths, distanceHull, distanceYRange} from './ClipDistancePlot';
import {setLanguage} from '../../localization';

const A: ClipPoint[] = [[0, 0], [2, 4], [4, 0]];
const B: ClipPoint[] = [[0, 3], [2, -1], [4, 3]];
const trace = clipBezierPair(A, B, {tolerance: 1e-6}).trace;
const stepView = (step: number): ClippingStepView => {
    const view = clippingStepView(trace, step, 1e-6, A, B);
    if (!view) throw new Error(`no view at step ${step}`);
    return view;
};
const dp = (...pairs: Array<[number, number]>) => pairs.map(([t, d]) => ({t, d}));

beforeEach(() => setLanguage('sl'));

test('distanceHull: a triangle, a collinear row, one point and repeated points', () => {
    expect(distanceHull(dp([0, 0], [0.5, 1], [1, 0]))).toEqual(dp([0, 0], [1, 0], [0.5, 1]));
    expect(distanceHull(dp([0, 0], [0.5, 0.5], [1, 1]))).toEqual(dp([0, 0], [1, 1]));
    expect(distanceHull(dp([0, 2], [0.5, 2], [1, 2]))).toEqual(dp([0, 2], [1, 2]));
    expect(distanceHull(dp([0.5, 3]))).toEqual(dp([0.5, 3]));
    expect(distanceHull(dp([0.5, 3], [0.5, 3]))).toEqual(dp([0.5, 3]));
    expect(distanceHull([])).toEqual([]);
    // A cubic row with an inner point on the boundary line is dropped; an interior point is dropped too.
    expect(distanceHull(dp([0, 0], [1 / 3, 0], [2 / 3, 0.2], [1, 0]))).toEqual(dp([0, 0], [1, 0], [2 / 3, 0.2]));
});

test('distanceYRange fits points and band, and has a nonzero span when all are equal', () => {
    const view = stepView(1);
    const [lo, hi] = distanceYRange(view);
    // Distances -3, 1, -3 and the band [-4, 0]: the extent is -4 to 1.
    expect(lo).toBeLessThan(-4);
    expect(hi).toBeGreaterThan(1);
    const flat: ClippingStepView = {...view, distance: dp([0, 2], [0.5, 2], [1, 2]), band: [2, 2]};
    const [flo, fhi] = distanceYRange(flat);
    expect(fhi - flo).toBeGreaterThan(0);
    expect(clipDistancePaths(flat).hull).toBe(clipDistancePaths(flat).hull);
    expect(clipDistancePaths(flat).points).not.toContain('NaN');
    expect(clipDistancePaths(flat).hull).not.toContain('NaN');
});

const paths = () => {
    const get = (name: string) => document.querySelector(`[data-bezier-clipping="inset-${name}"]`)!.getAttribute('d');
    return {points: get('points'), hull: get('hull'), band: get('band'), bandEdges: get('band-edges'), zero: get('zero'), clipped: get('clipped'), clippedEnds: get('clipped-ends')};
};
const caption = () => [...document.querySelectorAll('[data-bezier-clipping="inset-caption"] span')].filter(s => !(s as HTMLElement).hidden).map(s => s.textContent);

test('the inset draws the view as path data, previews have no clipped range, null is an empty state, and a remount redraws', () => {
    const controller = new ClipDistancePlotController();
    const first = render(<ClipDistancePlot controller={controller}/>);
    expect(caption()).toEqual(['Razdalja do debele premice: ni reza za prikaz']);
    expect(Object.values(paths())).toEqual(['', '', '', '', '', '', '']);
    expect(document.querySelector('[data-bezier-clipping="inset-svg"]')!.getAttribute('aria-label')).toBeTruthy();

    // Step 1 is the first real clip: A against the fat line of B, the hull cuts nothing (the range stays 0 to 1).
    const view = stepView(1);
    act(() => controller.push(view));
    const expected = clipDistancePaths(view);
    expect(paths()).toEqual(expected);
    expect(expected.points.match(/M/g)).toHaveLength(6);
    expect(expected.hull).toMatch(/^M.* Z$/);
    expect(paths().clipped).not.toBe('');
    expect(caption()).toEqual(['Razdalja A do debele premice B']);

    // A preview (step 0) has no clipped range; the target is still A.
    const preview = stepView(0);
    expect(preview.preview).toBe(true);
    act(() => controller.push(preview));
    expect(paths().clipped).toBe('');
    expect(paths().clippedEnds).toBe('');
    expect(paths().hull).not.toBe('');

    // Step 3 clips B against A: another caption and another clipped range, from 1/6 to 3/4.
    const later = stepView(3);
    act(() => controller.push(later));
    expect(caption()).toEqual(['Razdalja B do debele premice A']);
    expect(paths()).toEqual(clipDistancePaths(later));
    expect(paths().clipped).not.toBe(paths().hull);

    act(() => controller.push(null));
    expect(Object.values(paths())).toEqual(['', '', '', '', '', '', '']);
    act(() => controller.push(later));
    first.unmount();
    render(<ClipDistancePlot controller={controller}/>);
    expect(paths()).toEqual(clipDistancePaths(later));
});

test('pushing views renders no React: the profiler counts one commit and the elements keep their identity', () => {
    const controller = new ClipDistancePlotController();
    let commits = 0;
    render(<Profiler id="inset" onRender={() => { commits += 1; }}><ClipDistancePlot controller={controller}/></Profiler>);
    const hull = document.querySelector('[data-bezier-clipping="inset-hull"]');
    const before = commits;
    expect(before).toBeGreaterThan(0);
    for (let step = 0; step < 4; step += 1) act(() => controller.push(stepView(step)));
    expect(commits).toBe(before);
    expect(document.querySelector('[data-bezier-clipping="inset-hull"]')).toBe(hull);
    expect(hull!.getAttribute('d')).toBe(clipDistancePaths(stepView(3)).hull);
});
