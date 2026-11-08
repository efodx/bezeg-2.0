import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import InterpolationGraph from './InterpolationGraph';
import HermiteGraph from '../hermite/HermiteGraph';
import {GraphHost} from '../../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {readoutAt} from './interpolationModel';
import {DomainError} from '../../functions/BaseFunctionGraph';
import {INTERPOLATION_POINTS_MAX} from '../../../analysis/interpolation';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => window.localStorage.clear());

class ObservedInterpolation extends InterpolationGraph {
    box() { return this.board.getBoundingBox(); }

    setBox(box: [number, number, number, number]) { this.board.setBoundingBox(box, false); }

    pointElements() { return this['scene']!.pointElements(); }
}

class ObservedHermite extends HermiteGraph {
    box() { return this.board.getBoundingBox(); }

    setBox(box: [number, number, number, number]) { this.board.setBoundingBox(box, false); }
}

function mount<G extends ObservedInterpolation | ObservedHermite>(graph: G) {
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

/** JSXGraph types omit the event trigger the board itself uses for a drag. */
const drag = (point: unknown) => (point as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers(['drag'], []);

const WIDE: [number, number, number, number] = [-50, 50, 50, -50];

describe.each([
    ['Interpolation', () => new ObservedInterpolation()],
    ['Hermite', () => new ObservedHermite()],
] as const)('shared point decisions on %s', (_name, make) => {
    test('decision 1: a default add goes one unit right of the last point; explicit coordinates win exactly', () => {
        const {graph, view} = mount(make());
        act(() => { graph.addPoint(); });
        expect(graph.state.points[4]).toEqual([5, 0]);
        act(() => { graph.addPoint([6.25, -1.125]); });
        expect(graph.state.points[5]).toEqual([6.25, -1.125]);
        view.unmount();
    });

    test('decision 6: an add inside the view never moves it; an add outside refits it', () => {
        const {graph, view} = mount(make());
        act(() => graph.setBox(WIDE));
        act(() => { graph.addPoint(); });
        expect(graph.box()).toEqual(WIDE);
        act(() => { graph.addPoint([900, 900]); });
        expect(graph.box()).not.toEqual(WIDE);
        view.unmount();
    });

    test('decision 6: a typed edit inside the view keeps it; one outside refits it', () => {
        const {graph, view} = mount(make());
        act(() => graph.setBox(WIDE));
        act(() => { graph.editPoint(1, [2, 3]); });
        expect(graph.box()).toEqual(WIDE);
        act(() => { graph.editPoint(1, [800, 3]); });
        expect(graph.box()).not.toEqual(WIDE);
        view.unmount();
    });

    test('a refused explicit add keeps the points and gives the refusal; a lesson action throws a DomainError', () => {
        const {graph, view} = mount(make());
        act(() => graph.setParameterRule('chord'));
        const before = graph.state.points;
        let refusal: unknown;
        act(() => { refusal = graph.addPoint([4, 0]); });
        expect(refusal).toBeTruthy();
        expect(graph.state.points).toBe(before);
        expect(graph.state.notice).toBe('coincident');
        const apply = (action: object) => act(() => graph.getLessonCapabilities().apply({kind: graph instanceof InterpolationGraph ? 'interpolation' : 'hermite', operation: 'add-point', ...action} as never));
        expect(() => apply({x: 4, y: 0})).toThrow(DomainError);
        expect(() => apply({x: Number.NaN, y: 0})).toThrow();
        expect(() => apply({x: 1})).toThrow();
        view.unmount();
    });

    test('a lesson add at the maximum, with or without coordinates, throws a DomainError and adds nothing (task-0 decision 6)', () => {
        const {graph, view} = mount(make());
        const apply = (action: object) => act(() => graph.getLessonCapabilities().apply({kind: graph instanceof InterpolationGraph ? 'interpolation' : 'hermite', operation: 'add-point', ...action} as never));
        while (graph.state.points.length < INTERPOLATION_POINTS_MAX) apply({});
        const full = graph.state.points;
        expect(() => apply({})).toThrow(DomainError);
        expect(() => apply({x: -50, y: 50})).toThrow(DomainError);
        expect(graph.state.points).toBe(full);
        view.unmount();
    });
});

describe('Interpolation drag decisions', () => {
    test('decision 3 and "a drag never refits": a drag past the coordinate limit clamps silently, with no notice and no refit', () => {
        const {graph, view} = mount(new ObservedInterpolation());
        act(() => graph.setBox(WIDE));
        const p1 = graph.pointElements()[1];
        act(() => { p1.moveTo([5000, -7]); drag(p1); });
        expect(graph.state.points[1]).toEqual([1000, -7]);
        expect(graph.state.notice).toBe('');
        expect(graph.box()).toEqual(WIDE);
        view.unmount();
    });

    test('decision 7: a drag that repeats a parameter is refused with its notice and the point returns', () => {
        const {graph, view} = mount(new ObservedInterpolation());
        const [p0, p1] = graph.pointElements();
        act(() => graph.setParameterRule('chord'));
        act(() => { p1.moveTo([p0.X(), p0.Y()]); drag(p1); });
        expect(graph.state.points[1]).toEqual([1, 2]);
        expect(graph.state.notice).toBe('coincident');
        view.unmount();
    });

    test('a coordinate-given add yields the same polynomial as the typed edit of that point', () => {
        const added = mount(new ObservedInterpolation());
        const edited = mount(new ObservedInterpolation());
        act(() => { added.graph.addPoint([2.5, -1.25]); });
        act(() => { edited.graph.addPoint(); edited.graph.editPoint(4, [2.5, -1.25]); });
        expect(added.graph.state.points).toEqual(edited.graph.state.points);
        for (const s of [0, 0.3, 0.77, 1]) {
            expect(readoutAt(added.graph.state.points, 'uniform', s)).toEqual(readoutAt(edited.graph.state.points, 'uniform', s));
        }
        added.view.unmount();
        edited.view.unmount();
    });
});

describe('Hermite view: the tangent tip is framed', () => {
    test('a point inside the view whose tangent tip is outside refits', () => {
        const {graph, view} = mount(new ObservedHermite());
        // Tight box around the default points; the added point (6, 0) sits inside it but its tip (7, 0) does not.
        const tight: [number, number, number, number] = [-1.95, 5.45, 6.95, -4.95];
        act(() => { graph.addPoint(); });
        act(() => graph.setBox(tight));
        act(() => { graph.addPoint(); });
        expect(graph.state.points[5]).toEqual([6, 0]);
        // The refit frames the tip (7, 0) with a margin; an unmoved view would end at 6.95.
        expect(graph.box()[2]).toBeGreaterThan(7);
        view.unmount();
    });
});
