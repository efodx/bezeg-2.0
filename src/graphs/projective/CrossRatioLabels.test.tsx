import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import type {PxBox} from '../legend/boardLabelPlacement';
import {CrossRatioGraph} from './CrossRatioGraph';
import {CROSS_RATIO_EXAMPLES, type CrossRatioModel} from './crossRatioModel';
import {distanceToBox, nameBox} from '../legend/pointNamePlacement';

// A lesson board at 1440 px is about 960 x 620; the shared shim's 600 x 400 is more crowded than any shown frame.
beforeAll(() => {
    installBoardShims();
    for (const [name, size] of [['clientWidth', 960], ['clientHeight', 620], ['offsetWidth', 960], ['offsetHeight', 620]] as const) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
});
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => setLanguage('sl'));

class Probe extends CrossRatioGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string; label?: JXG.Text; evalVisProp(name: string): unknown; X?: () => number; Y?: () => number};

/** The lesson's scenes (the harmonic quadruple, an image at infinity) and a crowded constellation with the centre between the lines. */
const SCENES: Record<string, CrossRatioModel> = {
    harmonic: CROSS_RATIO_EXAMPLES.harmonic,
    infinity: CROSS_RATIO_EXAMPLES.infinity,
    default: CROSS_RATIO_EXAMPLES.default,
    crowded: {example: 'custom', params: [0, 1, 2, 3], centre: {x: 1, y: 3}, line2: [{x: 0, y: 1}, {x: 3, y: 1}]},
};

const overlaps = (a: PxBox, b: PxBox) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function mountScene(model: CrossRatioModel) {
    const graph = new Probe();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => { graph.loadModel(model); });
    act(() => { graph.liveBoard().update(); });
    return graph;
}

/** The shown names with their boxes (the label's text position is its centre: the labels are anchored in the middle) and the shown points. */
function drawn(graph: Probe) {
    const board = graph.liveBoard();
    const [left, top] = board.getBoundingBox();
    const toPx = (x: number, y: number) => [(x - left) * board.unitX, (top - y) * board.unitY] as const;
    const shown = (board.objectsList as unknown as Shown[]).filter(o => Boolean(o.evalVisProp('visible')));
    const labels = shown.filter(o => o.label && o.name).map(o => {
        const [cx, cy] = toPx(o.label!.X(), o.label!.Y());
        const {w, h} = nameBox(o.name!, 15);
        return {name: o.name!, box: {x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2} as PxBox};
    });
    const markers = shown.filter(o => o.elType === 'point' && o.name).map(o => ({name: o.name!, at: toPx(o.X!(), o.Y!()), r: Number(o.evalVisProp('size')) + 1}));
    return {board, labels, markers};
}

describe('CrossRatioGraph point and line names', () => {
    for (const [scene, model] of Object.entries(SCENES)) {
        it(`${scene}: no two names overlap and none covers a marker`, () => {
            const {board, labels, markers} = drawn(mountScene(model));
            // The names exist (O, A to D, M, N, p, p', and the finite images), each with a real box inside the board.
            expect(labels.length).toBeGreaterThanOrEqual(scene === 'infinity' ? 10 : 11);
            for (const {name, box} of labels) {
                expect.soft(box.x1 - box.x0, `"${name}" has no box`).toBeGreaterThan(4);
                expect.soft(box.x0 >= 0 && box.y0 >= 0 && box.x1 <= board.canvasWidth && box.y1 <= board.canvasHeight, `"${name}" leaves the board`).toBe(true);
            }
            labels.forEach((a, i) => labels.slice(i + 1).forEach(b => expect.soft(overlaps(a.box, b.box), `"${a.name}" lies on "${b.name}"`).toBe(false)));
            for (const {name, box} of labels) for (const m of markers) {
                const [mx, my] = m.at;
                expect.soft(mx + m.r > box.x0 && mx - m.r < box.x1 && my + m.r > box.y0 && my - m.r < box.y1, `"${name}" covers the marker ${m.name}`).toBe(false);
            }
            // A name stays beside its own marker: its box within 16 px of the marker's edge in the lesson scenes (40 px in a crowded one), and
            // its centre nearer to that marker than to any other (markers within 6 px of it, which share its neighbourhood, excepted). Lines have no marker.
            const limit = ['default', 'harmonic', 'infinity'].includes(scene) ? 16 : 40;
            for (const {name, box} of labels) {
                const own = markers.find(m => m.name === name);
                if (!own) continue;
                expect.soft(distanceToBox(box, own.at[0], own.at[1]) - own.r, `"${name}" is far from its marker`).toBeLessThanOrEqual(limit);
                const centre = [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2];
                const ownDistance = Math.hypot(centre[0] - own.at[0], centre[1] - own.at[1]);
                for (const m of markers) {
                    if (m === own || Math.hypot(m.at[0] - own.at[0], m.at[1] - own.at[1]) < 6) continue;
                    expect.soft(ownDistance, `"${name}" is nearer to the marker ${m.name} than to its own`).toBeLessThan(Math.hypot(centre[0] - m.at[0], centre[1] - m.at[1]));
                }
            }
        });
    }
});
