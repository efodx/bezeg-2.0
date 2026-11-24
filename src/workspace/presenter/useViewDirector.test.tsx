// @vitest-environment jsdom
import {cleanup, renderHook} from '@testing-library/react';
import {StrictMode} from 'react';
import {afterEach, describe, expect, test, vi} from 'vitest';
import type {ViewMarks} from '../../graphs/base/declare/graphDeclaration';
import {ParameterArbiter} from '../../graphs/base/writes/parameterArbiter';
import {ViewAdapter, type ViewBoard} from '../../graphs/base/writes/viewAdapter';
import {beginLearnerGesture} from '../../graphs/base/writes/writeSource';
import type {ViewDirector} from '../view/viewDirector';
import {useViewDirector, type ViewDirectorInput} from './useViewDirector';

class Board implements ViewBoard {
    box = [-10, 7.5, 10, -7.5];
    private handlers = new Set<() => void>();
    getBoundingBox() { return [...this.box]; }
    setBoundingBox(box: number[]) { this.box = [...box]; this.handlers.forEach(h => h()); return undefined; }
    on(_event: 'boundingbox', handler: () => void) { this.handlers.add(handler); }
    off(_event: 'boundingbox', handler: () => void) { this.handlers.delete(handler); }
    pan(dx: number) { this.box = [this.box[0] + dx, this.box[1], this.box[2] + dx, this.box[3]]; this.handlers.forEach(h => h()); }
}

const GEOMETRY = {canvas: {width: 800, height: 600}, free: {x: 300, y: 0, width: 500, height: 600}, obstacles: [{x: 0, y: 0, width: 290, height: 600}]};

afterEach(cleanup);

const MARKS: ViewMarks = {must: [{kind: 'point', x: -8, y: 0}]};

/** A graph, its host and a count of live directors (made minus disposed, seen through `onDirector` and the adapter's subscriptions). */
function setup() {
    const board = new Board();
    const adapter = new ViewAdapter(board);
    const arbiter = new ParameterArbiter({isDomainError: () => false, strict: true});
    adapter.bindTo(arbiter, 'view');
    const subscribe = adapter.subscribe.bind(adapter);
    const counts = {subscriptions: 0, made: 0, cleared: 0};
    adapter.subscribe = listener => { counts.subscriptions++; const stop = subscribe(listener); return () => { counts.subscriptions--; stop(); }; };
    const seen: {director?: ViewDirector} = {};
    const host = {surface: false, frameTick: 0, onDirector: (made: ViewDirector | undefined) => { seen.director = made; if (made) counts.made++; else counts.cleared++; }};
    const graph = {mainViewAdapter: adapter, parameters: arbiter, getDeclaration: () => { throw new Error('the hook reads the passed marks, not the declaration'); }};
    const props = (frameTick: number, extra: Partial<ViewDirectorInput> = {}): ViewDirectorInput => ({
        graph: graph as unknown as ViewDirectorInput['graph'], host, geometry: GEOMETRY, boardSize: {w: 800, h: 600}, frameTick, marks: MARKS, dragging: false, ...extra,
    });
    return {board, seen, counts, props};
}

describe('useViewDirector lifecycle', () => {
    test('under StrictMode a mount and an unmount leave no live director', () => {
        const {seen, counts, props} = setup();
        const {unmount} = renderHook((input: ViewDirectorInput) => useViewDirector(input), {initialProps: props(0), wrapper: StrictMode});
        expect(seen.director).toBeDefined();
        expect(counts.subscriptions).toBe(1);
        expect(counts.made - counts.cleared).toBe(1);
        unmount();
        expect(seen.director).toBeUndefined();
        expect(counts.subscriptions).toBe(0);
        expect(counts.made - counts.cleared).toBe(0);
    });

    test('a gate flip (marks gone) disposes the director and reports none; marks back makes a new one', () => {
        const {seen, counts, props} = setup();
        const {rerender} = renderHook((input: ViewDirectorInput) => useViewDirector(input), {initialProps: props(0)});
        const first = seen.director!;
        const dispose = vi.spyOn(first, 'dispose');
        rerender(props(0, {marks: undefined}));
        expect(dispose).toHaveBeenCalledTimes(1);
        expect(seen.director).toBeUndefined();
        expect(counts.subscriptions).toBe(0);
        rerender(props(0));
        expect(seen.director).toBeDefined();
        expect(seen.director).not.toBe(first);
    });

    test('a geometry change calls setGeometry once; dragging is forwarded', () => {
        const {seen, props} = setup();
        const {rerender} = renderHook((input: ViewDirectorInput) => useViewDirector(input), {initialProps: props(0)});
        const geometry = vi.spyOn(seen.director!, 'setGeometry');
        const dragging = vi.spyOn(seen.director!, 'setDragging');
        rerender(props(0));
        expect(geometry).not.toHaveBeenCalled();
        rerender(props(0, {geometry: {...GEOMETRY, free: {x: 400, y: 0, width: 400, height: 600}}}));
        expect(geometry).toHaveBeenCalledTimes(1);
        rerender(props(0, {geometry: {...GEOMETRY, free: {x: 400, y: 0, width: 400, height: 600}}, dragging: true}));
        expect(dragging).toHaveBeenLastCalledWith(true);
        expect(geometry).toHaveBeenCalledTimes(1);
    });
});

describe('useViewDirector frame tick', () => {
    test('a frameTick change calls frameChanged and resumes a paused director; the first render does not', () => {
        const {board, seen, props} = setup();
        const {rerender} = renderHook((input: ViewDirectorInput) => useViewDirector(input), {initialProps: props(0)});
        expect(seen.director).toBeDefined();
        const spy = vi.spyOn(seen.director!, 'frameChanged');
        expect(spy).not.toHaveBeenCalled();
        rerender(props(0));
        expect(spy).not.toHaveBeenCalled();

        const end = beginLearnerGesture();
        board.pan(2);
        end();
        expect(seen.director!.isPaused()).toBe(true);
        rerender(props(1));
        expect(spy).toHaveBeenCalledTimes(1);
        expect(seen.director!.isPaused()).toBe(false);
    });
});
