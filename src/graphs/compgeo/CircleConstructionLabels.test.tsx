import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {sampleLine, type PxBox} from '../legend/boardLabelPlacement';
import {exampleState, type CircleMode} from '../../compgeo/circleConstructionModel';
import {CircleConstructionGraph} from './CircleConstructionGraph';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class Probe extends CircleConstructionGraph {
    liveBoard() { return this.board; }
}

type Shown = {
    elType: string; evalVisProp(name: string): unknown; X?: () => number; Y?: () => number; plaintext?: string;
    point1?: JXG.Point; point2?: JXG.Point; center?: JXG.Point; Radius?: () => number;
};

const overlaps = (a: PxBox, b: PxBox) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function mountMode(mode: CircleMode) {
    const graph = new Probe();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => { graph.setState(exampleState(mode)); });
    act(() => { graph.liveBoard().update(); });
    act(() => { graph.liveBoard().update(); });
    return graph;
}

/** The shown texts with estimated boxes, the points, and samples of the drawn circles and lines, in px from the top left corner (y down). */
function drawn(graph: Probe) {
    const board = graph.liveBoard();
    const [left, top] = board.getBoundingBox();
    const toPx = (x: number, y: number): readonly [number, number] => [(x - left) * board.unitX, (top - y) * board.unitY];
    const width = board.canvasWidth, height = board.canvasHeight;
    const shown = (board.objectsList as unknown as Shown[]).filter(o => Boolean(o.evalVisProp('visible')));
    const labels = shown.filter(o => o.elType === 'text' && o.evalVisProp('fontsize') === 15).map(o => { // the axis tick numbers are 12 px
        const [cx, cy] = toPx(o.X!(), o.Y!());
        const w = (o.plaintext ?? '').length * 7 + 4;
        return {text: o.plaintext ?? '', box: {x0: cx - w / 2, y0: cy - 9, x1: cx + w / 2, y1: cy + 9} as PxBox};
    }).filter(l => l.text !== '');
    const markers = shown.filter(o => o.elType === 'point').map(o => toPx(o.X!(), o.Y!()));
    const samples = shown.flatMap(o => {
        if (o.elType === 'circle') {
            const [cx, cy, r] = [o.center!.X(), o.center!.Y(), o.Radius!()];
            const xs = Array.from({length: 181}, (_, i) => cx + r * Math.cos((i * Math.PI) / 90));
            const ys = Array.from({length: 181}, (_, i) => cy + r * Math.sin((i * Math.PI) / 90));
            return sampleLine(xs, ys, toPx, width, height, 2, 3000);
        }
        if (o.elType !== 'line' && o.elType !== 'segment') return [];
        const [x0, y0, x1, y1] = [o.point1!.X(), o.point1!.Y(), o.point2!.X(), o.point2!.Y()];
        const dx = x1 - x0, dy = y1 - y0, length = Math.hypot(dx, dy) || 1;
        const reach = o.elType === 'line' ? 60 / length : 1;
        const from = o.elType === 'line' ? -reach : 0;
        return sampleLine([x0 + dx * from, x0 + dx * reach], [y0 + dy * from, y0 + dy * reach], toPx, width, height, 2, 2000);
    });
    return {labels, markers, samples};
}

describe('CircleConstructionGraph board text placement', () => {
    for (const mode of ['tangents', 'radical', 'apollonius', 'common'] as const) {
        it(`${mode}: every text is clear of the handles, of the drawn lines and circles and of the other texts`, () => {
            const {labels, markers, samples} = drawn(mountMode(mode));
            expect(labels.length).toBeGreaterThan(0);
            for (const label of labels) {
                const {box} = label;
                for (const [mx, my] of markers) {
                    expect(mx + 6 > box.x0 && mx - 6 < box.x1 && my + 6 > box.y0 && my - 6 < box.y1, `"${label.text}" lies on a marker`).toBe(false);
                }
                const hit = samples.find(([x, y]) => x >= box.x0 + 2 && x <= box.x1 - 2 && y >= box.y0 + 2 && y <= box.y1 - 2);
                expect(hit, `"${label.text}" lies on a drawn line at ${hit} (box ${JSON.stringify(box)})`).toBeUndefined();
            }
            labels.forEach((a, i) => labels.slice(i + 1).forEach(b => expect(overlaps(a.box, b.box), `"${a.text}" and "${b.text}" overlap`).toBe(false)));
        });
    }
});

