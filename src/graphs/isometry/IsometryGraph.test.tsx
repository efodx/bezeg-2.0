import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {GraphPalette} from '../styles/GraphPalette';
import {CLASSIFY_EXAMPLES, DEFAULT_ISOMETRY_STATE, VIEW_HALF, type IsometryMode, type IsometryState} from '../../isometry/isometryModel';
import {
    COORDINATE_BIG_STEP, COORDINATE_STEP, handlesFor, HANDLE_TOUCH_RADIUS, HIT_SLACK, IsometryGraph, mergedPoly, RATIO_STEP, rosetteMirrorPoly,
} from './IsometryGraph';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** Exposes the board and the protected disposal the scene replacement calls. */
class ObservedGraph extends IsometryGraph {
    liveBoard() { return this.board; }
    disposeNow() { this.disposeFigureScene(); }
}

function mountGraph(strict = false) {
    const graph = new ObservedGraph();
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    const view = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
    return {graph, view};
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const statusText = () => document.querySelector('[data-isometry-status]')!.textContent;
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const mirrorX = (n: number, end: 'P' | 'Q') => t('isometry_graph_mirror_x', {value0: String(n), value1: end});
const mirrorY = (n: number, end: 'P' | 'Q') => t('isometry_graph_mirror_y', {value0: String(n), value1: end});
type EventedPoint = JXG.Point & {eventHandlers: Record<string, unknown[]>; triggerEventHandlers(names: string[], args: unknown[]): void};
/** How many drag, over and out handlers a handle carries. */
const handlerCounts = (point: JXG.Point) =>
    (['drag', 'over', 'out'] as const).map(name => (point as EventedPoint).eventHandlers[name]?.length ?? 0);

function dragHandleTo(point: JXG.Point, x: number, y: number) {
    point.setPosition(JXG.COORDS_BY_USER, [x, y]);
    act(() => { (point as EventedPoint).triggerEventHandlers(['drag'], []); });
}

const chooseMode = (mode: IsometryMode) => act(() => { fireEvent.change(field(t('isometry_graph_mode_label')), {target: {value: mode}}); });

type Probe = {elType: string; evalVisProp(name: string): unknown; X?: () => number; Y?: () => number; dataX?: number[]};
const probes = (graph: ObservedGraph) => graph.liveBoard().objectsList as unknown as Probe[];
const shownCaptions = (graph: ObservedGraph) =>
    probes(graph).filter(o => o.elType === 'text' && o.evalVisProp('visible')).map(o => (o as unknown as {plaintext: string}).plaintext);
const shown = (graph: ObservedGraph, elType: string) => probes(graph).filter(o => o.elType === elType && o.evalVisProp('visible')).length;
const pointShownAt = (graph: ObservedGraph, x: number, y: number, tolerance = 1e-9) =>
    probes(graph).some(o => o.elType === 'point' && o.evalVisProp('visible') && Math.abs(o.X!() - x) < tolerance && Math.abs(o.Y!() - y) < tolerance);
/** Polygons per visible curve: one more than the NaN breaks of its data (an empty curve has none). */
const curvePolygons = (graph: ObservedGraph) => probes(graph).filter(o => o.elType === 'curve').map(o => {
    const data = o.dataX ?? [];
    return data.length === 0 ? 0 : data.filter(Number.isNaN).length + 1;
});
const noBadText = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
const withState = (patch: Partial<IsometryState>) => ({...DEFAULT_ISOMETRY_STATE, ...patch});

test('every point on the board has finite coordinates in every mode', () => {
    const {graph} = mountGraph();
    for (const mode of ['mirrors', 'classify', 'similarity', 'rosette', 'frieze'] as const) {
        chooseMode(mode);
        for (const o of probes(graph).filter(p => p.elType === 'point')) {
            expect(Number.isFinite(o.X!())).toBe(true);
            expect(Number.isFinite(o.Y!())).toBe(true);
        }
    }
});

test('the start view contains everything the model counts as in view', () => {
    const {graph} = mountGraph();
    const box = graph.liveBoard().getBoundingBox();
    // The host widens the box to the canvas aspect, so it contains the square [-VIEW_HALF, VIEW_HALF]^2.
    expect(box[0]).toBeLessThanOrEqual(-VIEW_HALF);
    expect(box[1]).toBeGreaterThanOrEqual(VIEW_HALF);
    expect(box[2]).toBeGreaterThanOrEqual(VIEW_HALF);
    expect(box[3]).toBeLessThanOrEqual(-VIEW_HALF);
});

describe('the five modes draw their spec elements and read the exact kernel', () => {
    test('L1 mirrors: mirrors through (0,0),(1,0) and (0,0),(2,1): matrix 1/5 [[3,-4],[4,3]], (3,1) -> (3,-1) -> (1,3), angle 53.13 and half 26.57', () => {
        const {graph} = mountGraph();
        expect([...graph.handles().keys()]).toEqual(handlesFor('mirrors', 2));
        expect(shown(graph, 'line')).toBe(2);
        expect(readout('composite')).toBe(t('isometry_graph_class_rotation'));
        expect(readout('centre')).toBe('(0; 0)');
        expect(readout('angle')).toBe('53,13°'); // atan2(4/5, 3/5)
        expect(readout('half-angle')).toBe('26,57°');
        expect(readout('first-image')).toBe('(3; −1)');
        expect(readout('last-image')).toBe('(1; 3)');
        expect(readout('orientation')).toBe(t('isometry_graph_orientation_kept'));
        expect(readout('fixed')).toBe(t('isometry_graph_fixed_one'));
        expect(pointShownAt(graph, 0, 0)).toBe(true); // the rotation centre marker
        expect(document.querySelector('[data-readout="angle"] dt')!.textContent).toMatch(/izračunano/);
        expect(statusText()).toContain(t('isometry_graph_class_rotation'));
        expect(document.querySelector('[data-readout-live]')!.textContent).toBe(statusText());
    });

    test('L1 parallel mirrors x = 0 and x = 3 give the translation (6, 0) with no fixed point', () => {
        const {graph} = mountGraph();
        act(() => {
            graph.setState({mirrors: [{p: {x: 0, y: 0}, q: {x: 0, y: 1}}, {p: {x: 3, y: 0}, q: {x: 3, y: 1}}, DEFAULT_ISOMETRY_STATE.mirrors[2]]});
        });
        expect(readout('composite')).toBe(t('isometry_graph_class_translation'));
        expect(readout('vector')).toBe('(6; 0)');
        expect(readout('fixed')).toBe(t('isometry_graph_fixed_none'));
        expect(readout('angle')).toBeUndefined();
        expect(shown(graph, 'line')).toBe(2);
    });

    test('the rotation centre cross is stroked in its colour (a cross has no fill, so a white outline would hide it)', () => {
        const {graph} = mountGraph();
        chooseMode('classify');
        act(() => { graph.setState({...CLASSIFY_EXAMPLES.rotation}); });
        const crosses = probes(graph).filter(o => o.elType === 'point' && o.evalVisProp('visible') && String(o.evalVisProp('face')) === 'cross');
        expect(crosses).toHaveLength(1);
        expect(String(crosses[0].evalVisProp('strokecolor'))).toBe(GraphPalette.constructionAccent);
    });

    test('L2 classify: the three examples are a rotation about (1,2), a glide with vector (2,2) and the reflection y = x - 1', () => {
        const {graph} = mountGraph();
        chooseMode('classify');
        expect([...graph.handles().keys()]).toEqual(handlesFor('classify', 2));
        act(() => { graph.setState({...CLASSIFY_EXAMPLES.rotation}); });
        expect(readout('composite')).toBe(t('isometry_graph_class_rotation'));
        expect(readout('centre')).toBe('(1; 2)');
        expect(readout('angle')).toBe('90°');
        expect(readout('half-angle')).toBeUndefined(); // two mirrors only in the first mode
        expect(readout('fixed')).toBe(t('isometry_graph_fixed_one'));

        act(() => { graph.setState({...CLASSIFY_EXAMPLES.glide}); });
        expect([...graph.handles().keys()]).toEqual(handlesFor('classify', 3));
        expect(readout('composite')).toBe(t('isometry_graph_class_glide'));
        expect(readout('vector')).toBe('(2; 2)');
        expect(readout('fixed')).toBe(t('isometry_graph_fixed_none'));
        expect(readout('orientation')).toBe(t('isometry_graph_orientation_reversed'));
        // the motif vertex (3,1) goes to (y + 2, x + 2) = (3, 5)
        expect(readout('last-image')).toBe('(3; 5)');
        expect(shown(graph, 'line')).toBe(4); // three mirrors and the glide axis

        act(() => { graph.setState({...CLASSIFY_EXAMPLES.reflection}); });
        expect([...graph.handles().keys()]).toEqual(handlesFor('classify', 1));
        expect(readout('composite')).toBe(t('isometry_graph_class_reflection'));
        expect(readout('fixed')).toBe(t('isometry_graph_fixed_line'));
        expect(readout('last-image')).toBe('(2; 2)'); // (x, y) -> (y + 1, x - 1)
        expect(readout('vector')).toBeUndefined();
        expect(shown(graph, 'line')).toBe(2); // the mirror and the reflection axis
    });

    test('L3 similarity: centre (1,1), k = 3/2: ratios 3/2 and 9/4, area 6 -> 27/2, vertex (-1/2,-1/2); k = -1/2 and k = 1', () => {
        const {graph} = mountGraph();
        chooseMode('similarity');
        expect([...graph.handles().keys()]).toEqual(['centre', 'k']);
        expect(graph.handles().get('k')!.X()).toBe(2.5);
        expect(readout('side-ratio')).toBe('3/2 ≈ 1,5');
        expect(readout('area-ratio')).toBe('9/4 ≈ 2,25');
        expect(readout('area')).toBe('6 → 27/2 ≈ 13,5');
        expect(readout('fixed')).toBe('(1; 1)');
        expect(readout('isometry')).toBe(t('isometry_graph_no'));
        expect(readout('image-1')).toBe('(−1/2 ≈ −0,5; −1/2 ≈ −0,5)');
        expect(pointShownAt(graph, 1, 1)).toBe(true);
        act(() => { graph.setState({dilationK: -0.5}); });
        expect(readout('side-ratio')).toBe('1/2 ≈ 0,5');
        expect(readout('area-ratio')).toBe('1/4 ≈ 0,25');
        expect(readout('image-1')).toBe('(3/2 ≈ 1,5; 3/2 ≈ 1,5)');
        expect(readout('orientation')).toBe(t('isometry_graph_orientation_kept'));
        act(() => { graph.setState({dilationK: 1}); });
        expect(readout('fixed')).toBe(t('isometry_graph_fixed_all'));
        expect(readout('isometry')).toBe(t('isometry_graph_yes'));
        expect(statusText()).toContain(t('isometry_graph_class_identity'));
        noBadText();
    });

    test('L3 with a rotation about the centre: quarter-turn after k = 3/2 takes vertex (0,0) to (5/2,-1/2); the centre stays fixed', () => {
        const {graph} = mountGraph();
        chooseMode('similarity');
        act(() => { fireEvent.change(field(t('isometry_graph_turn_label')), {target: {value: 'r90'}}); });
        expect(graph.state.dilationTurn).toBe('r90');
        expect(readout('image-1')).toBe('(5/2 ≈ 2,5; −1/2 ≈ −0,5)');
        expect(readout('fixed')).toBe('(1; 1)');
        expect(readout('area-ratio')).toBe('9/4 ≈ 2,25');
    });

    test('L4 rosette: n = 5 gives order 5 and 5 images, with mirrors 10 and 10; a point on a mirror has 5 distinct images; the centre has 1', () => {
        const {graph} = mountGraph();
        chooseMode('rosette');
        expect([...graph.handles().keys()]).toEqual(['point']);
        expect(readout('group')).toBe('ciklična grupa C5');
        expect(readout('order')).toBe('5');
        expect(readout('distinct')).toBe('5');
        // the rotation by 72 degrees of (4,1): (4 cos - sin, 4 sin + cos)
        expect(pointShownAt(graph, 0.28501146118, 4.11324305957, 1e-6)).toBe(true);
        expect(readout('image-2')).toBe('(0,285; 4,1132)');
        act(() => { graph.setState({rosetteMirrors: true}); });
        expect(readout('group')).toBe('diedrska grupa D5');
        expect(readout('order')).toBe('10');
        expect(readout('distinct')).toBe('10');
        expect(statusText()).toBe(t('isometry_graph_status_rosette', {value0: '10', value1: '10'}));
        expect(curvePolygons(graph)).toEqual([5]); // five mirror lines as one curve
        act(() => { graph.setState({rosettePoint: {x: 4, y: 0}}); });
        expect(readout('distinct')).toBe('5');
        expect(statusText()).toBe(t('isometry_graph_status_rosette_mirror', {value0: '5', value1: '10'}));
        act(() => { graph.setState({rosettePoint: {x: 0, y: 0}}); });
        expect(readout('distinct')).toBe('1');
        expect(statusText()).toBe(t('isometry_graph_status_rosette_centre'));
        noBadText();
    });

    test('L5 frieze: a half-turn alone is p2 with 2 images per period; V + G is p2mg, V + H is p2mm (4 each); H + G halves the period', () => {
        const {graph} = mountGraph();
        chooseMode('frieze');
        expect([...graph.handles().keys()]).toEqual([]);
        expect(readout('type')).toBe('p2');
        expect(readout('copies')).toBe('2');
        // L = 4, window 19: the identity copies sit at 0.1 + 4k, k = -4..4 (9, one of them the base) and the half-turn copies at -0.9 + 4k, k = -4..4 (9)
        expect(curvePolygons(graph)).toEqual([8, 9, 1]);
        const feature = (name: 'vertical' | 'horizontal' | 'half_turn' | 'glide') => field(t(`isometry_graph_feature_${name}`));
        act(() => { fireEvent.click(feature('half_turn')); fireEvent.click(feature('vertical')); fireEvent.click(feature('glide')); });
        expect(graph.state.friezeFeatures).toEqual({vertical: true, horizontal: false, halfTurn: false, glide: true});
        expect(readout('type')).toBe('p2mg');
        expect(readout('copies')).toBe('4');
        expect(readout('has-halfTurn')).toBe(t('isometry_graph_yes')); // the half-turn appears between the mirrors
        expect(statusText()).toBe(t('isometry_graph_status_frieze', {value0: 'p2mg', value1: '4'}));
        act(() => { fireEvent.click(feature('glide')); fireEvent.click(feature('horizontal')); });
        expect(readout('type')).toBe('p2mm');
        expect(readout('copies')).toBe('4');
        act(() => { graph.setState({friezeFeatures: {vertical: false, horizontal: true, halfTurn: false, glide: true}}); });
        expect(statusText()).toBe(t('isometry_graph_status_frieze_reduces'));
        expect(readout('type')).toBe(t('isometry_graph_none'));
        expect(curvePolygons(graph)).toEqual([8, 0, 1]); // only the translates are certain
        noBadText();
        act(() => { enterNumber(field(t('isometry_graph_period_label')), '7'); });
        expect(graph.state.friezePeriod).toBe(7);
        expect(readout('period')).toBe('7');
    });
});

describe('degenerate states show a status and never NaN', () => {
    test('coincident mirror points: a status naming the mirror, no composite and no hidden NaN', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({mirrors: [DEFAULT_ISOMETRY_STATE.mirrors[0], {p: {x: 2, y: 2}, q: {x: 2, y: 2}}, DEFAULT_ISOMETRY_STATE.mirrors[2]]}); });
        expect(statusText()).toBe(t('isometry_graph_status_coincident', {value0: '2'}));
        expect(readout('composite')).toBe(t('isometry_graph_none'));
        expect(shown(graph, 'line')).toBe(1); // only the mirror that is defined
        expect(curvePolygons(graph)).toEqual([0, 0, 0]);
        for (const o of probes(graph).filter(p => p.elType === 'point')) {
            expect(Number.isFinite(o.X!())).toBe(true);
            expect(Number.isFinite(o.Y!())).toBe(true);
        }
        noBadText();
        chooseMode('classify');
        act(() => { graph.setState({motionLength: 3, mirrors: [DEFAULT_ISOMETRY_STATE.mirrors[0], DEFAULT_ISOMETRY_STATE.mirrors[1], {p: {x: 1, y: 1}, q: {x: 1, y: 1}}]}); });
        expect(statusText()).toBe(t('isometry_graph_status_coincident', {value0: '3'}));
        noBadText();
    });

    test('images off the view are counted in the status', () => {
        const {graph} = mountGraph();
        act(() => {
            graph.setState({mirrors: [{p: {x: 16, y: 0}, q: {x: 16, y: 1}}, {p: {x: 0, y: 0}, q: {x: 0, y: 1}}, DEFAULT_ISOMETRY_STATE.mirrors[2]]});
        });
        // the first image has x = 29, 27, 29 and the second -29, -27, -29: six vertices beyond 20
        expect(statusText()).toContain(t('isometry_graph_status_off_view', {value0: '6'}));
        act(() => { graph.setState(withState({mode: 'rosette', rosettePoint: {x: 16, y: 16}, rosetteN: 4})); });
        // the four rotations of (16,16) by 90 degrees stay at distance 16 on both axes: none is off view
        expect(statusText()).not.toContain(t('isometry_graph_status_off_view', {value0: '1'}));
        act(() => { graph.setState({rosetteN: 8}); });
        // the 45 degree rotation takes (16,16) to (0, 22.6): that and the 135, 225 and 315 degree images are beyond 20
        expect(statusText()).toContain(t('isometry_graph_status_off_view', {value0: '4'}));
        noBadText();
    });
});

