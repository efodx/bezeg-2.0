import {act, cleanup, render} from '@testing-library/react';
import {afterEach, beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {PhasePortraitGraph} from '../../graphs/dynamics/PhasePortraitGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {CountParameter, ParameterDeclaration, RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import {message} from '../../localization';
import {SectionBody} from '../cards/SectionBody';
import {PreviewHost} from './PreviewHost';
import Slider from '../../inputs/Slider';
import {CountSetter} from '../../inputs/CountSetter';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);

let queue: Array<{id: number; callback: FrameRequestCallback}> = [];
let nextId = 1;
const frame = () => { const run = queue; queue = []; act(() => { for (const entry of run) entry.callback(0); }); };
beforeEach(() => {
    queue = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id = nextId++; queue.push({id, callback}); return id; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { queue = queue.filter(entry => entry.id !== id); });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function pointer(target: Element, type: string, init: MouseEventInit = {}, pointerType = 'mouse') {
    const event = new MouseEvent(type, {bubbles: true, cancelable: true, ...init});
    Object.defineProperty(event, 'pointerType', {value: pointerType});
    act(() => { target.dispatchEvent(event); });
}

function setup(parameter: ParameterDeclaration, value: number) {
    const graph = new PhasePortraitGraph();
    mountGraph(graph);
    const write = vi.fn();
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(<PreviewHost graph={graph} width={600} height={400}>
        <SectionBody parameters={[parameter]} read={() => value} write={write} perform={vi.fn()}/>
    </PreviewHost>, {container: host});
    return {graph, host, write, ghost: () => host.querySelector('[data-ghost-overlay]'), hint: () => host.querySelector('.hover-hint')};
}

const declared = (key: string) => new PhasePortraitGraph().getDeclaration()!.parameters!.find(candidate => candidate.key === key)!;

describe('the hover preview of tools controls', () => {
    test('hovering a previewable slider shows a ghost and the value hint, leaving clears both', () => {
        const range = declared('phase-a') as RangeParameter;
        const {host, ghost, hint, write} = setup(range, 0);
        const slider = host.querySelector('input[type="range"]')!;
        slider.getBoundingClientRect = () => ({left: 0, width: 200, right: 200, top: 0, bottom: 10, height: 10, x: 0, y: 0, toJSON: () => ({})});
        pointer(slider, 'pointermove', {clientX: 150});
        frame();
        expect(ghost()).not.toBeNull();
        expect(hint()!.textContent).toMatch(/^Klik: /);
        expect(hint()!.getAttribute('aria-hidden')).toBe('true');
        pointer(slider, 'pointerout');
        expect(ghost()).toBeNull();
        expect(hint()).toBeNull();
        expect(write).not.toHaveBeenCalled();
    });

    test('a touch pointer over the slider shows nothing', () => {
        const {host, ghost, hint} = setup(declared('phase-a'), 0);
        const slider = host.querySelector('input[type="range"]')!;
        slider.getBoundingClientRect = () => ({left: 0, width: 200, right: 200, top: 0, bottom: 10, height: 10, x: 0, y: 0, toJSON: () => ({})});
        pointer(slider, 'pointermove', {clientX: 150}, 'touch');
        frame();
        expect(ghost()).toBeNull();
        expect(hint()).toBeNull();
    });

    describe('count buttons', () => {
        const count = {kind: 'count', key: 'phase-a', label: message('workspace_notes_less'), min: 0, max: 5, previewable: true} as unknown as CountParameter;
        const button = (host: HTMLElement, label: RegExp) => Array.from(host.querySelectorAll('button')).find(candidate => label.test(candidate.getAttribute('aria-label') ?? ''))!;

        test('minus and plus preview the neighbouring count', () => {
            const {host, ghost, hint} = setup(count, 2);
            pointer(button(host, /Zmanj|Decrease/i), 'pointerover');
            frame();
            expect(ghost()).not.toBeNull();
            expect(hint()!.textContent).toBe('Klik: 1');
            pointer(button(host, /Zmanj|Decrease/i), 'pointerout');
            expect(ghost()).toBeNull();
            expect(hint()).toBeNull();
            pointer(button(host, /Pove|Increase/i), 'pointerover');
            frame();
            expect(hint()!.textContent).toBe('Klik: 3');
        });

        test('nothing shows at a bound, and a touch pointer shows nothing', () => {
            const atMin = setup(count, 0);
            pointer(button(atMin.host, /Zmanj|Decrease/i), 'pointerover');
            frame();
            expect(atMin.ghost()).toBeNull();
            expect(atMin.hint()).toBeNull();
            const touch = setup(count, 2);
            pointer(button(touch.host, /Pove|Increase/i), 'pointerover', {}, 'touch');
            frame();
            expect(touch.ghost()).toBeNull();
            expect(touch.hint()).toBeNull();
        });
    });

    describe('unmounting while hovered', () => {
        test('a hovered slider that unmounts hides the ghost and stops the loop', () => {
            const graph = new PhasePortraitGraph();
            mountGraph(graph);
            const host = document.createElement('div');
            document.body.appendChild(host);
            const slider = (on: boolean) => <PreviewHost graph={graph} width={600} height={400}>
                {on && <SectionBody parameters={[declared('phase-a')]} read={() => 0} write={vi.fn()} perform={vi.fn()}/>}
            </PreviewHost>;
            const view = render(slider(true), {container: host});
            const input = host.querySelector('input[type="range"]')!;
            input.getBoundingClientRect = () => ({left: 0, width: 200, right: 200, top: 0, bottom: 10, height: 10, x: 0, y: 0, toJSON: () => ({})});
            pointer(input, 'pointermove', {clientX: 150});
            frame();
            expect(host.querySelector('[data-ghost-overlay]')).not.toBeNull();
            view.rerender(slider(false));
            expect(host.querySelector('[data-ghost-overlay]')).toBeNull();
            expect(queue.length).toBe(0);
        });

        test('a hovered count setter that unmounts hides the ghost and stops the loop', () => {
            const count = {kind: 'count', key: 'phase-a', label: message('workspace_notes_less'), min: 0, max: 5, previewable: true} as unknown as CountParameter;
            const graph = new PhasePortraitGraph();
            mountGraph(graph);
            const host = document.createElement('div');
            document.body.appendChild(host);
            const tree = (on: boolean) => <PreviewHost graph={graph} width={600} height={400}>
                {on && <SectionBody parameters={[count]} read={() => 2} write={vi.fn()} perform={vi.fn()}/>}
            </PreviewHost>;
            const view = render(tree(true), {container: host});
            const plus = Array.from(host.querySelectorAll('button')).find(b => /Pove|Increase/i.test(b.getAttribute('aria-label') ?? ''))!;
            pointer(plus, 'pointerover');
            frame();
            expect(host.querySelector('[data-ghost-overlay]')).not.toBeNull();
            view.rerender(tree(false));
            expect(host.querySelector('[data-ghost-overlay]')).toBeNull();
            expect(queue.length).toBe(0);
        });
    });

    test('the slider hint value equals the value a click at that x gives, with the thumb inset at both ends', () => {
        const values: Array<number | null> = [];
        const {container} = render(<Slider min={0} max={100} step={1} value={0} customText="x" onChange={vi.fn()} onHoverValue={v => values.push(v)}/>);
        const input = container.querySelector('input[type="range"]')!;
        input.getBoundingClientRect = () => ({left: 0, width: 220, right: 220, top: 0, bottom: 10, height: 10, x: 0, y: 0, toJSON: () => ({})});
        // The 20 px thumb's centre runs from x = 10 to x = 210 of the 220 px track.
        for (const x of [0, 10, 110, 210, 220]) pointer(input, 'pointermove', {clientX: x});
        expect(values).toEqual([0, 0, 50, 100, 100]);
    });

    test('a count change while hovering re-reports the new neighbour', () => {
        const values: Array<number | null> = [];
        const ui = (n: number) => <CountSetter n={n} min={0} max={9} onPlus={vi.fn()} onMinus={vi.fn()} onHoverValue={v => values.push(v)}/>;
        const view = render(ui(2));
        const plus = Array.from(view.container.querySelectorAll('button')).find(b => /Pove|Increase/i.test(b.getAttribute('aria-label') ?? ''))!;
        pointer(plus, 'pointerover');
        expect(values.at(-1)).toBe(3);
        view.rerender(ui(5));
        expect(values.at(-1)).toBe(6);
    });
});
