import React from 'react';
import {act, cleanup, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {TaylorGraph} from '../../graphs/functions/TaylorGraph';
import {GraphHost} from '../../graphs/base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {morphScene} from '../b1/morph';
import {setPicks} from '../picks';
import {director} from './viewDirector';
import type {FitBox} from '../../graphs/base/fitBoundingBox';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve()}));
beforeAll(() => {
    installBoardShims();
    // The shim sizes every element 600 x 400: the dock's own items would cover the whole board, so only the test's card has a size.
    const shimmed = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
        const empty = {x: 0, y: 0, left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({})} as DOMRect;
        return this.closest('.ux-dock') ? empty : shimmed.call(this);
    };
});
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});

class Observed extends TaylorGraph {
    liveBoard() { return this.board; }
}

const REAL = {setTimeout, clearTimeout};
const settle = (ms = 300) => act(async () => { await new Promise(resolve => REAL.setTimeout(resolve, ms)); });
const box = (graph: Observed) => graph.liveBoard().getBoundingBox() as FitBox;
const distinct = (boxes: FitBox[]) => new Set(boxes.map(b => b.map(v => v.toFixed(6)).join(','))).size;
const near = (a: FitBox, b: FitBox) => distinct([a, b]) === 1;
/** A card over the left 200 px of the 600 x 400 test board. */
function addCard() {
    const frame = document.querySelector('.workspace-graph')!;
    const dock = document.createElement('div');
    dock.className = 'ux-dock';
    const card = document.createElement('div');
    card.setAttribute('data-dock-item', '');
    card.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: 200, bottom: 400, width: 200, height: 400, toJSON: () => ({})}) as DOMRect;
    dock.appendChild(card);
    frame.appendChild(dock);
    return () => dock.remove();
}

async function mount(useFocus: boolean) {
    setLanguage('sl');
    setPicks(['viewDirector', 'boardText', 'b1']);
    director.configure({useFocus});
    const graph = new Observed();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await settle(500);
    return graph;
}

afterEach(() => { cleanup(); setPicks([]); director.configure({useFocus: true}); vi.useRealTimers(); });

describe.each([[false, 'intent fit (no declaration)'], [true, 'declared focus']])('view director on a Taylor lesson step, %s', (useFocus, name) => {
    it(`${name}: one motion from the box on screen to the target, nothing else`, async () => {
        const graph = await mount(useFocus);
        vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance']});
        const removeCard = addCard();
        act(() => { director.request('dock', 0); for (let i = 0; i < 40; i++) vi.advanceTimersByTime(16); }); // the glide to the fit with the card
        const caps = graph.getLessonCapabilities();
        const startBefore = box(graph);

        const before = caps.captureState();
        act(() => { caps.apply({kind: 'prepared-scene', sceneId: 'step', source: 'demonstration-default', view: [-5, 12, 5, -5]}); });
        // the scene applied, the board still shows the box of the step before
        expect(near(box(graph), startBefore)).toBe(true);

        const events: FitBox[] = [];
        graph.liveBoard().on('boundingbox', () => events.push(box(graph)));
        const handle = morphScene(caps, before, {onStart: () => { director.beginMorph(); }, onFrame: t => director.progress(t)});
        const samples: FitBox[] = [box(graph)];
        if (handle) {
            for (let i = 0; i < 60; i++) { act(() => { vi.advanceTimersByTime(16); }); samples.push(box(graph)); }
            act(() => { handle.finish(); vi.advanceTimersByTime(50); });
            samples.push(box(graph));
        }
        act(() => { director.endMorph(); vi.advanceTimersByTime(600); });
        const last = box(graph);

        expect(handle).toBeDefined();
        expect(near(samples[0], startBefore)).toBe(true); // first box of the step = the box before it
        for (let axis = 0; axis < 4; axis++) {
            const sign = Math.sign(last[axis] - startBefore[axis]);
            for (let i = 1; i < samples.length; i++) expect(Math.sign(samples[i][axis] - samples[i - 1][axis]) * sign).toBeGreaterThanOrEqual(0); // monotone
        }
        expect(distinct(samples)).toBeGreaterThan(5); // moves in many small steps, one segment
        expect(last).not.toEqual(startBefore);

        // A second identical request changes nothing.
        const eventsBefore = events.length;
        act(() => { director.request('intent', 0); vi.advanceTimersByTime(800); });
        expect(near(box(graph), last)).toBe(true);
        expect(distinct([last, box(graph)])).toBe(1);
        expect(events.length).toBe(eventsBefore);
        removeCard();
    });

    it(`${name}: a frame that changes nothing holds still`, async () => {
        const graph = await mount(useFocus);
        vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance']});
        const removeCard = addCard();
        act(() => { director.request('dock', 0); for (let i = 0; i < 40; i++) vi.advanceTimersByTime(16); });
        const rest = box(graph);
        const seen: FitBox[] = [rest];
        graph.liveBoard().on('boundingbox', () => seen.push(box(graph)));
        act(() => { director.request('action'); vi.advanceTimersByTime(600); });
        expect(distinct(seen)).toBe(1);
        removeCard();
    });
});
