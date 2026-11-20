import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import type {PxBox} from '../legend/boardLabelPlacement';
import {distanceToBox, nameBox} from '../legend/pointNamePlacement';
import {textBox} from "./descentLabels";
import {DEFAULT_DESCENT_STATE} from '../../mechanics/trackModel';
import {DescentGraph, TAG_A, TAG_CYCLOID, TAG_END, TAG_LINE, TAG_P1, TAG_P2, TAG_TRACK, type DescentGraphState} from './DescentGraph';

// A lesson board at 1440 px is about 960 x 620; the shared shim's 600 x 400 is more crowded than any shown frame.
beforeAll(() => {
    installBoardShims();
    for (const [name, size] of [['clientWidth', 960], ['clientHeight', 620], ['offsetWidth', 960], ['offsetHeight', 620]] as const) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
});
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => setLanguage('sl'));

class Probe extends DescentGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; plaintext?: string; evalVisProp(name: string): unknown; X?: () => number; Y?: () => number};

/** The lesson frame (drag the track, step 2 frame 2: the default track with P1 and P2 moved) and a steep one. */
const SCENES: Record<string, Partial<DescentGraphState>> = {
    lesson: {mode: 'track', p1x: 0.25, p1y: 1.5, p2x: 1.5, p2y: 2.5},
    default: {mode: 'track'},
    steep: {mode: 'track', endX: 2, endY: 3, p1x: 0.3, p1y: 2, p2x: 1.2, p2y: 3.2},
};

const overlaps = (a: PxBox, b: PxBox) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function mountScene(state: Partial<DescentGraphState>) {
    const graph = new Probe();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => { graph.setState(state); });
    act(() => { graph.liveBoard().update(); });
    return graph;
}

/** The shown texts (anchored left, middle) with their estimated boxes, and the drawn handles and A. */
function drawn(graph: Probe) {
    const board = graph.liveBoard();
    const [left, top] = board.getBoundingBox();
    const toPx = (x: number, y: number) => [(x - left) * board.unitX, (top - y) * board.unitY] as const;
    const shown = (board.objectsList as unknown as Shown[]).filter(o => Boolean(o.evalVisProp('visible')));
    const texts = shown.filter(o => o.elType === 'text' && o.plaintext && o.plaintext !== '0,0' && Math.abs(toPx(o.X!(), o.Y!())[0] - 10) > 1).map(o => { // the captions stand at the left edge, not placed
        const [x, y] = toPx(o.X!(), o.Y!());
        const name = o.plaintext!.replace(/\$/g, '');
        const {w, h} = name.length <= 2 ? nameBox(name, 15) : textBox(name);
        return {name, box: {x0: x, y0: y - h / 2, x1: x + w, y1: y + h / 2} as PxBox};
    });
    const markers = shown.filter(o => o.elType === 'point' && o.X).map(o => ({at: toPx(o.X!(), o.Y!()), r: Number(o.evalVisProp('size')) + 1}));
    return {texts, markers};
}

/** The texts of the track mode, by the names of the board. */
const NAMES = ['Cikloida', 'Premica', 'Tir'];

describe('DescentGraph track mode texts', () => {
    test('the tag indices the placement uses are the texts they name', () => {
        const graph = mountScene(SCENES.lesson);
        const names = drawn(graph).texts.map(text => text.name);
        for (const name of NAMES) expect(names).toContain(name);
        expect([TAG_LINE, TAG_CYCLOID, TAG_TRACK, TAG_A, TAG_END, TAG_P1, TAG_P2]).toEqual([0, 3, 4, 5, 7, 8, 9]);
        expect(names.filter(name => name.startsWith('P1 (') || name.startsWith('P2 ('))).toHaveLength(2);
    });

    for (const [scene, state] of Object.entries(SCENES)) {
        test(`${scene}: no two texts overlap and none covers a marker`, () => {
            const {texts, markers} = drawn(mountScene(state));
            expect(texts.length).toBeGreaterThanOrEqual(7);
            for (let i = 0; i < texts.length; i++) {
                for (let j = i + 1; j < texts.length; j++) expect(overlaps(texts[i].box, texts[j].box), `${texts[i].name} / ${texts[j].name}`).toBe(false);
                for (const m of markers) expect(distanceToBox(texts[i].box, m.at[0], m.at[1]) >= 3, `${texts[i].name} covers a marker`).toBe(true);
            }
        });
    }

    test('a drag keeps every text clear of the others, and a change of language or a reset keeps them placed', () => {
        const graph = mountScene(SCENES.lesson);
        for (let k = 0; k < 12; k++) {
            act(() => { graph.setState({p1x: 0.25 + 0.07 * k, p1y: 1.5 + 0.05 * k}); });
            act(() => { graph.liveBoard().update(); });
            const {texts} = drawn(graph);
            for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) expect(overlaps(texts[i].box, texts[j].box), `${k}: ${texts[i].name} / ${texts[j].name}`).toBe(false);
        }
        act(() => { graph.setState({...DEFAULT_DESCENT_STATE, mode: 'track'}); }); // the default state restored (a reset)
        act(() => { graph.liveBoard().update(); });
        const afterReset = drawn(graph).texts.map(text => text.name);
        for (const name of NAMES) expect(afterReset).toContain(name);
        expect(afterReset.filter(name => /^P[12] \(/.test(name))).toHaveLength(2);
        act(() => { setLanguage('en'); });
        act(() => { graph.liveBoard().update(); });
        expect(drawn(graph).texts.map(text => text.name)).toEqual(expect.arrayContaining(['Cycloid', 'Line', 'Track']));
    });

    test('the other modes keep their offsets: a text of the race stays 9 px from its point', () => {
        const graph = mountScene({mode: 'race'});
        const {texts} = drawn(graph);
        expect(texts.map(text => text.name)).toContain('Cikloida');
    });
});
