// The movable pucks strip in the presenter (task 05b slice B): the grip drags it to a dock by pointer or keyboard, the cards make
// room live, the dock is stored, and Esc restores.
import {readFileSync} from 'node:fs';
import {act, cleanup} from '@testing-library/react';
import {afterEach, beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {TaylorGraph} from '../../graphs/functions/TaylorGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitUntil} from '../../graphs/base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {layoutBoard, type StripDock} from '../layout/boardLayout';
import {BOARD_LAYOUT_KEY, loadBoardLayout} from '../layout/storedLayout';
import {obstacleRects} from '../view/layoutRects';
import {neighbourDock, STRIP_RING} from '../pucks/StripGrip';
import {appStorage} from '../../storage/appStorage';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});

beforeAll(() => {
    installBoardShims();
    const box = (w: number, h: number): DOMRect => ({x: 0, y: 0, left: 0, top: 0, right: w, bottom: h, width: w, height: h, toJSON: () => ({})}) as DOMRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
        if (this.classList.contains('board-cards-layer')) return box(1000, 700);
        if (this.hasAttribute('data-card-id')) return box(200, 150);
        if (this.hasAttribute('data-card-head')) return box(200, 32);
        if (this.hasAttribute('data-card-row')) return box(200, 24);
        return box(600, 400);
    };
});
beforeEach(() => { setLanguage('sl'); window.localStorage.clear(); });
afterEach(cleanup);

const fire = (target: Element, type: string, init: MouseEventInit = {}) => {
    act(() => { target.dispatchEvent(new MouseEvent(type, {bubbles: true, cancelable: true, ...init})); });
};
const key = (target: Element, k: string) => {
    act(() => { target.dispatchEvent(new KeyboardEvent('keydown', {key: k, bubbles: true, cancelable: true})); });
};
const grip = () => document.querySelector<HTMLElement>('[data-puck-strip-grip]')!;
const strip = () => document.querySelector<HTMLElement>('[data-puck-strip]')!;
const status = () => document.querySelector('.puck-strip-status')!.textContent;
const storedDock = () => loadBoardLayout().strip;

async function mountTaylor() {
    const mounted = mountGraph(new TaylorGraph());
    await waitUntil(() => document.querySelector('[data-puck-strip-grip]') !== null && strip().style.transform !== '');
    return mounted;
}

/** Drags the grip by the given travel (px) in the 1000 x 700 board and drops. */
function dragStrip(dx: number, dy: number, drop = true) {
    fire(grip(), 'pointerdown', {clientX: 20, clientY: 600});
    fire(grip(), 'pointermove', {clientX: 20 + dx / 2, clientY: 600 + dy / 2});
    fire(grip(), 'pointermove', {clientX: 20 + dx, clientY: 600 + dy});
    if (drop) fire(grip(), 'pointerup', {clientX: 20 + dx, clientY: 600 + dy});
}

