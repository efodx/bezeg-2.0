import React from 'react';
import {render} from '@testing-library/react';
import {DelaunayControls, DelaunayStatus} from './DelaunayControls';
import {TriangulationControls} from './TriangulationControls';
import {DecasteljauAnimationControls} from '../curves/bezier/DecasteljauAnimationControls';
import {setLanguage} from '../../localization';

beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const noop = () => undefined;

test('Delaunay angles read 30° and 45,5° without trailing zeros (Slovenian) and with a decimal point (English)', () => {
    const status: DelaunayStatus = {
        step: 0, length: 2, note: 'phase-start', flips: 0, illegalCount: 0, minNow: 30, minStart: 45.5,
        anglesNow: [30, 45.5, 104.5], anglesStart: [30, 45.5, 104.5], triangles: [],
    };
    const actions = {nextStep: noop, playPause: noop, reset: noop, loadExample: noop, selectTriangle: noop};
    const view = render(<DelaunayControls status={status} playing={false} actions={actions}/>);
    const text = (key: string) => view.container.querySelector(`[data-readout="${key}"]`)!.textContent;
    expect(text('min-now')).toBe('Najmanjši kot zdaj: 30°');
    expect(text('min-start')).toContain('45,5°');
    expect(text('angles-now')).toContain('30; 45,5; 104,5');
    view.unmount();
    setLanguage('en');
    const english = render(<DelaunayControls status={status} playing={false} actions={actions}/>);
    expect(english.container.querySelector('[data-readout="min-start"]')!.textContent).toContain('45.5°');
});

test('Triangulation minimum angle reads 30° without trailing zeros', () => {
    const view = render(<TriangulationControls
        readout={{n: 3, boundary: {k: 3, corners: 3, collinear: 0}, counts: {points: 3, triangles: 1, edges: 3, interiorEdges: 0, hullEdges: 3}, minAngle: 30, minAngleBefore: 12.5}}
        refusal={undefined} event={undefined} edges={[]} selected={undefined} triangulationShown actions={{selectEdge: noop, flip: noop}}/>);
    expect(view.container.querySelector('[data-readout="angle"]')!.textContent).toBe('Najmanjši kot zdaj: 30°');
    expect(view.container.textContent).toContain('12,5°');
});

test('De Casteljau keeps two decimals in t with the language separator', () => {
    const props = {parameter: 0.5, speed: 1, status: 'ready' as const, onPlay: noop, onPause: noop, onStop: noop, onReplay: noop, onParameterChange: noop, onSpeedChange: noop};
    const view = render(<DecasteljauAnimationControls {...props}/>);
    expect(view.container.querySelector('output')!.textContent).toBe('t = 0,50');
    view.unmount();
    setLanguage('en');
    const english = render(<DecasteljauAnimationControls {...props}/>);
    expect(english.container.querySelector('output')!.textContent).toBe('t = 0.50');
});