describe('CircleConstructionGraph name ownership', () => {
    for (const mode of ['tangents', 'radical', 'apollonius', 'common'] as const) {
        it(`${mode}: each point name is nearer to its own marker than to any other point marker`, () => {
            const graph = mountMode(mode);
            const board = graph.liveBoard();
            const [left, top] = board.getBoundingBox();
            const toPx = (x: number, y: number): readonly [number, number] => [(x - left) * board.unitX, (top - y) * board.unitY];
            const s = graph.state as unknown as Record<string, {x: number; y: number}>;
            const own: Record<string, string> = {P: 'p', A: 'a', B: 'b', '1': 'c1', '2': 'c2', '3': 'c3'};
            const {labels, markers} = drawn(graph);
            let checked = 0;
            for (const label of labels) {
                const key = own[label.text];
                if (!key || !s[key]) continue;
                checked++;
                const [ox, oy] = toPx(s[key].x, s[key].y);
                const [cx, cy] = [(label.box.x0 + label.box.x1) / 2, (label.box.y0 + label.box.y1) / 2];
                const distance = (x: number, y: number) => Math.hypot(cx - x, cy - y);
                for (const [mx, my] of markers) {
                    if (Math.hypot(mx - ox, my - oy) < 1) continue;
                    expect(distance(ox, oy), `"${label.text}" is nearer to the marker at ${mx},${my} than to its own`).toBeLessThan(distance(mx, my));
                }
            }
            expect(checked).toBeGreaterThan(0);
        });
    }
});

describe('CircleConstructionGraph layout cache', () => {
    it('a shown marker that moved (state edited in place, handles untouched) gives a new layout, not the stale one', () => {
        class Layout extends Probe { layout() { return (this as unknown as {labelBoxes(): Record<string, PxBox>}).labelBoxes(); } }
        const graph = new Layout();
        render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
        act(() => { graph.setState(exampleState('common')); });
        act(() => { graph.liveBoard().update(); });
        const before = graph.layout();
        expect(Object.keys(before).length).toBeGreaterThan(0);
        const s = graph.state as unknown as {c2: {x: number}; c3: {x: number}};
        s.c2.x += 1; s.c3.x += 1; // derived markers (tangent points) move; no handle is placed
        act(() => { graph.liveBoard().update(); });
        expect(graph.layout()).not.toBe(before);
    });
});

describe('CircleConstructionGraph texts at the card scale (12.4 px per unit, the 420 x 260 card board)', () => {
    function cardBoard(mode: CircleMode, box: [number, number, number, number]) {
        const graph = mountMode(mode);
        const board = graph.liveBoard();
        act(() => {
            // The card capture hides the axes and their tick numbers.
            type Ticked = {setAttribute(a: object): void; defaultTicks: {setAttribute(a: object): void; labels: {setAttribute(a: object): void}[]}};
            const axes = (board as unknown as {defaultAxes: {x: Ticked; y: Ticked}}).defaultAxes;
            for (const axis of [axes.x, axes.y]) {
                axis.setAttribute({visible: false});
                axis.defaultTicks.setAttribute({visible: false});
                axis.defaultTicks.labels.forEach(l => l.setAttribute({visible: false}));
            }
            board.setBoundingBox(box, true, 'update');
            board.fullUpdate();
            board.update();
        });
        return graph;
    }

    it('common: the name "2" does not sit on the dashed centre line or a circle', () => {
        const {labels, samples} = drawn(cardBoard('common', [-10.65, 11.45, 37.75, -20.85]));
        const two = labels.find(l => l.text === '2')!;
        const hit = samples.find(([x, y]) => x >= two.box.x0 + 3 && x <= two.box.x1 - 3 && y >= two.box.y0 + 4 && y <= two.box.y1 - 4);
        expect(hit, `"2" lies on a drawn line at ${hit} (box ${JSON.stringify(two.box)})`).toBeUndefined();
    });

    it('radical: the name "P" sits within 30 px of its marker', () => {
        const graph = cardBoard('radical', [-10.65, 11.45, 37.75, -20.85]);
        const board = graph.liveBoard();
        const [left, top] = board.getBoundingBox();
        const p = graph.state.p;
        const [px, py] = [(p.x - left) * board.unitX, (top - p.y) * board.unitY];
        const label = drawn(graph).labels.find(l => l.text === 'P')!;
        const [cx, cy] = [(label.box.x0 + label.box.x1) / 2, (label.box.y0 + label.box.y1) / 2];
        expect(Math.hypot(cx - px, cy - py)).toBeLessThan(30);
    });
});
