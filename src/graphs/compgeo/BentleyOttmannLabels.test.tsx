import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import type {PxBox} from '../legend/boardLabelPlacement';
import {distanceToBox, nameBox} from '../legend/pointNamePlacement';
import {BentleyOttmannGraph} from './BentleyOttmannGraph';
import {SEGMENT_EXAMPLE} from '../../learning/content/compgeoGuidedLessons';

// A lesson board at 1440 px is about 960 x 620; the shared shim's 600 x 400 is more crowded than any shown frame.
beforeAll(() => {
    installBoardShims();
    for (const [name, size] of [['clientWidth', 960], ['clientHeight', 620], ['offsetWidth', 960], ['offsetHeight', 620]] as const) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
});
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => setLanguage('sl'));

class Probe extends BentleyOttmannGraph {
    liveBoard() { return this.board; }
}
type Shown = {elType: string; name: string; label?: JXG.Text; evalVisProp(name: string): unknown; X?: () => number; Y?: () => number};
type Seg = readonly [number, number, number, number];

/** The lesson's four segments (s1 and s2 cross at their midpoints) and the concurrent example; each at the start and at a later trace step. */
const SCENES: Record<string, readonly Seg[]> = {
    lesson: SEGMENT_EXAMPLE,
    concurrent: [[0, 0, 4, 4], [0, 4, 4, 0], [0, 2, 4, 2], [2, 0, 2, 4]],
};
const STEPS = [0, 9] as const;

const overlaps = (a: PxBox, b: PxBox) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function mountScene(segments: readonly Seg[], step: number) {
    const graph = new Probe();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => {
        const {apply} = graph.getLessonCapabilities();
        apply({kind: 'point-set', operation: 'set-points', mode: 'segments', points: segments.flatMap(([a, b, c, d]) => [[a, b], [c, d]] as const)});
        apply({kind: 'point-set', operation: 'set-trace-step', step});
    });
    act(() => { graph.liveBoard().update(); });
    return graph;
}

function drawn(graph: Probe) {
    const board = graph.liveBoard();
    const [left, top] = board.getBoundingBox();
    const toPx = (x: number, y: number) => [(x - left) * board.unitX, (top - y) * board.unitY] as const;
    const shown = (board.objectsList as unknown as Shown[]).filter(o => Boolean(o.evalVisProp('visible')));
    const box = (name: string, x: number, y: number) => {
        const [cx, cy] = toPx(x, y);
        const {w, h} = nameBox(name, 15);
        return {x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2} as PxBox;
    };
    const ends = shown.filter(o => o.elType === 'point' && /^P\d+$/.test(o.name));
    const labels = [
        ...ends.filter(o => o.label).map(o => ({name: o.name, box: box(o.name, o.label!.X(), o.label!.Y())})),
        ...shown.filter(o => o.elType === 'text' && /^s\d+$/.test(o.name)).map(o => ({name: o.name, box: box(o.name, o.X!(), o.Y!())})),
    ];
    const markers = shown.filter(o => o.elType === 'point' && o.X && o.name !== 'pending').map(o => ({name: o.name, at: toPx(o.X!(), o.Y!()), r: Number(o.evalVisProp('size')) + 1}));
    const segments = Array.from({length: Math.floor(ends.length / 2)}, (_, k) => [toPx(ends[2 * k].X!(), ends[2 * k].Y!()), toPx(ends[2 * k + 1].X!(), ends[2 * k + 1].Y!())] as const);
    return {board, labels, markers, segments};
}

const distanceToSegment = (p: readonly [number, number], [a, b]: readonly [readonly [number, number], readonly [number, number]]) => {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
};

describe('BentleyOttmannGraph endpoint and segment names', () => {
    for (const [scene, segs] of Object.entries(SCENES)) for (const step of STEPS) {
        it(`${scene} at step ${step}: names are drawn, apart, off every marker, beside their own marker or segment`, () => {
            const {board, labels, markers, segments} = drawn(mountScene(segs, step));
            expect(labels.length).toBe(segs.length * 3);
            for (const {name, box} of labels) {
                expect.soft(box.x1 - box.x0, `"${name}" has no box`).toBeGreaterThan(4);
                expect.soft(box.x0 >= 0 && box.y0 >= 0 && box.x1 <= board.canvasWidth && box.y1 <= board.canvasHeight, `"${name}" leaves the board`).toBe(true);
            }
            labels.forEach((a, i) => labels.slice(i + 1).forEach(b => expect.soft(overlaps(a.box, b.box), `"${a.name}" lies on "${b.name}"`).toBe(false)));
            for (const {name, box} of labels) for (const m of markers) {
                if (m.name === name) continue;
                const [mx, my] = m.at;
                expect.soft(mx + m.r > box.x0 && mx - m.r < box.x1 && my + m.r > box.y0 && my - m.r < box.y1, `"${name}" covers the marker ${m.name}`).toBe(false);
            }
            for (const {name, box} of labels.filter(l => l.name.startsWith('P'))) {
                const own = markers.find(m => m.name === name)!;
                expect.soft(distanceToBox(box, own.at[0], own.at[1]) - own.r, `"${name}" is far from its marker`).toBeLessThanOrEqual(16);
                expect.soft(overlaps(box, {x0: own.at[0] - own.r, y0: own.at[1] - own.r, x1: own.at[0] + own.r, y1: own.at[1] + own.r}), `"${name}" covers its own marker`).toBe(false);
            }
            // A segment's name reads as its own: its box centre is nearer to its segment than to any other.
            for (const {name, box} of labels.filter(l => l.name.startsWith('s'))) {
                const k = Number(name.slice(1)) - 1;
                const centre = [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2] as const;
                const own = distanceToSegment(centre, segments[k]);
                segments.forEach((s, j) => { if (j !== k) expect.soft(own, `"${name}" is nearer to s${j + 1} than to its own segment`).toBeLessThan(distanceToSegment(centre, s)); });
            }
        });
    }
});