describe('the strip grip', () => {
    test('is a focusable button with a catalog name at the strip\'s leading edge', async () => {
        await mountTaylor();
        expect(grip().tagName).toBe('BUTTON');
        expect(grip()).toHaveAttribute('aria-label', 'Premakni krmilnike');
        expect(strip().firstElementChild).toBe(grip());
        grip().focus();
        expect(document.activeElement).toBe(grip());
    });

    test.each<[StripDock, number, number]>([
        ['bottom-centre', 250, 0], ['top-centre', 250, -640], ['bottom-right', 700, 80], ['left', 0, -200], ['right', 900, -330],
    ])('a pointer drag toward %s stores that dock', async (dock, dx, dy) => {
        await mountTaylor();
        dragStrip(dx, dy);
        expect(storedDock()).toBe(dock);
    });

    test('dragging back to the bottom-left from another dock stores it again', async () => {
        await mountTaylor();
        dragStrip(900, -330);
        expect(storedDock()).toBe('right');
        dragStrip(-900, 600);
        expect(storedDock()).toBe('bottom-left');
    });

    test('during the drag the cards use the candidate dock and a ghost shows it; nothing is stored until the drop', async () => {
        await mountTaylor();
        dragStrip(900, -330, false);
        expect(document.querySelector('[data-strip-drop-target="right"]')).not.toBeNull();
        expect(strip()).toHaveClass('puck-strip--dragging');
        expect(storedDock()).toBeUndefined();
        fire(grip(), 'pointerup', {clientX: 920, clientY: 270});
        expect(document.querySelector('[data-strip-drop-target]')).toBeNull();
    });

    test('the keyboard walks the ring left, bottom-left, bottom-centre, bottom-right, right; Enter drops there; focus stays on the grip', async () => {
        await mountTaylor();
        grip().focus();
        key(grip(), 'Enter');
        key(grip(), 'ArrowLeft');
        expect(status()).toBe('Krmilniki: ob levem robu.');
        const seen: (string | null)[] = [];
        for (let i = 0; i < 4; i += 1) { key(grip(), 'ArrowRight'); seen.push(status()); }
        expect(seen).toEqual(['Krmilniki: spodaj levo.', 'Krmilniki: spodaj na sredini.', 'Krmilniki: spodaj desno.', 'Krmilniki: ob desnem robu.']);
        expect(storedDock()).toBeUndefined();
        key(grip(), 'Enter');
        expect(storedDock()).toBe('right');
        expect(document.activeElement).toBe(grip());
    });

    test('Esc cancels a keyboard move and restores the strip where it was', async () => {
        await mountTaylor();
        const before = strip().style.transform;
        grip().focus();
        key(grip(), 'Enter');
        key(grip(), 'ArrowLeft');
        expect(strip().style.transform).not.toBe(before);
        key(grip(), 'Escape');
        expect(strip().style.transform).toBe(before);
        expect(storedDock()).toBeUndefined();
        expect(document.activeElement).toBe(grip());
    });

    test('a pointer drag cancelled by the browser restores the strip', async () => {
        await mountTaylor();
        const before = strip().style.transform;
        dragStrip(900, -330, false);
        fire(grip(), 'pointercancel');
        expect(strip().style.transform).toBe(before);
        expect(storedDock()).toBeUndefined();
    });

    test('losing the pointer capture mid-drag cancels like a pointer cancel', async () => {
        await mountTaylor();
        const before = strip().style.transform;
        dragStrip(900, -330, false);
        expect(strip()).toHaveClass('puck-strip--dragging');
        fire(grip(), 'lostpointercapture');
        expect(strip()).not.toHaveClass('puck-strip--dragging');
        expect(strip().style.transform).toBe(before);
        expect(storedDock()).toBeUndefined();
    });

    test('during a card drag, Enter and a pointer down on the grip start nothing', async () => {
        await mountTaylor();
        const head = document.querySelector('[data-card-id="tools"] [data-card-head]')!;
        fire(head, 'pointerdown', {clientX: 500, clientY: 100});
        fire(head, 'pointermove', {clientX: 560, clientY: 140});
        expect(document.querySelector('.board-card--dragging')).not.toBeNull();
        key(grip(), 'Enter');
        fire(grip(), 'pointerdown', {clientX: 20, clientY: 600});
        fire(grip(), 'pointermove', {clientX: 400, clientY: 300});
        expect(strip()).not.toHaveClass('puck-strip--dragging');
        expect(status()).toBe('');
        fire(head, 'pointerup', {clientX: 560, clientY: 140});
    });

    test('an arrow at the end of the ring says nothing and changes nothing', async () => {
        await mountTaylor();
        grip().focus();
        key(grip(), 'Enter');
        key(grip(), 'ArrowLeft');
        const said = status();
        const at = strip().style.transform;
        key(grip(), 'ArrowLeft');
        key(grip(), 'ArrowUp');
        expect(status()).toBe(said);
        expect(strip().style.transform).toBe(at);
    });

    test('the grip is at least 24 px on its short side in both orientations', () => {
        const css = readFileSync('src/workspace/pucks/pucks.css', 'utf8');
        expect(css).toMatch(/\.puck-strip-grip \{[^}]*width: 24px; height: 40px/);
        expect(css).toMatch(/\.puck-strip-grip--column \{[^}]*width: 40px; height: 24px/);
    });

    test('the pucks run as a column at a side dock and as a row otherwise, each keeping its role', async () => {
        await mountTaylor();
        expect(strip().getAttribute('data-puck-strip-orientation')).toBe('row');
        const roles = () => [...strip().querySelectorAll('[role="slider"], [role="spinbutton"]')].map(el => el.getAttribute('role') + ':' + (el.getAttribute('aria-label') ?? el.getAttribute('aria-labelledby')));
        const rowRoles = roles();
        expect(rowRoles.length).toBeGreaterThan(1);
        dragStrip(0, -200);
        expect(strip().getAttribute('data-puck-strip-orientation')).toBe('column');
        expect(strip()).toHaveClass('puck-strip--column');
        expect(roles()).toEqual(rowRoles);
        dragStrip(250, 330);
        expect(strip().getAttribute('data-puck-strip-orientation')).toBe('row');
        expect(strip()).not.toHaveClass('puck-strip--column');
    });

    test('the stored dock survives a reload', async () => {
        await mountTaylor();
        dragStrip(900, -330);
        const saved = appStorage.getItem(BOARD_LAYOUT_KEY);
        expect(saved).toContain('right');
        cleanup();
        await mountTaylor();
        expect(strip().getAttribute('data-puck-strip-orientation')).toBe('column');
        expect(storedDock()).toBe('right');
    });

    test('no strip drag starts while a card drag is active', async () => {
        await mountTaylor();
        const head = document.querySelector('[data-card-id="tools"] [data-card-head]')!;
        fire(head, 'pointerdown', {clientX: 500, clientY: 100});
        fire(head, 'pointermove', {clientX: 560, clientY: 140});
        expect(document.querySelector('.board-card--dragging')).not.toBeNull();
        dragStrip(900, -330);
        expect(storedDock()).toBeUndefined();
        fire(head, 'pointerup', {clientX: 560, clientY: 140});
    });

    test('no card drag proceeds while the strip is held', async () => {
        await mountTaylor();
        dragStrip(900, -330, false);
        const head = document.querySelector('[data-card-id="tools"] [data-card-head]')!;
        fire(head, 'pointerdown', {clientX: 500, clientY: 100});
        fire(head, 'pointermove', {clientX: 560, clientY: 140});
        fire(head, 'pointerup', {clientX: 560, clientY: 140});
        expect(JSON.stringify(loadBoardLayout().placements)).toBe('{}');
        fire(grip(), 'pointerup', {clientX: 920, clientY: 270});
        expect(storedDock()).toBe('right');
    });
});

