import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {LinearMapGraph} from './LinearMapGraph';
import {linearMapPresetCollection} from './linearMapPresetCollection';
import {EIGEN_COLORS} from './eigenBoard';
import {unitVector} from './eigenScene';
import {DEFAULT_LINEAR_MAP_STATE, LinearMapState} from '../../linear/linearMapModel';
import {LINEAR_MAP_EXAMPLES, type Mat2} from '../../linear/matrix2';
import {en} from '../../localization/en';
import {sl} from '../../localization/sl';
import {setLanguage, t} from '../../localization';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class ObservedGraph extends LinearMapGraph {
    modelNow() { return this.model; }
    tip() { return this.eigenTip!; }
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
function dragTo(point: JXG.Point, x: number, y: number) {
    point.setPosition(JXG.COORDS_BY_USER, [x, y]);
    act(() => { (point as Evented).triggerEventHandlers(['drag'], []); });
}
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const statusIds = () => [...document.querySelectorAll('[data-linear-map-status]')].map(element => element.getAttribute('data-linear-map-status'));
const statusText = (id: string) => document.querySelector(`[data-linear-map-status="${id}"]`)?.textContent ?? '';
const selectMode = (mode: string) => act(() => { fireEvent.change(screen.getByLabelText(t('linear_map_mode_label')), {target: {value: mode}}); });
const selectExample = (id: string) => act(() => { fireEvent.change(screen.getByLabelText(t('linear_map_example_label')), {target: {value: id}}); });
const E = LINEAR_MAP_EXAMPLES['eigen-default'];
const eigen = (graph: ObservedGraph, matrix: Mat2 = E, angle = 0) => act(() => {
    graph.act({kind: 'linear-map', operation: 'set-matrix', matrix});
    graph.act({kind: 'linear-map', operation: 'set-mode', mode: 'eigen'});
    graph.act({kind: 'linear-map', operation: 'set-test-vector', angle});
});
const snapButton = () => document.querySelector('[data-action="linear-map-snap-eigen"]') as HTMLButtonElement;

/** The eigen-direction lines currently drawn: the curves in the eigen-only line colour that have data. */
function drawnLines(graph: ObservedGraph): number {
    const curves = (graph.liveBoard().objectsList as any[]).filter(o => o.elType === 'curve' && o.visProp?.strokecolor === EIGEN_COLORS.line);
    return curves.filter(curve => { curve.updateDataArray(); return curve.dataX.length > 0; }).length;
}

/** Every eigen-only object that is currently shown: the circle, the eigen lines, the arrows of v and Av (curves from the origin to them) and the two tips. */
function shownEigenObjects(graph: ObservedGraph): string[] {
    const shown = (o: any) => (typeof o.visProp?.visible === 'function' ? o.visProp.visible() : o.evalVisProp?.('visible') ?? o.visProp?.visible) !== false;
    const {matrix, testAngle} = graph.modelNow();
    const v = unitVector(testAngle);
    const av = [matrix[0][0] * v[0] + matrix[0][1] * v[1], matrix[1][0] * v[0] + matrix[1][1] * v[1]];
    const result: string[] = [];
    for (const o of graph.liveBoard().objectsList as any[]) {
        if (o.elType === 'circle' && o.visProp?.strokecolor === EIGEN_COLORS.circle && shown(o)) result.push('circle');
        else if (o.elType === 'curve') {
            o.updateDataArray();
            const [x, y] = [o.dataX as number[] | null, o.dataY as number[] | null];
            if (!x || !y || x.length === 0) continue;
            if (o.visProp?.strokecolor === EIGEN_COLORS.line) result.push('line');
            else if (x.length === 2 && x[0] === 0 && y[0] === 0 && x[1] === v[0] && y[1] === v[1]) result.push('arrow v');
            else if (x.length === 2 && x[0] === 0 && y[0] === 0 && x[1] === av[0] && y[1] === av[1]) result.push('arrow Av');
        } else if (o.elType === 'point' && ['$$Av$$', '$$v$$'].includes(o.name) && shown(o)) result.push(`point ${o.name}`);
    }
    return result;
}

describe('leaving the eigen mode hides every eigen object', () => {
    test('basis, iterate and tracedet show none of the circle, v, Av, the lines and the tips, and eigen shows them again', () => {
        const {graph} = mountGraph();
        eigen(graph, E, 30);
        const expected = ['circle', 'line', 'arrow v', 'arrow Av', 'point $$Av$$', 'point $$v$$'];
        const shownNow = shownEigenObjects(graph);
        expect(shownNow).toEqual(expect.arrayContaining(expected));
        expect(shownNow.filter(name => name === 'line')).toHaveLength(2);
        for (const mode of ['basis', 'eigen', 'iterate', 'eigen', 'tracedet', 'eigen']) {
            selectMode(mode);
            if (mode === 'eigen') expect(shownEigenObjects(graph).sort()).toEqual(shownNow.slice().sort());
            else expect(shownEigenObjects(graph)).toEqual([]);
        }
    });
});

describe('the eigen mode has its own view', () => {
    const box = (graph: ObservedGraph) => graph.liveBoard().getBoundingBox();
    const sameBox = (a: number[], b: number[]) => a.every((value, index) => Math.abs(value - b[index]) < 1e-9);

    test('entering the mode, a new matrix and the end of a handle drag refit it; a drag does not; leaving restores the plane view', () => {
        const {graph} = mountGraph();
        const basisBox = box(graph).slice();
        eigen(graph, LINEAR_MAP_EXAMPLES['scalar-2'], 0);
        const afterEnter = box(graph).slice();
        expect(sameBox(afterEnter, basisBox)).toBe(false);
        expect(afterEnter[0]).toBeCloseTo(-afterEnter[2], 9);
        expect(afterEnter[1]).toBeCloseTo(-afterEnter[3], 9);
        selectExample('eigen-default');
        const afterExample = box(graph).slice();
        expect(sameBox(afterExample, afterEnter)).toBe(false);
        // a handle drag leaves the view alone until the pointer is released
        dragTo(graph.handles()[0], 1, 1);
        expect(sameBox(box(graph), afterExample)).toBe(true);
        act(() => { (graph.handles()[0] as Evented).triggerEventHandlers(['up'], []); });
        expect(sameBox(box(graph), afterExample)).toBe(false);
        selectMode('basis');
        expect(sameBox(box(graph), basisBox)).toBe(true);
    });
});

describe('the eigen mode is selectable and drawn', () => {
    test('the mode select offers eigen, selecting it shows the controls, and the mode is accepted by Presets and set-mode', () => {
        const {graph} = mountGraph();
        const options = [...(screen.getByLabelText(t('linear_map_mode_label')) as HTMLSelectElement).options].map(option => option.value);
        expect(options).toContain('eigen');
        expect(options).toContain('ellipse');
        expect(options).not.toContain('composition');
        expect(snapButton()).toBeNull();
        selectMode('eigen');
        expect(graph.modelNow().mode).toBe('eigen');
        expect(snapButton()).not.toBeNull();
        expect(screen.getByRole('slider', {name: new RegExp(t('linear_map_test_angle_label'))})).toBeDefined();
        expect('data' in linearMapPresetCollection.check({...DEFAULT_LINEAR_MAP_STATE, mode: 'eigen'})).toBe(true);
        expect('data' in linearMapPresetCollection.check({...DEFAULT_LINEAR_MAP_STATE, mode: 'ellipse'})).toBe(true);
        expect('rejection' in linearMapPresetCollection.check({...DEFAULT_LINEAR_MAP_STATE, mode: 'composition'})).toBe(true);
        expect(() => graph.act({kind: 'linear-map', operation: 'set-mode', mode: 'ellipse'})).not.toThrow();
        graph.act({kind: 'linear-map', operation: 'set-mode', mode: 'eigen'});
        expect(() => graph.act({kind: 'linear-map', operation: 'set-mode', mode: 'composition'})).toThrow(/mode/);
    });

    test('the example chooser offers E, R, S, C and 2I', () => {
        mountGraph();
        const options = [...(screen.getByLabelText(t('linear_map_example_label')) as HTMLSelectElement).options].map(option => option.value);
        for (const id of ['eigen-default', 'quarter-turn', 'shear', 'singular', 'scalar-2']) expect(options).toContain(id);
        selectMode('eigen');
        selectExample('quarter-turn');
        expect(readout('discriminant')).toBe('−4');
    });

    test.each([
        ['E: two lines', 'eigen-default', 2, 'eigen-two'],
        ['R: none, with the status', 'quarter-turn', 0, 'eigen-none'],
        ['S: one line', 'shear', 1, 'eigen-one'],
        ['2I: no line, every direction', 'scalar-2', 0, 'eigen-all'],
        ['C: two lines, one is the kernel', 'singular', 2, 'eigen-two'],
    ] as const)('%s', (_name, exampleId, lines, status) => {
        const {graph} = mountGraph();
        selectMode('eigen');
        selectExample(exampleId);
        expect(drawnLines(graph)).toBe(lines);
        expect(statusIds()).toContain(status);
    });

    test('the statuses and readouts per class, in Slovenian with a decimal comma and in English', () => {
        const {graph} = mountGraph();
        eigen(graph, E);
        expect(readout('tau')).toBe('7');
        expect(readout('delta')).toBe('10');
        expect(readout('discriminant')).toBe('9');
        expect(readout('eigenvalues')).toBe(t('linear_map_value_eigenvalues_two', {value0: '5', value1: '2'}));
        expect(readout('eigenvalues')).toBe('5 in 2');
        eigen(graph, [[0, -1], [1, 0]]);
        expect(statusText('eigen-none')).toBe(t('linear_map_status_eigen_none', {value0: '0', value1: '1'}));
        eigen(graph, [[1, -1], [1 / 2, 1]]);
        expect(readout('eigenvalues')).toBe('1 ± 0,7071i');
        expect(statusIds()).toContain('eigen-none');
        eigen(graph, LINEAR_MAP_EXAMPLES.singular);
        expect(readout('eigenvalues')).toBe('2 in 0');
        expect(statusIds()).toContain('eigen-kernel');
        eigen(graph, [[0, 0], [0, 0]]);
        expect(statusIds()).toContain('eigen-all');
        expect(statusIds()).not.toContain('eigen-kernel');
        setLanguage('en');
        eigen(graph, E, 44.9);
        expect(readout('eigenvalues')).toBe('5 and 2');
        expect(readout('sine')).toBe('0.001');
        setLanguage('sl');
        eigen(graph, E, 44.9);
        expect(readout('sine')).toBe('0,001');
        expect(readout('test-angle')).toBe('44,9°');
    });
});

describe('the parallel indicator', () => {
    test('at 44 degrees E is not parallel (sine 0,0105), at 44,9 degrees it is approximately parallel (sine 0,0010); the tolerance is named', () => {
        const {graph} = mountGraph();
        eigen(graph, E, 44);
        expect(statusIds()).toContain('eigen-not-parallel');
        expect(statusIds()).not.toContain('eigen-approx-parallel');
        expect(readout('sine')).toBe('0,0105');
        eigen(graph, E, 44.9);
        expect(statusIds()).toContain('eigen-approx-parallel');
        expect(statusIds()).not.toContain('eigen-not-parallel');
        expect(statusIds()).not.toContain('eigen-exact-parallel');
        expect(readout('sine')).toBe('0,001');
        expect(statusText('eigen-approx-parallel')).toBe(t('linear_map_status_eigen_approx_parallel', {value0: '0,01'}));
        expect(document.querySelector('[data-linear-map-eigen-gloss]')!.textContent).toContain('0,01');
    });

    test('v in the kernel (Av = 0) shows the kernel wording, not "exactly parallel"', () => {
        const {graph} = mountGraph();
        eigen(graph, [[1, -1], [-1, 1]], 45);
        expect(readout('av')).toBeDefined();
        expect(statusIds()).toContain('eigen-v-kernel');
        expect(statusIds()).not.toContain('eigen-exact-parallel');
        expect(statusText('eigen-v-kernel')).toContain('Av = 0');
        eigen(graph, [[1, -1], [-1, 1]], 135); // Av = (-2, 2) is parallel to v = (-1, 1): the exact wording stays
        expect(statusIds()).toContain('eigen-exact-parallel');
        expect(statusIds()).not.toContain('eigen-v-kernel');
    });

    test('exactly parallel is claimed only at a multiple of 45 degrees where the exact test holds; elsewhere only approximately', () => {
        const {graph} = mountGraph();
        eigen(graph, LINEAR_MAP_EXAMPLES['scalar-2'], 0);
        expect(statusIds()).toEqual(expect.arrayContaining(['eigen-approx-parallel', 'eigen-exact-parallel']));
        eigen(graph, LINEAR_MAP_EXAMPLES['scalar-2'], 30);
        expect(statusIds()).toContain('eigen-approx-parallel'); // 2I: every direction is parallel
        expect(statusIds()).not.toContain('eigen-exact-parallel');
        eigen(graph, E, 45);
        expect(statusIds()).toEqual(expect.arrayContaining(['eigen-approx-parallel', 'eigen-exact-parallel']));
        eigen(graph, E, 225);
        expect(statusIds()).toContain('eigen-exact-parallel');
        eigen(graph, E, 90); // a multiple of 45 degrees but E(0,1) = (3,5) is not parallel to (0,1)
        expect(statusIds()).not.toContain('eigen-exact-parallel');
        eigen(graph, E, 116.57);
        expect(statusIds()).toContain('eigen-approx-parallel');
        expect(statusIds()).not.toContain('eigen-exact-parallel');
    });
});

describe('the slider, the drag and the snap share one path', () => {
    test('the angle slider writes the test angle and the tip follows on the circle', () => {
        const {graph} = mountGraph();
        eigen(graph, E, 0);
        const slider = screen.getByRole('slider', {name: new RegExp(t('linear_map_test_angle_label'))});
        act(() => { fireEvent.change(slider, {target: {value: '45'}}); });
        expect(graph.modelNow().testAngle).toBe(45);
        expect(graph.tip().X()).toBeCloseTo(Math.SQRT1_2, 12);
        expect(graph.tip().Y()).toBeCloseTo(Math.SQRT1_2, 12);
        expect(statusIds()).toContain('eigen-approx-parallel');
    });

    test('dragging the tip projects onto the circle and moves nothing else', () => {
        const {graph} = mountGraph();
        eigen(graph, E, 0);
        const [h1, h2] = graph.handles();
        const before = [h1.X(), h1.Y(), h2.X(), h2.Y()];
        dragTo(graph.tip(), 3, 4);
        expect(graph.modelNow().testAngle).toBe(53.13);
        expect(Math.hypot(graph.tip().X(), graph.tip().Y())).toBeCloseTo(1, 12);
        expect(graph.tip().X()).toBeCloseTo(Math.cos(53.13 * Math.PI / 180), 12);
        expect(graph.modelNow().matrix).toEqual(E);
        expect([h1.X(), h1.Y(), h2.X(), h2.Y()]).toEqual(before);
        dragTo(graph.tip(), -0.2, -0.0001);
        expect(graph.modelNow().testAngle).toBeCloseTo(180.03, 2);
        expect(Math.hypot(graph.tip().X(), graph.tip().Y())).toBeCloseTo(1, 12);
    });

    test('the snap lands on 45 degrees for E from 30 and on 116,57 from 100; v stays a unit vector', () => {
        const {graph} = mountGraph();
        eigen(graph, E, 30);
        act(() => { fireEvent.click(snapButton()); });
        expect(graph.modelNow().testAngle).toBe(45);
        expect(Math.hypot(graph.tip().X(), graph.tip().Y())).toBeCloseTo(1, 12);
        expect(statusIds()).toContain('eigen-approx-parallel');
        eigen(graph, E, 100);
        act(() => { fireEvent.click(snapButton()); });
        expect(graph.modelNow().testAngle).toBe(116.57);
        const parsed = linearMapPresetCollection.check(JSON.parse(JSON.stringify(graph.exportPresetData())));
        expect('data' in parsed).toBe(true);
        expect(JSON.parse(JSON.stringify((parsed as {data: LinearMapState}).data))).toEqual(JSON.parse(JSON.stringify(graph.exportPresetData())));
        expect(statusIds()).toContain('eigen-approx-parallel');
        expect(statusIds()).not.toContain('eigen-exact-parallel');
        expect(Math.abs(Number(readout('sine')!.replace(',', '.')))).toBeLessThanOrEqual(2e-4);
    });

    test('the snap is unavailable with a reason for the complex and the scalar cases', () => {
        const {graph} = mountGraph();
        eigen(graph, LINEAR_MAP_EXAMPLES['quarter-turn'], 30);
        expect(snapButton().getAttribute('aria-disabled')).toBe('true');
        expect(snapButton().title).toBe(t('linear_map_snap_unavailable_complex'));
        act(() => { fireEvent.click(snapButton()); });
        expect(graph.modelNow().testAngle).toBe(30);
        eigen(graph, LINEAR_MAP_EXAMPLES['scalar-2'], 30);
        expect(snapButton().title).toBe(t('linear_map_snap_unavailable_scalar'));
        eigen(graph, LINEAR_MAP_EXAMPLES.shear, 30);
        expect(snapButton().getAttribute('aria-disabled')).toBe('false');
    });
});

describe('Presets and both languages', () => {
    test('a Preset with the eigen mode round-trips with its test angle', () => {
        const stored = {...DEFAULT_LINEAR_MAP_STATE, matrix: E, mode: 'eigen', testAngle: 116.57, exampleId: 'eigen-default'};
        const checked = linearMapPresetCollection.check(JSON.parse(JSON.stringify(stored)));
        expect('data' in checked).toBe(true);
        const {graph} = mountGraph();
        act(() => { graph.importPresetData((checked as {data: LinearMapState}).data); });
        expect(JSON.parse(JSON.stringify(graph.exportPresetData()))).toEqual(stored);
        expect(graph.tip().X()).toBeCloseTo(Math.cos(116.57 * Math.PI / 180), 12);
        expect(statusIds()).toContain('eigen-approx-parallel');
    });

    test('both catalogs carry the new keys in lockstep, with the agreed Slovenian terms', () => {
        const pattern = /^linear_map_(.*eigen|snap_|test_angle|mode_eigen|example_(quarter|shear|scalar))/;
        const newKeys = Object.keys(en).filter(key => pattern.test(key));
        expect(newKeys.length).toBeGreaterThanOrEqual(25);
        for (const key of newKeys) expect(Object.keys(sl)).toContain(key);
        expect(sl.linear_map_status_eigen_two).toContain('lastni');
        expect(sl.linear_map_snap_eigen).toContain('lastni');
        expect(sl.linear_map_status_eigen_none).toContain('lastni');
    });
});