describe('numeric input per handle', () => {
    test('every handle of every mode follows its numeric fields', () => {
        const {graph} = mountGraph();
        const position = (id: Parameters<ReturnType<typeof graph.handles>['get']>[0]) => {
            const point = graph.handles().get(id)!;
            return [point.X(), point.Y()];
        };
        act(() => {
            enterNumber(field(mirrorX(1, 'P')), '-3'); enterNumber(field(mirrorY(1, 'P')), '2');
            enterNumber(field(mirrorX(1, 'Q')), '4'); enterNumber(field(mirrorY(1, 'Q')), '-5');
            enterNumber(field(mirrorX(2, 'P')), '6'); enterNumber(field(mirrorY(2, 'P')), '7');
            enterNumber(field(mirrorX(2, 'Q')), '-8'); enterNumber(field(mirrorY(2, 'Q')), '9');
        });
        expect([position('m1p'), position('m1q'), position('m2p'), position('m2q')]).toEqual([[-3, 2], [4, -5], [6, 7], [-8, 9]]);

        chooseMode('classify');
        act(() => { enterNumber(field(t('isometry_graph_length_label')), '3'); });
        expect(graph.state.motionLength).toBe(3);
        act(() => { enterNumber(field(mirrorX(3, 'P')), '11'); enterNumber(field(mirrorY(3, 'Q')), '-12'); });
        expect(position('m3p')[0]).toBe(11);
        expect(position('m3q')[1]).toBe(-12);

        chooseMode('similarity');
        act(() => {
            enterNumber(field(t('isometry_graph_centre_x')), '-2'); enterNumber(field(t('isometry_graph_centre_y')), '3'); enterNumber(field(t('isometry_graph_k_label')), '-2,25');
        });
        expect(position('centre')).toEqual([-2, 3]);
        expect(position('k')).toEqual([-4.25, 3]);

        chooseMode('rosette');
        act(() => {
            enterNumber(field(t('isometry_graph_point_x')), '5'); enterNumber(field(t('isometry_graph_point_y')), '-6'); enterNumber(field(t('isometry_graph_n_label')), '7');
        });
        expect(position('point')).toEqual([5, -6]);
        expect(graph.state.rosetteN).toBe(7);
        act(() => { fireEvent.click(field(t('isometry_graph_rosette_mirrors_label'))); });
        expect(graph.state.rosetteMirrors).toBe(true);
    });

    test('a value outside the range is refused, a value off the grid is rounded to it, NaN is refused on every edit path', () => {
        const {graph} = mountGraph();
        act(() => { enterNumber(field(mirrorX(1, 'P')), '17'); });
        expect(graph.state.mirrors[0].p.x).toBe(0);
        act(() => { enterNumber(field(mirrorX(1, 'Q')), '2,4'); });
        expect(graph.state.mirrors[0].q.x).toBe(2);
        const before = graph.state;
        expect(graph.editMirror(0, 'p', 'x', Number.NaN)).toBe(false);
        expect(graph.editMirror(1, 'q', 'y', Number.POSITIVE_INFINITY)).toBe(false);
        expect(graph.editCentre('x', Number.NaN)).toBe(false);
        expect(graph.editPoint('y', Number.NaN)).toBe(false);
        expect(graph.editRatio(Number.NaN)).toBe(false);
        expect(graph.editRosetteN(Number.NaN)).toBe(false);
        expect(graph.editPeriod(Number.NaN)).toBe(false);
        expect(graph.editMotionLength(Number.NaN)).toBe(false);
        expect(graph.state).toBe(before);
    });

    test('the ratio goes through the model snapping: 0 and values that round to 0 never occur, out-of-range clamps', () => {
        const {graph} = mountGraph();
        expect(graph.editRatio(9)).toBe(true);
        expect(graph.state.dilationK).toBe(4);
        expect(graph.editRatio(1.3)).toBe(true);
        expect(graph.state.dilationK).toBe(1.25);
        expect(graph.editRatio(0)).toBe(false); // a typed zero (or 0.1, which the field rounds to 0) is refused and k keeps its value
        expect(graph.editRatio(0.1)).toBe(false);
        expect(graph.editRatio(-0.1)).toBe(false);
        expect(graph.state.dilationK).toBe(1.25);
        expect(graph.stepRatio(0)).toBe(true); // a step through zero goes below from the positive side
        expect(graph.state.dilationK).toBe(-0.25);
        expect(graph.editRosetteN(99)).toBe(true);
        expect(graph.state.rosetteN).toBe(12);
        expect(graph.editPeriod(2)).toBe(true);
        expect(graph.state.friezePeriod).toBe(4);
        expect(graph.editMotionLength(7)).toBe(true);
        expect(graph.state.motionLength).toBe(3);
    });

    test('choosing a mode keeps the mirrors; choosing a classify example loads its mirrors and length', () => {
        const {graph} = mountGraph();
        act(() => { enterNumber(field(mirrorX(1, 'P')), '3'); });
        chooseMode('similarity');
        chooseMode('mirrors');
        expect(graph.state.mirrors[0].p.x).toBe(3);
        chooseMode('classify');
        act(() => { fireEvent.change(field(t('isometry_graph_example_label')), {target: {value: 'glide'}}); });
        expect(graph.state).toMatchObject(CLASSIFY_EXAMPLES.glide);
        expect(field(t('isometry_graph_example_label')).value).toBe('glide');
        act(() => { graph.setState({motionLength: 2}); });
        expect(field(t('isometry_graph_example_label')).value).toBe('own');
    });
});

