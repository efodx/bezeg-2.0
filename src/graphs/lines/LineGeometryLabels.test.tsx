import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {sampleLine, type PxBox} from '../legend/boardLabelPlacement';
import {LineGeometryGraph} from './LineGeometryGraph';
import type {PointField} from './lineGeometryModel';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class Probe extends LineGeometryGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; evalVisProp(name: string): unknown; plaintext?: string; visProp: Record<string, unknown>};
type Scene = {mode: 'forms' | 'normal' | 'angle' | 'distance'; points: Partial<Record<PointField, [number, number]>>};

/** The opening scene of each section of the analytic-lines chapter (the cards) and a few further scenes of the same modes. */
const SCENES: Record<string, Scene> = {
    forms: {mode: 'forms', points: {P: [-2, 1], Q: [4, 4]}},
    normal: {mode: 'normal', points: {P: [-2, 1], Q: [4, 4], R: [3, -2], S: [5, -2]}},
    angle: {mode: 'angle', points: {P: [-2, 1], Q: [0, 2], R: [0, 2], S: [1, 5]}},
    angleOther: {mode: 'angle', points: {P: [-2, 1], Q: [2, 2], R: [-2, 1], S: [-1, 4]}},
    angleSwap: {mode: 'angle', points: {P: [-2, 1], Q: [0, 2], R: [1, 5], S: [0, 2]}},
    distance: {mode: 'distance', points: {P: [-2, 1], Q: [4, 4], T: [3, -2]}},
    distanceOtherSide: {mode: 'distance', points: {P: [-2, 1], Q: [4, 4], T: [-3, 4]}},
};

const overlaps = (a: PxBox, b: PxBox) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function mountScene(scene: Scene) {
    const graph = new Probe();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => {
        graph.applyLinesAction({kind: 'lines', operation: 'set-mode', mode: scene.mode});
        graph.applyLinesAction({kind: 'lines', operation: 'set-points', points: Object.fromEntries(Object.entries(scene.points).map(([k, [x, y]]) => [k, {x, y}]))});
    });
    act(() => { graph.liveBoard().update(); });
    return graph;
}

/** What the board draws, in px from the top left corner (y down): the shown texts with their estimated boxes, the point markers and samples of the strokes. */
function drawn(graph: Probe) {
    const board = graph.liveBoard();
    const [left, top] = board.getBoundingBox();
    const toPx = (x: number, y: number): readonly [number, number] => [(x - left) * board.unitX, (top - y) * board.unitY];
    const width = board.canvasWidth, height = board.canvasHeight;
    const shown = (board.objectsList as unknown as Shown[]).filter(o => Boolean(o.evalVisProp('visible')));
    const labels = shown.filter(o => o.elType === 'text' && o.visProp.fontsize === 15).map(o => {
        const text = o as unknown as JXG.Text & {plaintext?: string};
        const [cx, cy] = toPx(text.X(), text.Y());
        const w = (text.plaintext ?? '').length * 8 + 4;
        return {text: text.plaintext ?? '', box: {x0: cx - w / 2, y0: cy - 10, x1: cx + w / 2, y1: cy + 10} as PxBox};
    });
    const markers = shown.filter(o => o.elType === 'point').map(o => toPx((o as unknown as JXG.Point).X(), (o as unknown as JXG.Point).Y()));
    const samples = shown.filter(o => o.elType === 'line' || o.elType === 'segment').flatMap(o => {
        const l = o as unknown as JXG.Line;
        const [x0, y0, x1, y1] = [l.point1.X(), l.point1.Y(), l.point2.X(), l.point2.Y()];
        const dx = x1 - x0, dy = y1 - y0, length = Math.hypot(dx, dy) || 1;
        const reach = o.elType === 'line' ? 60 / length : 1;
        const from = o.elType === 'line' ? -reach : 0;
        return sampleLine([x0 + dx * from, x0 + dx * reach], [y0 + dy * from, y0 + dy * reach], toPx, width, height, 2, 2000);
    });
    return {labels, markers, samples};
}

describe('LineGeometryGraph board text placement', () => {
    for (const [name, scene] of Object.entries(SCENES)) {
        it(`${name}: every text is clear of the markers, of the drawn lines and of the other texts`, () => {
            const {labels, markers, samples} = drawn(mountScene(scene));
            expect(labels.length).toBeGreaterThan(0);
            for (const label of labels) {
                const {box} = label;
                for (const [mx, my] of markers) {
                    expect(mx + 7 > box.x0 && mx - 7 < box.x1 && my + 7 > box.y0 && my - 7 < box.y1, `"${label.text}" lies on a marker`).toBe(false);
                }
                const hit = samples.find(([x, y]) => x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1);
                expect(hit, `"${label.text}" lies on a drawn line`).toBeUndefined();
            }
            labels.forEach((a, i) => labels.slice(i + 1).forEach(b => expect(overlaps(a.box, b.box), `"${a.text}" and "${b.text}" overlap`).toBe(false)));
        });
    }
});
