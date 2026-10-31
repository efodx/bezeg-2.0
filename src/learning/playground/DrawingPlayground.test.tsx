import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import DrawingPlayground, {EXAMPLE_DRAWING, PLAYGROUND_STORAGE_KEY, PlaygroundOverlayContext} from './DrawingPlayground';
import {Drawing, validateDrawing} from './drawingModel';
import {setLanguage} from '../../localization';
import {appStorage} from '../../storage/appStorage';

const renderPlayground = (props: Partial<React.ComponentProps<typeof DrawingPlayground>> = {}) => {
    const result = render(<DrawingPlayground mode="draw" {...props}/>);
    return {...result, svg: result.container.querySelector('svg') as SVGSVGElement};
};
const down = (el: Element, x: number, y: number, extra: object = {}) => fireEvent.pointerDown(el, {clientX: x, clientY: y, pointerId: 1, button: 0, ...extra});
const move = (el: Element, x: number, y: number, extra: object = {}) => fireEvent.pointerMove(el, {clientX: x, clientY: y, pointerId: 1, ...extra});
const up = (el: Element, x: number, y: number, extra: object = {}) => fireEvent.pointerUp(el, {clientX: x, clientY: y, pointerId: 1, ...extra});
const click = (svg: Element, x: number, y: number) => { down(svg, x, y); up(svg, x, y); };
const stored = (): Drawing | null => { const raw = appStorage.getItem(PLAYGROUND_STORAGE_KEY); return raw ? validateDrawing(JSON.parse(raw)) : null; };
const anchorEl = (container: HTMLElement, i: number) => container.querySelector(`[data-role="anchor"][data-index="${i}"]`)!;
const handleEl = (container: HTMLElement, i: number, which: 'in' | 'out') => container.querySelector(`[data-role="handle-${which}"][data-index="${i}"]`)!;
const button = (name: string | RegExp) => screen.getByRole('button', {name}) as HTMLButtonElement;

/** Open path of three corners A(100,100) B(300,100) C(300,300). */
function threeCorners(svg: SVGSVGElement) {
    click(svg, 100, 100);
    click(svg, 300, 100);
    click(svg, 300, 300);
}