describe('keyboard and touch', () => {
    test('arrows step a coordinate by 1, Page keys by 5, the ratio by 1/4, and the order and period by 1', () => {
        const {graph} = mountGraph();
        expect([COORDINATE_STEP, COORDINATE_BIG_STEP, RATIO_STEP]).toEqual([1, 5, 0.25]);
        act(() => { fireEvent.keyDown(field(mirrorX(1, 'P')), {key: 'ArrowUp'}); });
        expect(graph.state.mirrors[0].p.x).toBe(1);
        act(() => { fireEvent.keyDown(field(mirrorX(1, 'P')), {key: 'PageUp'}); });
        expect(graph.state.mirrors[0].p.x).toBe(6);
        act(() => { fireEvent.keyDown(field(mirrorY(2, 'Q')), {key: 'ArrowDown'}); });
        expect(graph.state.mirrors[1].q.y).toBe(0);
        chooseMode('similarity');
        act(() => { fireEvent.keyDown(field(t('isometry_graph_k_label')), {key: 'ArrowUp'}); });
        expect(graph.state.dilationK).toBe(1.75);
        chooseMode('rosette');
        act(() => { fireEvent.keyDown(field(t('isometry_graph_n_label')), {key: 'ArrowUp'}); });
        expect(graph.state.rosetteN).toBe(6);
        chooseMode('frieze');
        act(() => { fireEvent.keyDown(field(t('isometry_graph_period_label')), {key: 'ArrowUp'}); });
        expect(graph.state.friezePeriod).toBe(5);
        expect(document.body.textContent).toContain('Puščici gor in dol');
    });

    test('every handle has a touch hit zone of at least 44 px across and a narrower mouse zone', () => {
        const {graph} = mountGraph();
        const board = graph.liveBoard() as unknown as {_inputDevice: string};
        expect(2 * (HANDLE_TOUCH_RADIUS + HIT_SLACK)).toBeGreaterThanOrEqual(44);
        for (const mode of ['mirrors', 'classify', 'similarity', 'rosette'] as const) {
            chooseMode(mode);
            act(() => { graph.setState({motionLength: 3}); });
            expect(graph.handles().size).toBeGreaterThan(0);
            for (const handle of graph.handles().values()) {
                const [, x, y] = handle.coords.scrCoords;
                board._inputDevice = 'touch';
                expect(handle.hasPoint(x + 25, y)).toBe(true);
                expect(handle.hasPoint(x, y - 25)).toBe(true);
                expect(handle.hasPoint(x + 40, y)).toBe(false);
                board._inputDevice = 'mouse';
                expect(handle.hasPoint(x + 25, y)).toBe(false);
            }
        }
    });
});

