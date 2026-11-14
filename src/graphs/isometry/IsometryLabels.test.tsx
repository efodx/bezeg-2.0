import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {sampleLine, type PxBox} from '../legend/boardLabelPlacement';
import {CLASSIFY_EXAMPLES, DEFAULT_ISOMETRY_STATE, type IsometryState} from '../../isometry/isometryModel';
import {IsometryGraph} from './IsometryGraph';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class Probe extends IsometryGraph {
    liveBoard() { return this.board; }
}

type Shown = {
    elType: string; evalVisProp(name: string): unknown; plaintext?: string; visProp: Record<string, unknown>;
    dataX?: number[]; dataY?: number[]; X?: () => number; Y?: () => number;
};
const mirror = (px: number, py: number, qx: number, qy: number) => ({p: {x: px, y: py}, q: {x: qx, y: qy}});

/** The opening scenes of the three example cards (two mirrors, classifying, dilation), the Demonstration default and a few more. */
const SCENES: Record<string, Partial<IsometryState>> = {
    twoMirrors: {mode: 'mirrors', mirrors: [mirror(0, 0, 1, 0), mirror(0, 0, 2, 1), DEFAULT_ISOMETRY_STATE.mirrors[2]]},
    parallelMirrors: {mode: 'mirrors', mirrors: [mirror(0, 0, 0, 1), mirror(3, 0, 3, 1), DEFAULT_ISOMETRY_STATE.mirrors[2]]},
    classifyReflection: {mode: 'classify', motionLength: 1, mirrors: [mirror(1, 0, 2, 1), DEFAULT_ISOMETRY_STATE.mirrors[1], DEFAULT_ISOMETRY_STATE.mirrors[2]]},
    classifyRotation: {mode: 'classify', ...CLASSIFY_EXAMPLES.rotation},
    classifyGlide: {mode: 'classify', ...CLASSIFY_EXAMPLES.glide},
    dilation: {mode: 'similarity'},
    dilationNegative: {mode: 'similarity', dilationK: -0.5},
    rosette: {mode: 'rosette'},
    frieze: {mode: 'frieze'},
};

const overlaps = (a: PxBox, b: PxBox) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function mountScene(scene: Partial<IsometryState>) {
    const graph = new Probe();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => { graph.setState(scene); });
    act(() => { graph.liveBoard().update(); });
    act(() => { graph.liveBoard().update(); });
    return graph;
}

/** What the board draws, in px from the top left corner (y down): the shown texts with their estimated boxes, the handles and markers, samples of the strokes. */
function drawn(graph: Probe) {
    const board = graph.liveBoard();
    const [left, top] = board.getBoundingBox();
    const toPx = (x: number, y: number): readonly [number, number] => [(x - left) * board.unitX, (top - y) * board.unitY];
    const width = board.canvasWidth, height = board.canvasHeight;
    const shown = (board.objectsList as unknown as Shown[]).filter(o => Boolean(o.evalVisProp('visible')));
    const labels = shown.filter(o => o.elType === 'text').map(o => {
        const text = o as unknown as JXG.Text & {plaintext?: string};
        const [cx, cy] = toPx(text.X(), text.Y());
        const w = (text.plaintext ?? '').length * 7 + 4;
        return {text: text.plaintext ?? '', box: {x0: cx - w / 2, y0: cy - 9, x1: cx + w / 2, y1: cy + 9} as PxBox};
    }).filter(l => l.text !== '' && !/^[-−\d.,]+$/.test(l.text)); // the axis tick numbers are not the graph's captions
    const markers = shown.filter(o => o.elType === 'point').map(o => toPx(o.X!(), o.Y!()));
    const samples = shown.flatMap(o => {
        if (o.elType === 'curve') return sampleLine(o.dataX ?? [], o.dataY ?? [], toPx, width, height, 2, 2000);
        if (o.elType !== 'line' && o.elType !== 'segment') return [];
        const l = o as unknown as JXG.Line;
        const [x0, y0, x1, y1] = [l.point1.X(), l.point1.Y(), l.point2.X(), l.point2.Y()];
        const dx = x1 - x0, dy = y1 - y0, length = Math.hypot(dx, dy) || 1;
        const reach = o.elType === 'line' ? 60 / length : 1;
        const from = o.elType === 'line' ? -reach : 0;
        return sampleLine([x0 + dx * from, x0 + dx * reach], [y0 + dy * from, y0 + dy * reach], toPx, width, height, 2, 2000);
    });
    return {labels, markers, samples};
}

describe('IsometryGraph board text placement', () => {
    for (const [name, scene] of Object.entries(SCENES)) {
        it(`${name}: every text is clear of the handles, of the drawn lines and of the other texts`, () => {
            const {labels, markers, samples} = drawn(mountScene(scene));
            expect(labels.length).toBeGreaterThan(0);
            for (const label of labels) {
                const {box} = label;
                for (const [mx, my] of markers) {
                    expect(mx + 6 > box.x0 && mx - 6 < box.x1 && my + 6 > box.y0 && my - 6 < box.y1, `"${label.text}" lies on a marker`).toBe(false);
                }
                // A text may cross a rosette or frieze figure only when the figure has no free room; the card scenes must be clear.
                if (name !== 'rosette' && name !== 'frieze') {
                    const hit = samples.find(([x, y]) => x >= box.x0 + 2 && x <= box.x1 - 2 && y >= box.y0 + 2 && y <= box.y1 - 2); // the box is an estimate of the text, so its rim is not judged
                    expect(hit, `"${label.text}" lies on a drawn line at ${hit} (box ${JSON.stringify(box)})`).toBeUndefined();
                }
            }
            labels.forEach((a, i) => labels.slice(i + 1).forEach(b => expect(overlaps(a.box, b.box), `"${a.text}" and "${b.text}" overlap`).toBe(false)));
        });
    }
});