describe('the ring and the director', () => {
    test('neighbourDock walks the ring with Left and Right and links each bottom corner to its side with Up and Down', () => {
        expect([...STRIP_RING]).toEqual(['left', 'bottom-left', 'bottom-centre', 'bottom-right', 'right']);
        expect(neighbourDock('bottom-left', 'ArrowLeft')).toBe('left');
        expect(neighbourDock('left', 'ArrowLeft')).toBe('left');
        expect(neighbourDock('bottom-right', 'ArrowRight')).toBe('right');
        expect(neighbourDock('bottom-left', 'ArrowUp')).toBe('left');
        expect(neighbourDock('right', 'ArrowDown')).toBe('bottom-right');
    });

    test('the keyboard reaches the top centre with Up from the bottom centre and leaves it with Down, Left or Right', () => {
        expect(neighbourDock('bottom-centre', 'ArrowUp')).toBe('top-centre');
        expect(neighbourDock('top-centre', 'ArrowUp')).toBe('top-centre');
        expect(neighbourDock('top-centre', 'ArrowDown')).toBe('bottom-centre');
        expect(neighbourDock('top-centre', 'ArrowLeft')).toBe('left');
        expect(neighbourDock('top-centre', 'ArrowRight')).toBe('right');
    });

    test.each<StripDock>(['top-centre', 'bottom-left', 'bottom-centre', 'bottom-right', 'left', 'right'])('the strip is among the director\'s obstacles at %s', dock => {
        const layout = layoutBoard({board: {w: 1280, h: 720}, cards: [], stored: {}, storedFolds: {}, pucks: {w: 400, h: 64}, stripDock: dock, maxSpan: 3, columnMaxFraction: 0.4, gap: 8});
        expect(layout.pucks).not.toBeNull();
        const strip = layout.pucks!;
        expect(obstacleRects(layout)).toContainEqual(expect.objectContaining({x: strip.x, y: strip.y, width: strip.w, height: strip.h}));
    });
});