describe('dragging', () => {
    test('a mirror point, the centre and the rosette point snap to the grid and clamp to the range', () => {
        const {graph} = mountGraph();
        dragHandleTo(graph.handles().get('m2q')!, 2.3, 1.6);
        expect(graph.state.mirrors[1].q).toEqual({x: 2, y: 2});
        expect(graph.handles().get('m2q')!.X()).toBe(2);
        dragHandleTo(graph.handles().get('m1p')!, 30, -30);
        expect(graph.state.mirrors[0].p).toEqual({x: 16, y: -16});
        expect(readout('composite')).toBeDefined();
        chooseMode('similarity');
        dragHandleTo(graph.handles().get('centre')!, -3.4, 5.5);
        expect(graph.state.dilationCentre).toEqual({x: -3, y: 6});
        expect(graph.handles().get('k')!.X()).toBe(-3 + 1.5); // the ratio handle follows the centre
        dragHandleTo(graph.handles().get('k')!, -3 + 2.6, 6);
        expect(graph.state.dilationK).toBe(2.5);
        dragHandleTo(graph.handles().get('k')!, -3 + 0.05, 6);
        expect(graph.state.dilationK).toBe(0.25); // never 0
        chooseMode('rosette');
        dragHandleTo(graph.handles().get('point')!, 7.4, -2.6);
        expect(graph.state.rosettePoint).toEqual({x: 7, y: -3});
        expect(readout('point')).toBe('(7; −3)');
    });

    test('dragging does not change the number of board objects or rebuild the scene', () => {
        const {graph} = mountGraph();
        const owned = graph.ownedObjectCount();
        const handle = graph.handles().get('m1q')!;
        dragHandleTo(handle, 9, 4);
        expect(graph.state.mirrors[0].q).toEqual({x: 9, y: 4});
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(graph.handles().get('m1q')).toBe(handle);
    });
});

