import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {LinearMapGraph} from './LinearMapGraph';
import {linearMapPresetCollection} from './linearMapPresetCollection';
import {ELLIPSE_COLORS, ELLIPSE_MARK} from './ellipseBoard';
import {DEFAULT_LINEAR_MAP_STATE} from '../../linear/linearMapModel';
import {LINEAR_MAP_EXAMPLES, type Mat2} from '../../linear/matrix2';
import {en} from '../../localization/en';
import {sl} from '../../localization/sl';
import {setLanguage, t} from '../../localization';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class ObservedGraph extends LinearMapGraph {
    modelNow() { return this.model; }
    handles() { return [this.handle1!, this.handle2!]; }
    act(action: object) { this.applyLinearMapAction(action as never); }
    liveBoard() { return this.board; }
}

function mountGraph() {
    const graph = new ObservedGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

type Evented = JXG.Point & {triggerEventHandlers(names: string[], args: unknown[]): void};
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const statusIds = () => [...document.querySelectorAll('[data-linear-map-status]')].map(element => element.getAttribute('data-linear-map-status'));
const selectMode = (mode: string) => act(() => { fireEvent.change(screen.getByLabelText(t('linear_map_mode_label')), {target: {value: mode}}); });
const selectExample = (id: string) => act(() => { fireEvent.change(screen.getByLabelText(t('linear_map_example_label')), {target: {value: id}}); });
const matrix = (graph: ObservedGraph, m: Mat2) => act(() => {
    graph.act({kind: 'linear-map', operation: 'set-matrix', matrix: m});
    graph.act({kind: 'linear-map', operation: 'set-mode', mode: 'ellipse'});
});
const conic = (graph: ObservedGraph, visible: boolean) => act(() => graph.act({kind: 'linear-map', operation: 'set-conic', visible}));
const conicSwitch = () => screen.getByRole('checkbox', {name: t('linear_map_toggle_conic')}) as HTMLInputElement;
const numbers = (text: string | undefined) => (text ?? '').match(/-?\d+(?:[,.]\d+)?/g)!.map(value => parseFloat(value.replace(',', '.')));
const near = (text: string | undefined, expected: number, digits = 4) => expect(numbers(text)[0]).toBeCloseTo(expected, digits);

const shown = (o: any) => (typeof o.visProp?.visible === 'function' ? o.visProp.visible() : o.evalVisProp?.('visible') ?? o.visProp?.visible) !== false;
const nameOf = (o: any): string => (typeof o.name === 'function' ? o.name() : o.name) ?? '';
const marked = (o: any) => o.visProp?.cssclass === ELLIPSE_MARK;

/** The ellipse-only objects currently shown (marked with the ellipse class, the colours are shared with the eigen mode). */
function shownEllipseObjects(graph: ObservedGraph): string[] {
    const result: string[] = [];
    for (const o of graph.liveBoard().objectsList as any[]) {
        if (!marked(o) || !shown(o)) continue;
        if (o.elType === 'circle') result.push('circle');
        else if (o.elType === 'curve') {
            o.updateDataArray();
            if (o.dataX && o.dataX.length > 0) result.push(`curve ${o.visProp.strokecolor}`);
        } else if (o.elType === 'point') result.push(`point ${nameOf(o)}`);
    }
    return result;
}

/** The data of the drawn image curve (the marked curve of the image colour with points). */
function imageData(graph: ObservedGraph): {x: number[]; y: number[]} | undefined {
    for (const o of graph.liveBoard().objectsList as any[]) {
        if (!marked(o) || o.elType !== 'curve' || o.visProp.strokecolor !== ELLIPSE_COLORS.image || !shown(o)) continue;
        o.updateDataArray();
        if (o.dataX.length > 0) return {x: [...o.dataX], y: [...o.dataY]};
    }
    return undefined;
}

describe('the ellipse mode is selectable', () => {
    test('the select offers it, the inspector shows the conic switch, and Presets accept it', () => {
        const {graph} = mountGraph();
        const options = [...(screen.getByLabelText(t('linear_map_mode_label')) as HTMLSelectElement).options].map(option => option.value);
        expect(options).toContain('ellipse');
        expect(options).toContain('composition');
        expect(document.querySelector('[data-readout="sigma1"]')).toBeNull();
        selectMode('ellipse');
        expect(graph.modelNow().mode).toBe('ellipse');
        expect(conicSwitch().checked).toBe(false);
        expect('data' in linearMapPresetCollection.check({...DEFAULT_LINEAR_MAP_STATE, mode: 'ellipse'})).toBe(true);
    });
});

describe('S_y: axes 3 and 1 along (1,1) and (1,-1), conic semi-axes 1/sqrt(3) and 1', () => {
    test('readouts, symmetric status, domain and image axes at 45 degrees, conic readouts', () => {
        const {graph} = mountGraph();
        matrix(graph, LINEAR_MAP_EXAMPLES.symmetric);
        near(readout('sigma1'), 3);
        near(readout('sigma2'), 1);
        near(readout('det'), 3);
        near(readout('sigma-product'), 3);
        near(readout('axis-image'), 45, 2);
        near(readout('axis-domain'), 45, 2);
        expect(statusIds()).toContain('ellipse-symmetric');
        expect(statusIds()).not.toContain('ellipse-nonsymmetric');
        conic(graph, true);
        expect(conicSwitch().checked).toBe(true);
        expect(statusIds()).toContain('conic-ellipse');
        const [first, second] = numbers(readout('conic-axes'));
        expect(Math.min(first, second)).toBeCloseTo(1 / Math.sqrt(3), 4);
        expect(Math.max(first, second)).toBeCloseTo(1, 4);
    });
});

describe('N: not symmetric, axes are the singular directions', () => {
    test('sigma = sqrt(3 +- sqrt5), product 2, image axis about 13,28 deg, domain direction about 31,72 deg, conic drawn', () => {
        const {graph} = mountGraph();
        matrix(graph, LINEAR_MAP_EXAMPLES['non-symmetric']);
        near(readout('sigma1'), Math.sqrt(3 + Math.sqrt(5)));
        near(readout('sigma2'), Math.sqrt(3 - Math.sqrt(5)));
        near(readout('sigma-product'), 2);
        near(readout('abs-det'), 2);
        near(readout('axis-image'), 13.28, 2);
        near(readout('axis-domain'), 31.72, 2);
        expect(statusIds()).toContain('ellipse-nonsymmetric');
        conic(graph, true);
        expect(statusIds()).toContain('conic-ellipse');
        expect(readout('sym-row1')).toBeDefined();
        const drawn = shownEllipseObjects(graph);
        expect(drawn).toContain(`curve ${ELLIPSE_COLORS.conic}`);
        expect(drawn).not.toContain(`curve ${ELLIPSE_COLORS.image}`);
    });
});

describe('degenerate and indefinite cases', () => {
    test('an indefinite symmetric part (F) is described, not drawn', () => {
        const {graph} = mountGraph();
        matrix(graph, LINEAR_MAP_EXAMPLES['reflection-x']);
        conic(graph, true);
        expect(statusIds()).toContain('conic-hyperbola');
        expect(shownEllipseObjects(graph)).not.toContain(`curve ${ELLIPSE_COLORS.conic}`);
    });

    test('a negative definite symmetric part has no real points and a positive semidefinite one gives parallel lines', () => {
        const {graph} = mountGraph();
        matrix(graph, [[-1, 0], [0, -1]]);
        conic(graph, true);
        expect(statusIds()).toContain('conic-empty');
        matrix(graph, [[1, 0], [0, 0]]);
        expect(statusIds()).toContain('conic-lines');
        expect(shownEllipseObjects(graph)).not.toContain(`curve ${ELLIPSE_COLORS.conic}`);
    });

    test('det 0 draws a segment, the zero matrix a point, a scalar a circle with axes not unique', () => {
        const {graph} = mountGraph();
        matrix(graph, LINEAR_MAP_EXAMPLES.singular);
        expect(statusIds()).toContain('ellipse-segment');
        near(readout('sigma2'), 0, 9);
        expect(shownEllipseObjects(graph)).toContain(`curve ${ELLIPSE_COLORS.image}`);
        // the drawn data: one segment through the origin, of length 2 sigma1, along the column space u1 (never a closed ellipse)
        const [a1x, a1y] = [LINEAR_MAP_EXAMPLES.singular[0][0], LINEAR_MAP_EXAMPLES.singular[1][0]];
        const sigma1 = Math.hypot(...LINEAR_MAP_EXAMPLES.singular.flat());
        const segment = imageData(graph)!;
        expect(segment.x).toHaveLength(2);
        expect(Math.hypot(segment.x[1] - segment.x[0], segment.y[1] - segment.y[0])).toBeCloseTo(2 * sigma1, 9);
        expect(segment.x[0] + segment.x[1]).toBeCloseTo(0, 12);
        expect(segment.y[0] + segment.y[1]).toBeCloseTo(0, 12);
        expect((segment.x[1] - segment.x[0]) * a1y - (segment.y[1] - segment.y[0]) * a1x).toBeCloseTo(0, 9);
        near(readout('sigma1'), sigma1, 4);
        matrix(graph, [[0, 0], [0, 0]]);
        expect(statusIds()).toContain('ellipse-point');
        expect(shownEllipseObjects(graph)).not.toContain(`curve ${ELLIPSE_COLORS.image}`);
        expect(imageData(graph)).toBeUndefined();
        expect(shownEllipseObjects(graph)).toContain('point ');
        matrix(graph, LINEAR_MAP_EXAMPLES['scalar-2']);
        expect(statusIds()).toContain('ellipse-circle');
        const circle = imageData(graph)!;
        expect(circle.x.length).toBeGreaterThan(100);
        circle.x.forEach((x, i) => expect(Math.hypot(x, circle.y[i])).toBeCloseTo(2, 9));
        expect(shownEllipseObjects(graph).filter(name => name.includes('sigma'))).toEqual([]);
    });

    test('a rotation is a circle of radius 1 and has no real eigen-directions', () => {
        const {graph} = mountGraph();
        matrix(graph, LINEAR_MAP_EXAMPLES['quarter-turn']);
        expect(statusIds()).toContain('ellipse-circle');
        expect(statusIds()).toContain('ellipse-no-lines');
        near(readout('sigma1'), 1);
    });
});

describe('the lesson action set-conic', () => {
    test('is equivalent to the switch, rejects a non-boolean before any write, and chains in one synchronous tick', () => {
        const {graph} = mountGraph();
        selectMode('ellipse');
        act(() => { fireEvent.click(conicSwitch()); });
        expect(graph.modelNow().conicVisible).toBe(true);
        const viaSwitch = JSON.stringify(graph.modelNow());
        act(() => { fireEvent.click(conicSwitch()); });
        expect(graph.modelNow().conicVisible).toBe(false);
        conic(graph, true);
        expect(JSON.stringify(graph.modelNow())).toBe(viaSwitch);

        const before = graph.modelNow();
        for (const visible of ['true', 1, undefined, null]) {
            expect(() => graph.act({kind: 'linear-map', operation: 'set-conic', visible})).toThrow(/visible/);
            expect(graph.modelNow()).toBe(before);
        }

        const fresh = mountGraph().graph;
        act(() => {
            fresh.act({kind: 'linear-map', operation: 'set-mode', mode: 'ellipse'});
            fresh.act({kind: 'linear-map', operation: 'set-example', exampleId: 'non-symmetric'});
            fresh.act({kind: 'linear-map', operation: 'set-conic', visible: true});
            expect(fresh.modelNow()).toMatchObject({mode: 'ellipse', exampleId: 'non-symmetric', conicVisible: true});
            expect(fresh.modelNow().matrix).toEqual(LINEAR_MAP_EXAMPLES['non-symmetric']);
        });
    });
});

describe('leaving the ellipse mode hides every ellipse object', () => {
    test('every other mode shows none of them, and the ellipse mode shows them again', () => {
        const {graph} = mountGraph();
        matrix(graph, LINEAR_MAP_EXAMPLES['non-symmetric']);
        const now = shownEllipseObjects(graph);
        expect(now).toEqual(expect.arrayContaining(['circle', `curve ${ELLIPSE_COLORS.image}`, 'point $$\\sigma_1$$', 'point $$v_1$$']));
        for (const mode of ['basis', 'ellipse', 'determinant', 'ellipse', 'eigen', 'ellipse', 'iterate', 'ellipse', 'tracedet', 'ellipse']) {
            selectMode(mode);
            if (mode === 'ellipse') expect(shownEllipseObjects(graph).sort()).toEqual(now.slice().sort());
            else expect(shownEllipseObjects(graph), mode).toEqual([]);
        }
        // with the conic drawn instead
        conic(graph, true);
        const withConic = shownEllipseObjects(graph);
        expect(withConic).toContain(`curve ${ELLIPSE_COLORS.conic}`);
        for (const mode of ['eigen', 'iterate', 'tracedet']) {
            selectMode(mode);
            expect(shownEllipseObjects(graph), mode).toEqual([]);
        }
    });
});

describe('the ellipse mode has its own view', () => {
    const box = (graph: ObservedGraph) => graph.liveBoard().getBoundingBox();
    const sameBox = (a: number[], b: number[]) => a.every((value, index) => Math.abs(value - b[index]) < 1e-9);

    test('entering, a new example, the conic switch and the end of a handle drag refit it; a drag does not; leaving restores the plane view', () => {
        const {graph} = mountGraph();
        const basisBox = box(graph).slice();
        matrix(graph, LINEAR_MAP_EXAMPLES['scalar-2']);
        const afterEnter = box(graph).slice();
        expect(sameBox(afterEnter, basisBox)).toBe(false);
        expect(afterEnter[0]).toBeCloseTo(-afterEnter[2], 9);
        selectExample('symmetric');
        const afterExample = box(graph).slice();
        expect(sameBox(afterExample, afterEnter)).toBe(false);
        // the image fits: half-extent at least 1.2 max(1, sigma1, |a1|, |a2|) = 1.2 * 3
        expect(afterExample[2]).toBeGreaterThanOrEqual(1.2 * 3 - 1e-9);
        const point = graph.handles()[0];
        point.setPosition(JXG.COORDS_BY_USER, [1, 1]);
        act(() => { (point as Evented).triggerEventHandlers(['drag'], []); });
        expect(sameBox(box(graph), afterExample)).toBe(true);
        act(() => { (point as Evented).triggerEventHandlers(['up'], []); });
        expect(sameBox(box(graph), afterExample)).toBe(false);
        const afterUp = box(graph).slice();
        // a conic with semi-axes 2 (S = I/4) needs a wider view than its image (radius 1/4)
        act(() => graph.act({kind: 'linear-map', operation: 'set-matrix', matrix: [[1 / 4, 0], [0, 1 / 4]]}));
        const small = box(graph).slice();
        expect(sameBox(small, afterUp)).toBe(false);
        conic(graph, true);
        expect(box(graph)[2]).toBeGreaterThanOrEqual(1.2 * 2 - 1e-9);
        expect(sameBox(box(graph), small)).toBe(false);
        selectMode('basis');
        expect(sameBox(box(graph), basisBox)).toBe(true);
    });
});

describe('Presets and languages', () => {
    test('the conic switch survives a Preset check and an old Preset without it loads as off', () => {
        const stored = {...DEFAULT_LINEAR_MAP_STATE, mode: 'ellipse', conicVisible: true};
        const checked = linearMapPresetCollection.check(stored) as {data: {conicVisible?: boolean}};
        expect(checked.data.conicVisible).toBe(true);
        const old = linearMapPresetCollection.check({...DEFAULT_LINEAR_MAP_STATE, mode: 'ellipse'}) as {data: {conicVisible?: boolean}};
        expect(old.data.conicVisible ?? false).toBe(false);
        expect('rejection' in linearMapPresetCollection.check({...stored, conicVisible: 'yes'})).toBe(true);
    });

    test('every new key exists in both languages with the same placeholders, and the statuses render in English', () => {
        const keys = Object.keys(sl).filter(key => /^linear_map_.*(ellipse|conic|sigma|sym_row)/.test(key));
        expect(keys.length).toBeGreaterThan(20);
        const holes = (text: string) => (text.match(/\{value\d\}/g) ?? []).sort().join();
        for (const key of keys) {
            expect(key in en).toBe(true);
            expect(holes((en as Record<string, string>)[key])).toBe(holes((sl as Record<string, string>)[key]));
        }
        setLanguage('en');
        const {graph} = mountGraph();
        matrix(graph, LINEAR_MAP_EXAMPLES['non-symmetric']);
        expect(document.querySelector('[data-linear-map-status="ellipse-nonsymmetric"]')?.textContent).toBe(en.linear_map_status_ellipse_nonsymmetric);
    });
});