beforeEach(() => { appStorage.removeItem(PLAYGROUND_STORAGE_KEY); });
afterEach(() => { cleanup(); act(() => setLanguage('sl')); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('pointer editing', () => {
    it('appends corner anchors on click and persists after the commit', () => {
        const {svg, container} = renderPlayground();
        expect(stored()).toBeNull();
        threeCorners(svg);
        expect(container.querySelectorAll('[data-role="anchor"]')).toHaveLength(3);
        expect(stored()!.anchors.map(a => a.type)).toEqual(['corner', 'corner', 'corner']);
        expect(stored()!.anchors[1].position).toEqual({x: 300, y: 100});
    });

    it('press-drag on empty canvas appends a smooth-mirrored anchor whose outgoing handle follows the pointer', () => {
        const {svg} = renderPlayground();
        click(svg, 100, 100);
        down(svg, 400, 300);
        move(svg, 450, 300);
        move(svg, 500, 320);
        expect(stored()!.anchors).toHaveLength(1); // nothing saved mid-drag
        up(svg, 500, 320);
        const a = stored()!.anchors[1];
        expect(a.type).toBe('smooth-mirrored');
        expect(a.handleOut).toEqual({x: 500, y: 320});
        expect(a.handleIn).toEqual({x: 300, y: 280});
    });

    it('closes by clicking the first anchor and then deselects on empty clicks', () => {
        const {svg, container} = renderPlayground();
        threeCorners(svg);
        const first = anchorEl(container, 0);
        down(first, 100, 100);
        up(first, 100, 100);
        expect(stored()!.closed).toBe(true);
        click(svg, 700, 500);
        expect(stored()!.anchors).toHaveLength(3);
        expect(button('Izbriši točko').disabled).toBe(true);
    });

    it('does not close with fewer than two anchors', () => {
        const {svg, container} = renderPlayground();
        click(svg, 100, 100);
        const first = anchorEl(container, 0);
        down(first, 100, 100);
        up(first, 100, 100);
        expect(stored()!.closed).toBe(false);
    });

    it('drags an anchor with its handles as one undo step', () => {
        const {svg, container} = renderPlayground();
        threeCorners(svg);
        const b = anchorEl(container, 1);
        down(b, 300, 100);
        move(svg, 320, 120);
        move(svg, 350, 150);
        up(svg, 350, 150);
        expect(stored()!.anchors[1].position).toEqual({x: 350, y: 150});
        fireEvent.click(button('Razveljavi'));
        expect(stored()!.anchors[1].position).toEqual({x: 300, y: 100});
        expect(stored()!.anchors).toHaveLength(3); // one undo undid the whole drag, not a click
        fireEvent.click(button('Ponovi'));
        expect(stored()!.anchors[1].position).toEqual({x: 350, y: 150});
    });

    it('keeps mirrored handles mirrored and turns Alt-drag into smooth-aligned', () => {
        const {svg, container} = renderPlayground();
        click(svg, 100, 300);
        down(svg, 400, 300);
        move(svg, 460, 300);
        up(svg, 460, 300);
        click(svg, 700, 300);
        const out = handleEl(container, 1, 'out');
        down(out, 460, 300);
        move(svg, 460, 340);
        up(svg, 460, 340);
        let a = stored()!.anchors[1];
        expect(a.type).toBe('smooth-mirrored');
        expect(a.handleIn).toEqual({x: 340, y: 260});
        // Alt-drag: the incoming handle keeps the length it had before the drag and stays opposite the outgoing one.
        const lenBefore = Math.hypot(a.handleIn.x - 400, a.handleIn.y - 300);
        down(handleEl(container, 1, 'out'), 460, 340);
        move(svg, 400, 400, {altKey: true});
        up(svg, 400, 400, {altKey: true});
        a = stored()!.anchors[1];
        expect(a.type).toBe('smooth-aligned');
        expect(Math.hypot(a.handleIn.x - 400, a.handleIn.y - 300)).toBeCloseTo(lenBefore, 6);
        expect(a.handleIn.x - 400).toBeCloseTo(0, 6);
        expect(a.handleIn.y).toBeLessThan(300);
    });

    it('hides handles that have no segment at the ends of an open path', () => {
        const {svg, container} = renderPlayground();
        threeCorners(svg);
        expect(handleEl(container, 0, 'in')).toBeNull();
        expect(handleEl(container, 0, 'out')).not.toBeNull();
        expect(handleEl(container, 2, 'out')).toBeNull();
        expect(container.querySelectorAll('[data-role^="handle"]')).toHaveLength(4);
    });

    it('toggles corner and smooth-mirrored on double-click', () => {
        const {svg, container} = renderPlayground();
        threeCorners(svg);
        fireEvent.doubleClick(anchorEl(container, 1));
        expect(stored()!.anchors[1].type).toBe('smooth-mirrored');
        fireEvent.doubleClick(anchorEl(container, 1));
        expect(stored()!.anchors[1].type).toBe('corner');
    });

    it('lost pointer capture commits the last draft; pointercancel discards the drag', () => {
        const {svg, container} = renderPlayground();
        threeCorners(svg);
        down(anchorEl(container, 1), 300, 100);
        move(svg, 340, 140);
        fireEvent.lostPointerCapture(svg, {pointerId: 1});
        expect(stored()!.anchors[1].position).toEqual({x: 340, y: 140});
        down(anchorEl(container, 1), 340, 140);
        move(svg, 500, 500);
        fireEvent.pointerCancel(svg, {pointerId: 1});
        expect(stored()!.anchors[1].position).toEqual({x: 340, y: 140});
        move(svg, 600, 600); // no stuck drag
        expect(stored()!.anchors[1].position).toEqual({x: 340, y: 140});
        expect(container.querySelector('path')).not.toBeNull();
    });
});

describe('toolbar', () => {
    it('has correct disabled states, deletes, clears and loads the example', () => {
        const {svg, container} = renderPlayground();
        expect(button('Razveljavi').disabled).toBe(true);
        expect(button('Ponovi').disabled).toBe(true);
        expect(button('Počisti').disabled).toBe(true);
        expect(button('Zapri obliko').disabled).toBe(true);
        expect(button('Kotna').disabled).toBe(true);
        threeCorners(svg);
        expect(button('Počisti').disabled).toBe(false);
        expect(button('Zapri obliko').disabled).toBe(false);
        expect(button('Kotna').disabled).toBe(false);
        expect(button('Kotna').getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(button('Gladka (G1)'));
        expect(stored()!.anchors[2].type).toBe('smooth-aligned');
        fireEvent.click(button('Izbriši točko'));
        expect(stored()!.anchors).toHaveLength(2);
        fireEvent.click(button('Počisti'));
        expect(stored()!.anchors).toHaveLength(0);
        fireEvent.click(button('Razveljavi'));
        expect(stored()!.anchors).toHaveLength(2);
        fireEvent.click(button('Naloži primer'));
        expect(stored()).toEqual(EXAMPLE_DRAWING);
        expect(container.querySelectorAll('[data-role="anchor"]')).toHaveLength(EXAMPLE_DRAWING.anchors.length);
        expect(button('Dodaj točko').disabled).toBe(true); // closed
    });

    it('the authored example is valid', () => {
        expect(validateDrawing(JSON.parse(JSON.stringify(EXAMPLE_DRAWING)))).toEqual(EXAMPLE_DRAWING);
        expect(EXAMPLE_DRAWING.anchors.length).toBeGreaterThanOrEqual(6);
        expect(new Set(EXAMPLE_DRAWING.anchors.map(a => a.type)).size).toBe(3);
    });
});

describe('keyboard', () => {
    it('builds and closes a four-anchor shape and moves a handle without a pointer', () => {
        const {container} = renderPlayground();
        for (let i = 0; i < 4; i++) fireEvent.click(button('Dodaj točko'));
        expect(stored()!.anchors).toHaveLength(4);
        const first = anchorEl(container, 0);
        fireEvent.keyDown(first, {key: 'ArrowRight'});
        fireEvent.keyDown(anchorEl(container, 0), {key: 'ArrowDown', shiftKey: true});
        expect(stored()!.anchors[0].position).toEqual({x: 505, y: 337.5});
        fireEvent.keyDown(anchorEl(container, 0), {key: 'Enter'});
        expect(stored()!.closed).toBe(true);
        const out = handleEl(container, 0, 'out');
        expect(out.getAttribute('aria-label')).toBe('Izhodna ročica točke 1');
        const before = stored()!.anchors[0].handleOut;
        fireEvent.keyDown(out, {key: 'ArrowUp'});
        expect(stored()!.anchors[0].handleOut).toEqual({x: before.x, y: before.y - 5});
    });

    it('Delete removes the focused anchor and undo/redo shortcuts work', () => {
        const {svg, container} = renderPlayground();
        threeCorners(svg);
        fireEvent.keyDown(anchorEl(container, 1), {key: 'Delete'});
        expect(stored()!.anchors).toHaveLength(2);
        fireEvent.keyDown(anchorEl(container, 0), {key: 'z', ctrlKey: true});
        expect(stored()!.anchors).toHaveLength(3);
        fireEvent.keyDown(anchorEl(container, 0), {key: 'z', ctrlKey: true, shiftKey: true});
        expect(stored()!.anchors).toHaveLength(2);
        fireEvent.keyDown(anchorEl(container, 0), {key: 'z', metaKey: true});
        expect(stored()!.anchors).toHaveLength(3);
    });

    it('coalesces key repeat into one undo step and orders tab stops along the path', () => {
        const {container} = renderPlayground();
        fireEvent.click(button('Dodaj točko'));
        const el = () => anchorEl(container, 0);
        fireEvent.keyDown(el(), {key: 'ArrowRight'});
        fireEvent.keyDown(el(), {key: 'ArrowRight', repeat: true});
        fireEvent.keyDown(el(), {key: 'ArrowRight', repeat: true});
        fireEvent.keyUp(el(), {key: 'ArrowRight'});
        expect(stored()!.anchors[0].position.x).toBe(515);
        fireEvent.click(button('Razveljavi'));
        expect(stored()!.anchors[0].position.x).toBe(500);
        fireEvent.click(button('Dodaj točko'));
        const order = Array.from(container.querySelectorAll('[tabindex="0"]')).map(e => `${e.getAttribute('data-role')}${e.getAttribute('data-index')}`);
        expect(order).toEqual(['anchor0', 'handle-out0', 'handle-in1', 'anchor1']);
    });

    it('announces a debounced summary', () => {
        vi.useFakeTimers();
        renderPlayground();
        for (let i = 0; i < 3; i++) fireEvent.click(button('Dodaj točko'));
        const live = screen.getByRole('status');
        expect(live.textContent).toBe('');
        act(() => { vi.advanceTimersByTime(499); });
        expect(live.textContent).toBe('');
        act(() => { vi.advanceTimersByTime(2); });
        expect(live.textContent).toBe('Število točk: 3, oblika je odprta');
        fireEvent.click(button('Zapri obliko'));
        act(() => { vi.advanceTimersByTime(600); });
        expect(live.textContent).toBe('Število točk: 3, oblika je zaprta');
    });
});

describe('localization', () => {
    it('updates names, toolbar and live region when the language switches', () => {
        vi.useFakeTimers();
        const {svg, container} = renderPlayground();
        threeCorners(svg);
        fireEvent.click(button('Zapri obliko'));
        act(() => { vi.advanceTimersByTime(600); });
        fireEvent.click(button('Gladka (C1)'));
        expect(anchorEl(container, 2).getAttribute('aria-label')).toBe('Točka 3, gladka (C1)');
        act(() => setLanguage('en'));
        expect(anchorEl(container, 2).getAttribute('aria-label')).toBe('Point 3, smooth (C1)');
        expect(anchorEl(container, 0).getAttribute('aria-label')).toBe('Point 1, corner (C0)');
        expect(handleEl(container, 2, 'in').getAttribute('aria-label')).toBe('Incoming handle of point 3');
        expect(button('Undo')).toBeTruthy();
        expect(button('Load example')).toBeTruthy();
        expect(screen.getByRole('status').textContent).toBe('Number of points: 3, closed shape');
        expect(screen.getByRole('group', {name: /Drawing tools/}).getAttribute('aria-label')).toBe('Drawing tools');
    });
});

describe('persistence', () => {
    it('restores the drawing in a remount and a second instance reads the same key', () => {
        const first = renderPlayground();
        threeCorners(first.svg);
        const second = renderPlayground();
        expect(second.container.querySelectorAll('[data-role="anchor"]')).toHaveLength(3);
        first.unmount();
        const third = renderPlayground({mode: 'inspect'});
        expect(third.container.querySelectorAll('[data-role="anchor"]')).toHaveLength(3);
    });

    it('starts empty with a warning for invalid stored data', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        for (const bad of ['{not json', JSON.stringify({anchors: [{position: {x: 'a'}}], closed: false}), 'null']) {
            appStorage.setItem(PLAYGROUND_STORAGE_KEY, bad);
            const {container, unmount} = renderPlayground();
            expect(container.querySelectorAll('[data-role="anchor"]')).toHaveLength(0);
            unmount();
        }
        expect(warn).toHaveBeenCalledTimes(3);
    });

    it('works when storage throws on every access', () => {
        const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
        const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
        const {svg, container} = renderPlayground();
        threeCorners(svg);
        expect(container.querySelectorAll('[data-role="anchor"]')).toHaveLength(3);
        expect(set).toHaveBeenCalled();
        get.mockRestore();
        set.mockRestore();
    });
});

describe('lifecycle', () => {
    it('adds no window or document listeners, also when unmounted mid-drag', () => {
        const spies = [vi.spyOn(window, 'addEventListener'), vi.spyOn(document, 'addEventListener')];
        const removers = [vi.spyOn(window, 'removeEventListener'), vi.spyOn(document, 'removeEventListener')];
        const {svg, container, unmount} = renderPlayground();
        threeCorners(svg);
        down(anchorEl(container, 1), 300, 100);
        move(svg, 340, 140);
        unmount();
        // React's development build briefly adds balanced 'error' listeners while dispatching; ignore those only.
        const names = (list: typeof spies) => list.map(s => s.mock.calls.map(c => c[0]).filter(n => n !== 'error').sort());
        expect(names(spies)).toEqual([[], []]);
        expect(names(removers)).toEqual([[], []]);
        expect(stored()!.anchors[1].position).toEqual({x: 300, y: 100}); // unfinished drag was discarded
    });

});

describe('extension point', () => {
    it('renders overlays inside the SVG with the live drawing and selection', () => {
        const overlays = vi.fn((_ctx: PlaygroundOverlayContext) => <circle data-testid="overlay" r={1}/>);
        const {svg, container} = renderPlayground({mode: 'inspect', overlays});
        expect(container.querySelectorAll('[data-role="anchor"]')).toHaveLength(EXAMPLE_DRAWING.anchors.length); // inspect starts from the example
        fireEvent.click(button('Počisti'));
        threeCorners(svg);
        expect(svg.contains(screen.getByTestId('overlay'))).toBe(true);
        const ctx = overlays.mock.calls[overlays.mock.calls.length - 1][0] as {drawing: Drawing; selectedAnchor: number | null; mode: string};
        expect(ctx.drawing.anchors).toHaveLength(3);
        expect(ctx.selectedAnchor).toBe(2);
        expect(ctx.mode).toBe('inspect');
        expect(container.querySelector('.playground--inspect')).not.toBeNull();
    });
});

describe('PG2 repairs', () => {
    const anchorCount = (container: HTMLElement) => container.querySelectorAll('[data-role="anchor"]').length;

    it('toggles the type when the double click is retargeted to the svg by pointer capture', () => {
        const {svg} = renderPlayground();
        threeCorners(svg);
        fireEvent.doubleClick(svg, {clientX: 300, clientY: 100});
        expect(stored()!.anchors[1].type).toBe('smooth-mirrored');
        fireEvent.doubleClick(svg, {clientX: 700, clientY: 500}); // empty canvas: nothing
        expect(stored()!.anchors.map(a => a.type)).toEqual(['corner', 'smooth-mirrored', 'corner']);
    });

    it('a double click on empty canvas adds one anchor and one undo step', () => {
        for (const retargeted of [false, true]) {
            cleanup(); appStorage.removeItem(PLAYGROUND_STORAGE_KEY);
            const {svg, container} = renderPlayground();
            click(svg, 100, 100);
            click(svg, 300, 100);
            click(svg, 500, 400);
            const added = anchorEl(container, 2); // the second press of a real double click lands on the new anchor
            click(added, 500, 400);
            fireEvent.doubleClick(retargeted ? svg : added, {clientX: 500, clientY: 400});
            expect(anchorCount(container)).toBe(3);
            expect(stored()!.anchors[2].type).toBe('corner');
            fireEvent.click(button('Razveljavi'));
            expect(anchorCount(container)).toBe(2);
        }
    });

    it('a double click on the first anchor closes the shape without also toggling its type', () => {
        const {svg, container} = renderPlayground();
        threeCorners(svg);
        const first = anchorEl(container, 0);
        click(first, 100, 100);
        click(first, 100, 100);
        fireEvent.doubleClick(first, {clientX: 100, clientY: 100});
        expect(stored()!.closed).toBe(true);
        expect(stored()!.anchors[0].type).toBe('corner');
        fireEvent.click(button('Razveljavi'));
        expect(stored()!.closed).toBe(false);
        expect(stored()!.anchors).toHaveLength(3);
    });

    it('renders a focus ring circle in anchors and handles and no outline-based focus on the groups', () => {
        const {svg, container} = renderPlayground();
        threeCorners(svg);
        expect(anchorEl(container, 0).querySelector('circle.playground-focus-ring')).not.toBeNull();
        expect(handleEl(container, 0, 'out').querySelector('circle.playground-focus-ring')).not.toBeNull();
    });

    it('limits Ctrl+Z to the canvas and toolbar, not controls() content', () => {
        const {svg, container} = renderPlayground({controls: () => <input aria-label="field"/>});
        threeCorners(svg);
        const notPrevented = fireEvent.keyDown(screen.getByLabelText('field'), {key: 'z', ctrlKey: true});
        expect(notPrevented).toBe(true);
        expect(anchorCount(container)).toBe(3);
        fireEvent.keyDown(button('Razveljavi'), {key: 'z', ctrlKey: true});
        expect(stored()!.anchors).toHaveLength(2);
    });

    it('stores a held arrow key once when released, not on every repeat', () => {
        const {container} = renderPlayground();
        fireEvent.click(button('Dodaj točko'));
        const spy = vi.spyOn(appStorage, 'setItem');
        const el = () => anchorEl(container, 0);
        fireEvent.keyDown(el(), {key: 'ArrowRight'});
        expect(spy).toHaveBeenCalledTimes(1);
        for (let i = 0; i < 5; i++) fireEvent.keyDown(el(), {key: 'ArrowRight', repeat: true});
        expect(spy).toHaveBeenCalledTimes(1);
        fireEvent.keyUp(el(), {key: 'ArrowRight'});
        expect(spy).toHaveBeenCalledTimes(2);
        expect(stored()!.anchors[0].position.x).toBe(530);
    });

    it('Load example when already loaded commits no undo step; undo clears the selection', () => {
        const {svg, container} = renderPlayground();
        fireEvent.click(button('Naloži primer'));
        fireEvent.click(button('Naloži primer'));
        fireEvent.click(button('Razveljavi'));
        expect(anchorCount(container)).toBe(0);
        expect(button('Razveljavi').disabled).toBe(true);
        threeCorners(svg);
        fireEvent.focus(anchorEl(container, 0));
        expect(button('Izbriši točko').disabled).toBe(false);
        fireEvent.click(button('Razveljavi'));
        expect(button('Izbriši točko').disabled).toBe(true);
    });

    it('moves focus to the canvas when the last anchor is deleted', () => {
        const {svg, container} = renderPlayground();
        fireEvent.click(button('Dodaj točko'));
        const a = anchorEl(container, 0) as unknown as HTMLElement;
        a.focus();
        fireEvent.keyDown(a, {key: 'Delete'});
        expect(anchorCount(container)).toBe(0);
        expect(document.activeElement).toBe(svg);
    });

    it('uses a labelled group instead of a toolbar, and handles activate by selecting their anchor', () => {
        const {container} = renderPlayground();
        expect(screen.queryByRole('toolbar')).toBeNull();
        expect(screen.getByRole('group', {name: 'Orodja za risanje'})).toBeTruthy();
        fireEvent.click(button('Dodaj točko'));
        fireEvent.click(button('Dodaj točko'));
        expect(button('Izbriši točko').disabled).toBe(true);
        fireEvent.keyDown(handleEl(container, 1, 'in'), {key: 'Enter'});
        expect(button('Izbriši točko').disabled).toBe(false);
    });

    it('does not announce the stored drawing on mount, also under StrictMode', () => {
        vi.useFakeTimers();
        appStorage.setItem(PLAYGROUND_STORAGE_KEY, JSON.stringify(EXAMPLE_DRAWING));
        render(<React.StrictMode><DrawingPlayground mode="draw"/></React.StrictMode>);
        act(() => { vi.advanceTimersByTime(2000); });
        expect(screen.getByRole('status').textContent).toBe('');
        fireEvent.click(button('Počisti'));
        act(() => { vi.advanceTimersByTime(600); });
        expect(screen.getByRole('status').textContent).not.toBe('');
    });

    it('maps pointers through the bounding box when getScreenCTM is null, and through the CTM when present', () => {
        const {svg} = renderPlayground();
        svg.getScreenCTM = () => null;
        svg.getBoundingClientRect = () => ({left: 100, top: 50, width: 500, height: 312.5, right: 600, bottom: 362.5, x: 100, y: 50, toJSON: () => ({})});
        click(svg, 350, 206.25);
        expect(stored()!.anchors[0].position).toEqual({x: 500, y: 312.5});
        svg.getScreenCTM = () => ({inverse: () => ({a: 2, b: 0, c: 0, d: 2, e: -100, f: 0})}) as unknown as DOMMatrix;
        click(svg, 400, 200);
        expect(stored()!.anchors[1].position).toEqual({x: 700, y: 400});
    });
});