describe('ownership', () => {
    test('mount, state change, mode change and unmount: objects and listeners are owned and released', () => {
        const {graph, view} = mountGraph();
        const board = graph.liveBoard();
        const owned = graph.ownedObjectCount();
        const base = board.objectsList.length - owned;
        expect(graph.ownedListenerCount()).toBe(handlesFor('mirrors', 2).length); // one disposer per handle, covering drag, over and out
        expect(handlerCounts(graph.handles().get('m1p')!)).toEqual([1, 1, 1]);
        const sameHandle = graph.handles().get('m2q')!;
        act(() => { graph.setState({mirrors: [{p: {x: 1, y: 1}, q: {x: 4, y: 2}}, DEFAULT_ISOMETRY_STATE.mirrors[1], DEFAULT_ISOMETRY_STATE.mirrors[2]]}); });
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(board.objectsList.length).toBe(base + owned);
        expect(graph.handles().get('m2q')).toBe(sameHandle); // a state change does not rebuild

        const oldHandle = graph.handles().get('m1p')!;
        chooseMode('similarity');
        expect(graph.ownedListenerCount()).toBe(2);
        expect(handlerCounts(oldHandle)).toEqual([0, 0, 0]);
        expect(board.objectsList.length).toBe(base + graph.ownedObjectCount());
        chooseMode('frieze');
        expect(graph.ownedListenerCount()).toBe(0);
        chooseMode('mirrors');
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(board.objectsList.length).toBe(base + owned);
        chooseMode('classify');
        act(() => { graph.setState({motionLength: 3}); });
        expect([...graph.handles().keys()]).toEqual(handlesFor('classify', 3));
        expect(board.objectsList.length).toBe(base + graph.ownedObjectCount());

        const handle = graph.handles().get('m1p')!;
        graph.disposeNow();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
        expect(handlerCounts(handle)).toEqual([0, 0, 0]);
        expect(board.objectsList.length).toBe(base); // back to what was there before the scene

        view.unmount();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
    });

    test('unmount releases the objects, the listeners and the board label of a live scene', () => {
        const {graph, view} = mountGraph();
        const handle = graph.handles().get('m1p')!;
        expect(document.querySelector(`[aria-label="${t('isometry_graph_board_label')}"]`)).not.toBeNull();
        view.unmount();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
        expect(handlerCounts(handle)).toEqual([0, 0, 0]);
    });

    test('StrictMode mounts, unmounts and mounts again with the same number of objects as a plain mount', () => {
        const plain = mountGraph();
        const expected = {owned: plain.graph.ownedObjectCount(), board: plain.graph.liveBoard().objectsList.length};
        plain.view.unmount();
        const strict = mountGraph(true);
        expect(strict.graph.ownedObjectCount()).toBe(expected.owned);
        expect(strict.graph.liveBoard().objectsList.length).toBe(expected.board);
        expect(strict.graph.ownedListenerCount()).toBe(4);
        strict.view.unmount();
        expect(strict.graph.ownedObjectCount()).toBe(0);
    });
});

