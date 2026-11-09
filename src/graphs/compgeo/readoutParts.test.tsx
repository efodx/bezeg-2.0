import React from 'react';
import {render} from '@testing-library/react';
import {DelaunayControls, DelaunayStatus} from './DelaunayControls';
import {EarClippingControls} from './EarClippingControls';
import {NotablePointsPanel} from './NotablePointsPanel';
import {TriangulationControls} from './TriangulationControls';
import {setLanguage} from '../../localization';

beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const noop = () => undefined;

test('Delaunay: the step counter is the shared one and the readout list keeps its data-readout items', () => {
    const status: DelaunayStatus = {
        step: 2, length: 7, note: 'phase-start', flips: 1, illegalCount: 0, minNow: 30, minStart: 20,
        anglesNow: [30, 60, 90], anglesStart: [20, 60, 100], triangles: [],
    };
    const view = render(<DelaunayControls status={status} playing={false} exampleId={undefined}
                                          actions={{nextStep: noop, playPause: noop, reset: noop, loadExample: noop, selectTriangle: noop}}/>);
    expect(view.container.querySelector('[data-step-counter]')!.textContent).toBe('Korak 3 od 7');
    expect(view.getByRole('list', {name: /.+/, hidden: false}).querySelectorAll('[data-readout]')).toHaveLength(6);
});

test('Triangulation: its announcement is the one LiveReadout, not a hand-written status paragraph', () => {
    const view = render(<TriangulationControls readout={undefined} refusal={undefined} edges={[]} selected={undefined} triangulationShown
                                               event={{kind: 'rebuilt'} as never} actions={{selectEdge: noop, flip: noop}}/>);
    expect(view.container.querySelector('[data-triangulation="live"]')).toBeNull();
    expect(view.container.querySelectorAll('[data-readout-live]')).toHaveLength(1);
    expect(view.container.querySelector('[data-triangulation-live]')!.textContent).not.toBe('');
});

test('Notable points: the state chip is plain text and the LiveReadout carries the sentence', () => {
    const view = render(<NotablePointsPanel analysis={{kind: 'missing', have: 1} as never} exampleId={undefined} outsideView={new Set()} onExample={noop}/>);
    const chip = view.container.querySelector('.pointset-status')!;
    expect(chip.getAttribute('role')).toBeNull();
    expect(view.container.querySelector('[data-notable-live]')!.textContent).toBe(chip.textContent + (chip.textContent!.endsWith('.') ? '' : '.'));
});

test('Ear clipping: the reversed-orientation line is plain text and is announced through the one LiveReadout', () => {
    const view = render(<EarClippingControls refusal={undefined} reversed step={0} length={4} playing={false} event={undefined}
                                             trianglesSoFar={0} summary={undefined} exampleId={undefined}
                                             actions={{nextStep: noop, playPause: noop, reset: noop, loadExample: noop}}/>);
    const note = view.container.querySelector('[data-ear-clipping="reversed"]')!;
    expect(note.getAttribute('role')).toBeNull();
    expect(view.container.querySelectorAll('[data-readout-live]')).toHaveLength(1);
    expect(view.container.querySelector('[data-ear-clipping-live]')!.textContent).toContain(note.textContent!.replace(/\.$/, ''));
});