describe('controls compliance repairs', () => {
    test('a typed 0 or 0,1 for k is refused with the field hint and k keeps its value; the keyboard step through zero still crosses it', () => {
        const {graph} = mountGraph();
        chooseMode('similarity');
        act(() => { graph.setState({dilationK: 1}); });
        const k =field(t('isometry_graph_k_label'));
        act(() => { enterNumber(k, '0,1'); });
        expect(graph.state.dilationK).toBe(1);
        expect(screen.getByText(t('isometry_graph_k_rejected', {value0: '0,25', value1: '4'}))).toBeInTheDocument();
        act(() => { enterNumber(k, '0'); });
        expect(graph.state.dilationK).toBe(1);
        act(() => { enterNumber(k, '2,5'); });
        expect(graph.state.dilationK).toBe(2.5);
        act(() => { graph.setState({dilationK: 0.25}); });
        act(() => { fireEvent.keyDown(field(t('isometry_graph_k_label')), {key: 'ArrowDown'}); });
        expect(graph.state.dilationK).toBe(-0.25);
    });

    test('the mirror count has its own help stating 1 to 3, and each instance has its own help ids', () => {
        const {graph} = mountGraph();
        chooseMode('classify');
        const length = field(t('isometry_graph_length_label'));
        const own = Array.from(document.querySelectorAll('.number-input-help')).map(node => node.textContent);
        expect(own).toContain(t('isometry_graph_length_help', {value0: '1', value1: '3'}));
        expect(length.getAttribute('aria-describedby')).toMatch(/isometry-input-help-\d+/);
        mountGraph();
        const ids = Array.from(document.querySelectorAll('[id^="isometry-input-help-"]')).map(node => node.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.length).toBeGreaterThanOrEqual(2);
        expect(graph.state.mode).toBe('classify');
    });

    test('a frieze with no feature checked is a valid state: the translations alone, p1, no bad text', () => {
        const {graph} = mountGraph();
        chooseMode('frieze');
        act(() => { fireEvent.click(field(t('isometry_graph_feature_half_turn'))); });
        expect(Object.values(graph.state.friezeFeatures).every(on => !on)).toBe(true);
        expect(statusText()).toBe(t('isometry_graph_status_frieze', {value0: 'p1', value1: '1'}));
        noBadText();
    });
});

describe('review repairs', () => {
    test('every numeric field of every mode is described by the key help, which states the ranges', () => {
        const {graph} = mountGraph();
        const described = (label: string) => {
            const input = field(label);
            expect(input.getAttribute('aria-describedby') ?? '').toContain('isometry-input-help');
        };
        for (const end of ['P', 'Q'] as const) for (const n of [1, 2]) { described(mirrorX(n, end)); described(mirrorY(n, end)); }
        chooseMode('classify');
        described(t('isometry_graph_length_label'));
        chooseMode('similarity');
        for (const key of ['isometry_graph_centre_x', 'isometry_graph_centre_y', 'isometry_graph_k_label'] as const) described(t(key));
        chooseMode('rosette');
        for (const key of ['isometry_graph_n_label', 'isometry_graph_point_x', 'isometry_graph_point_y', 'isometry_graph_rosette_mirrors_label'] as const) described(t(key));
        chooseMode('frieze');
        for (const key of ['isometry_graph_period_label', 'isometry_graph_feature_vertical', 'isometry_graph_feature_horizontal',
            'isometry_graph_feature_half_turn', 'isometry_graph_feature_glide'] as const) described(t(key));
        const help = document.querySelector('[id^="isometry-input-help-"]')!.textContent!;
        expect(help).toContain('od −16 do 16');
        expect(help).toContain('od 0,25 do 4');
        expect(help).toContain('od 1 do 12');
        expect(help).toContain('od 4 do 8');
        expect(graph.state.mode).toBe('frieze');
    });

    test('the board names every element the readouts name, in both languages', () => {
        const {graph} = mountGraph();
        expect(shownCaptions(graph)).toEqual(expect.arrayContaining(['zrcalo 1', 'zrcalo 2', 'lik', 'slika 1', 'slika 2', 'središče']));
        chooseMode('similarity');
        expect(shownCaptions(graph)).toEqual(expect.arrayContaining(['središče', 'k', 'lik', 'slika 1']));
        chooseMode('rosette');
        expect(shownCaptions(graph)).toEqual(expect.arrayContaining(['središče', 'točka lika', 'slika 1', 'slika 2', 'slika 3', 'slika 4', 'slika 5']));
        expect(shownCaptions(graph)).not.toContain('slika 6');
        chooseMode('frieze');
        expect(shownCaptions(graph)).toEqual(expect.arrayContaining(['lik', 'perioda 4']));
        chooseMode('classify');
        act(() => { graph.setState({...CLASSIFY_EXAMPLES.glide}); });
        expect(shownCaptions(graph)).toEqual(expect.arrayContaining(['zrcalo 3', 'slika 3', 'os']));
        act(() => { setLanguage('en'); });
        expect(shownCaptions(graph)).toEqual(expect.arrayContaining(['mirror 3', 'image 3', 'axis', 'figure']));
        expect(shownCaptions(graph).filter(c => /zrcalo|slika|lik$|os$/.test(c))).toEqual([]);
    });

    test('the view is cached on the state object and the rosette images are split once per view', () => {
        const {graph} = mountGraph();
        const first = graph.view();
        expect(graph.view()).toBe(first);
        act(() => { graph.setState({mirrors: [{p: {x: 1, y: 1}, q: {x: 4, y: 2}}, DEFAULT_ISOMETRY_STATE.mirrors[1], DEFAULT_ISOMETRY_STATE.mirrors[2]]}); });
        expect(graph.view()).not.toBe(first);
        chooseMode('rosette');
        act(() => { graph.setState({rosetteMirrors: true, rosettePoint: {x: 3, y: 1}}); });
        const split = (graph as unknown as {rosetteImages(): {direct: unknown[]; reflected: unknown[]; all: unknown[]}}).rosetteImages();
        expect((graph as unknown as {rosetteImages(): unknown}).rosetteImages()).toBe(split);
        expect([split.direct.length, split.reflected.length, split.all.length]).toEqual([5, 5, 10]);
        expect(shown(graph, 'point')).toBeGreaterThanOrEqual(10);
    });

    test('the frieze features form a labelled group', () => {
        mountGraph();
        chooseMode('frieze');
        const group = screen.getByRole('group', {name: t('isometry_graph_features_group')});
        expect(group.querySelectorAll('input[type="checkbox"]').length).toBe(4);
    });

    test('the glide vector is an arrow on the axis, captioned like its readout; the frieze type is captioned on the board', () => {
        const {graph} = mountGraph();
        chooseMode('classify');
        act(() => { graph.setState({...CLASSIFY_EXAMPLES.glide}); });
        expect(shown(graph, 'arrow')).toBe(1);
        expect(shownCaptions(graph)).toContain('vektor premika');
        expect(document.querySelector('[data-readout="vector"] dt')!.textContent).toBe('Vektor premika');
        act(() => { graph.setState({...CLASSIFY_EXAMPLES.reflection}); });
        expect(shown(graph, 'arrow')).toBe(0);
        expect(shownCaptions(graph)).not.toContain('vektor premika');
        chooseMode('frieze');
        const type = document.querySelector('[data-readout="type"] dd')!.textContent;
        expect(shownCaptions(graph)).toContain(`tip friza ${type}`);
        act(() => { setLanguage('en'); });
        expect(shownCaptions(graph)).toContain(`frieze type ${type}`);
    });

    test('the key help states the keyboard step of each field type', () => {
        mountGraph();
        const help = document.querySelector('[id^="isometry-input-help-"]')!.textContent!;
        expect(help).toContain('koordinate za 1');
        expect(help).toContain('razmerje k za 1/4');
        expect(help).toContain('za 5, 1 ter 2');
        expect(COORDINATE_BIG_STEP).toBe(5);
    });

    test('angles and rosette points are labelled computed', () => {
        const {graph} = mountGraph();
        for (const id of ['angle', 'half-angle']) expect(document.querySelector(`[data-readout="${id}"] dt`)!.textContent).toMatch(/izračunano/);
        chooseMode('rosette');
        for (const id of ['image-1', 'image-2', 'distinct']) expect(document.querySelector(`[data-readout="${id}"] dt`)!.textContent).toMatch(/izračunano/);
        expect(document.querySelector('[data-readout="point"] dt')!.textContent).not.toMatch(/izračunano/); // the stored grid point is exact
        act(() => { setLanguage('en'); });
        expect(document.querySelector('[data-readout="image-1"] dt')!.textContent).toMatch(/computed/);
        expect(graph.state.mode).toBe('rosette');
    });

    test('merged curve data hold one ring per polygon with NaN between rings', () => {
        const poly = mergedPoly([
            {element: 0, period: 0, xs: [0, 1, 1], ys: [0, 0, 1]},
            {element: 0, period: 1, xs: [4, 5, 5], ys: [0, 0, 1]},
        ]);
        expect(poly.x.length).toBe(9);
        expect(Number.isNaN(poly.x[4])).toBe(true);
        expect(poly.x.slice(0, 4)).toEqual([0, 1, 1, 0]);
        expect(rosetteMirrorPoly(3).x.filter(Number.isNaN).length).toBe(2);
        expect(Math.max(...rosetteMirrorPoly(3).y.filter(Number.isFinite))).toBeLessThanOrEqual(VIEW_HALF);
    });
});

test('the status, the labels and the board name follow a language switch', () => {
    mountGraph();
    act(() => { setLanguage('en'); });
    expect(statusText()).toBe('Composite motion: rotation; the orientation of the image is kept.');
    expect(screen.getByLabelText('Mirror 1, point P: x')).toBeInTheDocument();
    expect(document.querySelector('[data-readout-live]')!.textContent).toContain('rotation');
    expect(readout('half-angle')).toBe('26.57°');
    expect(document.querySelector(`[aria-label="${t('isometry_graph_board_label')}"]`)).not.toBeNull();
});
