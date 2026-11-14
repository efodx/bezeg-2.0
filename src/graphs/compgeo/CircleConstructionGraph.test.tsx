import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {expectHandleHitZones} from '../base/handleHitZoneBehaviour';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {exampleState, type CircleMode} from '../../compgeo/circleConstructionModel';
import {
    CircleConstructionGraph, COORDINATE_STEP, HANDLE_TOUCH_RADIUS, HIT_SLACK, MODE_HANDLES, RADIUS_BIG_STEP, RADIUS_STEP,
    RATIO_STEP,
} from './CircleConstructionGraph';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** Exposes the board and the protected disposal the scene replacement calls. */
class ObservedGraph extends CircleConstructionGraph {
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
const statusText = () => document.querySelector('[data-circle-status]')!.textContent;
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
// A centre or a point is a row of a point list (field name "<point>, x"); a radius and the ratio are sliders, typed into their exact field.
const centreName = (n: number) => `O${'₁₂₃'[n - 1]}`;
const centreX = (n: number) => `${centreName(n)}, x`;
const centreY = (n: number) => `${centreName(n)}, y`;
const radiusLabel = (n: number) => t('number_field_label', {value0: t('circle_construction_radius', {value0: String(n)})});
const ratioLabel = () => t('number_field_label', {value0: t('circle_construction_ratio_label')});
const pointX = (name: string) => `${name}, x`;
const pointY = (name: string) => `${name}, y`;
type EventedPoint = JXG.Point & {eventHandlers: Record<string, unknown[]>; triggerEventHandlers(names: string[], args: unknown[]): void};
const dragListeners = (point: JXG.Point) => (point as EventedPoint).eventHandlers.drag?.length ?? 0;

function dragHandleTo(point: JXG.Point, x: number, y: number) {
    point.setPosition(JXG.COORDS_BY_USER, [x, y]);
    act(() => { (point as EventedPoint).triggerEventHandlers(['drag'], []); });
}

const chooseMode = (mode: CircleMode) => act(() => { fireEvent.change(field(t('circle_construction_mode_label')), {target: {value: mode}}); });

type Probe = {elType: string; evalVisProp(name: string): unknown; X?: () => number; Y?: () => number};
const probes = (graph: ObservedGraph) => graph.liveBoard().objectsList as unknown as Probe[];
const shownText = (graph: ObservedGraph, part: string) =>
    probes(graph).filter(o => o.elType === 'text' && o.evalVisProp('visible') && (o as unknown as {plaintext: string}).plaintext.includes(part)).length;
const shown = (graph: ObservedGraph, elType: string) => probes(graph).filter(o => o.elType === elType && o.evalVisProp('visible')).length;
const pointShownAt = (graph: ObservedGraph, x: number, y: number) =>
    probes(graph).some(o => o.elType === 'point' && o.evalVisProp('visible') && Math.abs(o.X!() - x) < 1e-9 && Math.abs(o.Y!() - y) < 1e-9);

test('every point on the board has finite coordinates', () => {
    const {graph} = mountGraph();
    for (const mode of ['tangents', 'radical', 'apollonius', 'common'] as const) {
        chooseMode(mode);
        for (const o of probes(graph).filter(p => p.elType === 'point')) {
            expect(Number.isFinite(o.X!())).toBe(true);
            expect(Number.isFinite(o.Y!())).toBe(true);
        }
    }
});

describe('the four modes draw their spec elements and read the exact kernel', () => {
    test('tangents: Thales circle, two tangents and the chord of contact; the hand oracle O(0,0) r5, P(13,0)', () => {
        const {graph} = mountGraph();
        expect(graph.state.mode).toBe('tangents');
        expect([...graph.handles().keys()]).toEqual(MODE_HANDLES.tangents);
        expect(shown(graph, 'circle')).toBe(2); // the circle and the Thales circle
        expect(shown(graph, 'segment')).toBe(4); // two tangents, the chord, the line OP
        expect(pointShownAt(graph, 25 / 13, 60 / 13)).toBe(true);
        expect(pointShownAt(graph, 25 / 13, -60 / 13)).toBe(true);
        // power 13^2 - 5^2 = 144, length 12, chord 13 x = 25, Thales centre (13/2, 0) with squared radius 169/4
        expect(readout('power')).toBe('144');
        expect(readout('length')).toBe('12');
        expect(readout('count')).toBe('2');
        expect(readout('contact-1')).toBe('(1,9231; −4,6154)');
        expect(readout('contact-2')).toBe('(1,9231; 4,6154)');
        expect(readout('chord')).toBe('13 x = 25');
        expect(readout('thales')).toContain('13/2 ≈ 6,5');
        expect(readout('thales')).toContain('169/4 ≈ 42,25');
        expect(statusText()).toContain('144');
        expect(statusText()).toContain('12');
        expect(document.querySelector('[data-readout-live]')!.textContent).toBe(statusText());
    });

    test('radical: three axes, the radical centre and the orthogonal circle; the hand oracle powers -5, -1, 13 and centre (13/3, 10/3)', () => {
        const {graph} = mountGraph();
        chooseMode('radical');
        expect([...graph.handles().keys()]).toEqual(MODE_HANDLES.radical);
        expect(shown(graph, 'line')).toBe(3);
        expect(shown(graph, 'circle')).toBe(4); // three circles and the orthogonal circle
        expect(pointShownAt(graph, 13 / 3, 10 / 3)).toBe(true);
        // probe (4,2): c1 16+4-25, c2 4+4-9, c3 1+16-4
        expect(readout('power-1')).toBe('−5');
        expect(readout('power-2')).toBe('−1');
        expect(readout('power-3')).toBe('13');
        expect(readout('on-axis')).toBe(t('circle_construction_no'));
        expect(readout('axis-12')).toBe('12 x = 52');
        expect(readout('axis-13')).toBe('6 x + 12 y = 66');
        expect(readout('centre')).toBe('(13/3 ≈ 4,3333; 10/3 ≈ 3,3333)');
        // common power (13/3 - 0)^2 + (10/3)^2 - 25 = 44/9; the second circle gives (13/3 - 6)^2 + (10/3)^2 - 9 = 44/9
        expect(readout('centre-power')).toBe('44/9 ≈ 4,8889');
        expect(readout('orthogonal')).toBe('44/9 ≈ 4,8889');
        expect(readout('meet')).toBe(t('circle_construction_readout_meet_two'));
    });

    test('apollonius: the locus circle, both division points and the probe ratio; the hand oracle A(0,0) B(6,0) k=2 P(8,4)', () => {
        const {graph} = mountGraph();
        chooseMode('apollonius');
        expect([...graph.handles().keys()]).toEqual(MODE_HANDLES.apollonius);
        expect(shown(graph, 'circle')).toBe(1);
        expect(shown(graph, 'line')).toBe(0);
        expect(pointShownAt(graph, 4, 0)).toBe(true); // A + (B - A) 2/3
        expect(pointShownAt(graph, 12, 0)).toBe(true); // A + (B - A) 2
        expect(shownText(graph, 'PA : PB')).toBe(1);
        // centre (4 B - A) / 3 = (8, 0), r^2 = 4 * 36 / 9 = 16; |PA|^2 = 80 = 4 * 20 = 4 |PB|^2, so the ratio is 2 and P is on the circle
        expect(readout('ratio')).toBe('2');
        expect(readout('on-locus')).toBe(t('circle_construction_yes'));
        expect(readout('internal')).toBe('(4; 0)');
        expect(readout('external')).toBe('(12; 0)');
        expect(readout('locus')).toContain('(8; 0)');
        expect(readout('locus')).toContain('16');
        // the inverse of A in the circle: distance 8 from the centre, so 16 / 8 = 2 from the centre towards A, that is B
        expect(readout('inverse')).toBe('(6; 0)');
        act(() => { graph.setState({k: 1}); });
        expect(shown(graph, 'circle')).toBe(0);
        expect(shown(graph, 'line')).toBe(1); // the perpendicular bisector
    });

    test('common: homothety centres and four tangents; the hand oracle (0,0) r3 and (10,0) r1', () => {
        const {graph} = mountGraph();
        chooseMode('common');
        expect([...graph.handles().keys()]).toEqual(MODE_HANDLES.common);
        expect(shown(graph, 'line')).toBe(4);
        expect(shown(graph, 'circle')).toBe(2);
        // external centre (3 (10,0) - 1 (0,0)) / (3 - 1) = (15, 0); internal centre (1 (0,0) + 3 (10,0)) / 4 = (15/2, 0)
        expect(readout('external-centre')).toBe('(15; 0)');
        expect(readout('internal-centre')).toBe('(15/2 ≈ 7,5; 0)');
        expect(pointShownAt(graph, 15, 0)).toBe(true);
        expect(pointShownAt(graph, 7.5, 0)).toBe(true);
        expect(readout('distance2')).toBe('100');
        expect(readout('count')).toBe('4');
        act(() => { graph.setState({c2: {x: 4, y: 0, r: 1}}); }); // d = 4 = 3 + 1: the circles touch externally
        expect(readout('count')).toBe('3');
        expect(shown(graph, 'line')).toBe(3);
    });
});

describe('degenerate states show a status and never NaN', () => {
    const noBadText = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);

    test('tangents: P = O, P inside, P on the circle', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({p: {x: 0, y: 0}}); });
        expect(statusText()).toBe(t('circle_construction_status_tangents_centre'));
        expect(readout('count')).toBe('0');
        expect(shown(graph, 'segment')).toBe(0);
        noBadText();
        act(() => { graph.setState({p: {x: 3, y: 0}}); });
        expect(statusText()).toBe(t('circle_construction_status_tangents_inside', {value0: '−16'}));
        expect(readout('count')).toBe('0');
        act(() => { graph.setState({p: {x: 5, y: 0}}); });
        expect(statusText()).toBe(t('circle_construction_status_tangents_on'));
        expect(readout('count')).toBe('1');
        expect(shown(graph, 'line')).toBe(1);
        noBadText();
    });

    test('radical: concentric and coincident circles, also between the second and the third circle (the kernel reports parallel there)', () => {
        const {graph} = mountGraph();
        chooseMode('radical');
        act(() => { graph.setState({c2: {x: 0, y: 0, r: 3}}); });
        expect(statusText()).toBe(t('circle_construction_status_radical_concentric'));
        expect(readout('axis-12')).toBe(t('circle_construction_none'));
        expect(readout('centre')).toBe(t('circle_construction_none'));
        noBadText();
        act(() => { graph.setState({c2: {x: 6, y: 0, r: 3}, c3: {x: 6, y: 0, r: 2}}); });
        const derived = graph.view();
        expect(derived.mode === 'radical' && derived.centre.status).not.toBe('concentric'); // the kernel only inspects pairs 12 and 13
        expect(statusText()).toBe(t('circle_construction_status_radical_concentric'));
        expect(readout('axis-23')).toBe(t('circle_construction_none'));
        noBadText();
        act(() => { graph.setState({c2: {x: 0, y: 0, r: 5}}); });
        expect(statusText()).toBe(t('circle_construction_status_radical_coincident'));
        noBadText();
        act(() => { graph.setState({c2: {x: 6, y: 0, r: 3}, c3: {x: 12, y: 0, r: 4}}); });
        expect(statusText()).toBe(t('circle_construction_status_radical_parallel'));
        noBadText();
    });

    test('apollonius: P = B and A = B', () => {
        const {graph} = mountGraph();
        chooseMode('apollonius');
        act(() => { graph.setState({p: {x: 6, y: 0}}); });
        expect(statusText()).toContain(t('circle_construction_status_apollonius_at_b'));
        expect(readout('ratio')).toBe(t('circle_construction_readout_ratio_undefined'));
        expect(shownText(graph, 'PA : PB')).toBe(0);
        noBadText();
        act(() => { graph.setState({a: {x: 6, y: 0}}); });
        expect(statusText()).toContain(t('circle_construction_status_apollonius_degenerate'));
        expect(shown(graph, 'circle')).toBe(0);
        expect(shown(graph, 'line')).toBe(0);
        noBadText();
    });

    test('common: concentric, coincident, nested and equal radii', () => {
        const {graph} = mountGraph();
        chooseMode('common');
        act(() => { graph.setState({c2: {x: 0, y: 0, r: 1}}); });
        expect(statusText()).toBe(t('circle_construction_status_common_concentric'));
        expect(shown(graph, 'line')).toBe(0);
        noBadText();
        act(() => { graph.setState({c2: {x: 0, y: 0, r: 3}}); });
        expect(statusText()).toBe(t('circle_construction_status_common_coincident'));
        expect(readout('count')).toBe(t('circle_construction_none'));
        expect(shown(graph, 'line')).toBe(0);
        noBadText();
        act(() => { graph.setState({c2: {x: 10, y: 0, r: 3}}); });
        expect(statusText()).toContain(t('circle_construction_status_common_equal_radii'));
        expect(readout('external-centre')).toBe(t('circle_construction_none'));
        expect(shown(graph, 'line')).toBe(4);
        noBadText();
    });
});

describe('numeric input per handle', () => {
    test('every handle of every mode follows its numeric fields', () => {
        const {graph} = mountGraph();
        const handlePosition = (id: Parameters<ReturnType<typeof graph.handles>['get']>[0]) => {
            const point = graph.handles().get(id)!;
            return [point.X(), point.Y()];
        };
        act(() => { enterNumber(field(centreX(1)), '3'); enterNumber(field(centreY(1)), '-2'); });
        expect(graph.state.c1).toMatchObject({x: 3, y: -2});
        expect(handlePosition('c1')).toEqual([3, -2]);
        expect(handlePosition('c1r')).toEqual([3 + 5, -2]);
        act(() => { enterNumber(field(radiusLabel(1)), '2,5'); });
        expect(graph.state.c1.r).toBe(2.5);
        expect(handlePosition('c1r')).toEqual([5.5, -2]);
        act(() => { enterNumber(field(pointX('P')), '-7'); enterNumber(field(pointY('P')), '4'); });
        expect(handlePosition('p')).toEqual([-7, 4]);
        const hitZones = () => expectHandleHitZones(graph.liveBoard(), graph.handles().values(), HANDLE_TOUCH_RADIUS + HIT_SLACK);
        hitZones();

        chooseMode('radical');
        act(() => {
            enterNumber(field(centreX(2)), '1'); enterNumber(field(centreY(2)), '2'); enterNumber(field(radiusLabel(2)), '4');
            enterNumber(field(centreX(3)), '-3'); enterNumber(field(centreY(3)), '5'); enterNumber(field(radiusLabel(3)), '1,25');
        });
        expect(handlePosition('c2')).toEqual([1, 2]);
        expect(handlePosition('c2r')).toEqual([5, 2]);
        expect(handlePosition('c3')).toEqual([-3, 5]);
        expect(handlePosition('c3r')).toEqual([-1.75, 5]);
        hitZones();

        chooseMode('apollonius');
        act(() => {
            enterNumber(field(pointX('A')), '-4'); enterNumber(field(pointY('A')), '1');
            enterNumber(field(pointX('B')), '7'); enterNumber(field(pointY('B')), '-6');
            enterNumber(field(ratioLabel()), '3');
        });
        expect(handlePosition('a')).toEqual([-4, 1]);
        expect(handlePosition('b')).toEqual([7, -6]);
        expect(graph.state.k).toBe(3);
        hitZones();

        chooseMode('common');
        act(() => { enterNumber(field(centreX(2)), '9'); enterNumber(field(radiusLabel(2)), '0,25'); });
        expect(handlePosition('c2')).toEqual([9, 0]);
        expect(handlePosition('c2r')).toEqual([9.25, 0]);
        hitZones();
    });

    test('a value outside the range is refused, a value off the grid is rounded to it', () => {
        const {graph} = mountGraph();
        act(() => { enterNumber(field(centreX(1)), '17'); });
        expect(graph.state.c1.x).toBe(0);
        act(() => { enterNumber(field(radiusLabel(1)), '9'); });
        expect(graph.state.c1.r).toBe(5);
        act(() => { enterNumber(field(radiusLabel(1)), '2,6'); });
        expect(graph.state.c1.r).toBe(2.5);
        act(() => { enterNumber(field(pointX('P')), '2,4'); });
        expect(graph.state.p.x).toBe(2);
    });

    test('choosing a mode loads its example', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({p: {x: 1, y: 1}}); });
        chooseMode('apollonius');
        expect(graph.state).toMatchObject(exampleState('apollonius'));
        chooseMode('tangents');
        expect(graph.state).toMatchObject(exampleState('tangents'));
    });
});

describe('keyboard and touch', () => {
    test('arrows step a coordinate by 1 and a radius by 1/4; PageUp and PageDown take the big step (ten steps in a point row, one in a radius); the ratio steps by 1/2', () => {
        const {graph} = mountGraph();
        expect([COORDINATE_STEP, RADIUS_STEP, RADIUS_BIG_STEP, RATIO_STEP]).toEqual([1, 0.25, 1, 0.5]);
        act(() => { fireEvent.keyDown(field(centreX(1)), {key: 'ArrowUp'}); });
        expect(graph.state.c1.x).toBe(1);
        act(() => { fireEvent.keyDown(field(centreX(1)), {key: 'PageUp'}); });
        expect(graph.state.c1.x).toBe(11);
        act(() => { fireEvent.keyDown(field(centreX(1)), {key: 'PageDown'}); });
        expect(graph.state.c1.x).toBe(1);
        act(() => { fireEvent.keyDown(field(radiusLabel(1)), {key: 'ArrowDown'}); });
        expect(graph.state.c1.r).toBe(4.75);
        act(() => { fireEvent.keyDown(field(radiusLabel(1)), {key: 'PageUp'}); });
        expect(graph.state.c1.r).toBe(5.75);
        act(() => { fireEvent.keyDown(field(pointY('P')), {key: 'ArrowDown'}); });
        expect(graph.state.p.y).toBe(-1);
        chooseMode('apollonius');
        act(() => { fireEvent.keyDown(field(ratioLabel()), {key: 'ArrowUp'}); });
        expect(graph.state.k).toBe(2.5);
    });

});

describe('dragging', () => {
    test('a centre snaps to the grid and takes its radius handle along; a radius snaps to quarters; a point clamps to the range', () => {
        const {graph} = mountGraph();
        dragHandleTo(graph.handles().get('c1')!, 2.3, -1.6);
        expect(graph.state.c1).toEqual({x: 2, y: -2, r: 5});
        expect(graph.handles().get('c1')!.X()).toBe(2);
        expect(graph.handles().get('c1r')!.X()).toBe(7);
        expect(graph.handles().get('c1r')!.Y()).toBe(-2);
        dragHandleTo(graph.handles().get('c1r')!, 2 + 3.1, -2);
        expect(graph.state.c1.r).toBe(3);
        expect(graph.handles().get('c1r')!.X()).toBe(5);
        dragHandleTo(graph.handles().get('c1r')!, 2 + 3.15, -2 + 0.1);
        expect(graph.state.c1.r).toBe(3.25);
        dragHandleTo(graph.handles().get('p')!, 30, -30);
        expect(graph.state.p).toEqual({x: 16, y: -16});
        expect(graph.handles().get('p')!.X()).toBe(16);
        // 14^2 + 14^2 - 3,25^2 = 392 - 169/16 = 6103/16
        expect(readout('power')).toBe('6103/16 ≈ 381,4375');
    });

    test('dragging does not change the number of board objects', () => {
        const {graph} = mountGraph();
        const owned = graph.ownedObjectCount();
        dragHandleTo(graph.handles().get('p')!, 9, 4);
        expect(graph.state.p).toEqual({x: 9, y: 4});
        expect(graph.ownedObjectCount()).toBe(owned);
    });
});

describe('ownership', () => {
    test('mount, state change, mode change and unmount: objects and listeners are owned and released', () => {
        const {graph, view} = mountGraph();
        const board = graph.liveBoard();
        const owned = graph.ownedObjectCount();
        const base = board.objectsList.length - owned;
        expect(graph.ownedListenerCount()).toBe(3);
        expect(dragListeners(graph.handles().get('p')!)).toBe(1);
        act(() => { graph.setState({c1: {x: 1, y: 1, r: 4}, p: {x: 9, y: 9}}); });
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(board.objectsList.length).toBe(base + owned);
        const oldHandle = graph.handles().get('p')!;

        chooseMode('radical');
        expect(graph.ownedListenerCount()).toBe(7);
        expect(dragListeners(oldHandle)).toBe(0);
        expect(board.objectsList.length).toBe(base + graph.ownedObjectCount());
        chooseMode('tangents');
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(board.objectsList.length).toBe(base + owned);

        const handle = graph.handles().get('p')!;
        graph.disposeNow();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
        expect(dragListeners(handle)).toBe(0);
        expect(board.objectsList.length).toBe(base);

        view.unmount();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
    });

    test('unmount releases the objects, the listeners and the board label of a live scene', () => {
        const {graph, view} = mountGraph();
        const handle = graph.handles().get('c1')!;
        expect(graph.ownedObjectCount()).toBeGreaterThan(0);
        expect(document.querySelector(`[aria-label="${t('circle_construction_board_label')}"]`)).not.toBeNull();
        view.unmount();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
        expect(dragListeners(handle)).toBe(0);
    });

    test('StrictMode mount registers its listeners once and unmount releases the owned objects', () => {
        const strict = mountGraph(true);
        expect(strict.graph.ownedListenerCount()).toBe(3);
        strict.view.unmount();
        expect(strict.graph.ownedObjectCount()).toBe(0);
    });
});

const shownCaptions = (graph: ObservedGraph) =>
    probes(graph).filter(o => o.elType === 'text' && o.evalVisProp('visible')).map(o => (o as unknown as {plaintext: string}).plaintext);

describe('review repairs', () => {
    test('every numeric field of every mode is reachable by its name: a point row, a radius or ratio slider with its exact field', () => {
        mountGraph();
        for (const mode of ['tangents', 'radical', 'apollonius', 'common'] as const) {
            chooseMode(mode);
            const circles = (n: number) => [centreX(n), centreY(n), radiusLabel(n)];
            const points = (name: string) => [pointX(name), pointY(name)];
            const labels = {
                tangents: [...circles(1), ...points('P')],
                radical: [...circles(1), ...circles(2), ...circles(3), ...points('P')],
                apollonius: [...points('A'), ...points('B'), ...points('P'), ratioLabel()],
                common: [...circles(1), ...circles(2)],
            }[mode];
            for (const label of labels) expect(field(label).getAttribute('type'), label).toBe('text');
        }
    });

    test('the points shown together are rows of one list: A, B and P in apollonius mode', () => {
        mountGraph();
        chooseMode('apollonius');
        const list = field(pointX('A')).closest('fieldset.point-list');
        expect(list).not.toBeNull();
        for (const name of ['A', 'B', 'P']) expect(list!.contains(field(pointX(name)))).toBe(true);
    });

    test('the board names the circles, the contact points and the two division points', () => {
        const {graph} = mountGraph();
        expect(shownCaptions(graph)).toEqual(expect.arrayContaining(['1', 'P', 'T1', 'T2']));
        chooseMode('radical');
        expect(shownCaptions(graph)).toEqual(expect.arrayContaining(['1', '2', '3']));
        chooseMode('common');
        expect(shownCaptions(graph)).toEqual(expect.arrayContaining(['1', '2']));
        chooseMode('apollonius');
        expect(shownCaptions(graph)).toEqual(expect.arrayContaining(['N', 'Z']));
        expect(readout('internal')).toBeDefined();
        expect(document.querySelector('[data-readout="internal"] dt')!.textContent).toMatch(/ N$/);
        expect(document.querySelector('[data-readout="external"] dt')!.textContent).toMatch(/ Z$/);
        act(() => { setLanguage('en'); });
        expect(shownCaptions(graph)).toEqual(expect.arrayContaining(['I', 'E', 'PA : PB = 2']));
    });

    test('a typed ratio goes through the model snapping: NaN is refused, an out-of-range value clamps', () => {
        const {graph} = mountGraph();
        chooseMode('apollonius');
        expect(graph.editRatio(Number.NaN)).toBe(false);
        expect(graph.state.k).toBe(2);
        expect(graph.editRatio(9)).toBe(true);
        expect(graph.state.k).toBe(4);
        expect(graph.editRatio(1.3)).toBe(true);
        expect(graph.state.k).toBe(1.5);
    });
});

test('the status, the labels and the board name follow a language switch', () => {
    mountGraph();
    act(() => { setLanguage('en'); });
    expect(statusText()).toBe('P is outside the circle (power 144): two tangents, each of length 12.');
    expect(screen.getByLabelText('Circle 1: radius')).toBeInTheDocument();
    expect(document.querySelector('[data-readout-live]')!.textContent).toContain('two tangents');
    expect(readout('contact-1')).toBe('(1.9231, −4.6154)');
    expect(document.querySelector(`[aria-label="${t('circle_construction_board_label')}"]`)).not.toBeNull();
});

describe('the legend also states the chord of contact and the Apollonius locus, and the marker faces are drawn in their colour', () => {
    const drawn = (graph: ObservedGraph, elType: string, color: string, dashed: boolean) => probes(graph).filter(o => o.elType === elType
        && o.evalVisProp('visible') && String(o.evalVisProp('strokecolor')) === color && (Number(o.evalVisProp('dash')) > 0) === dashed).length;
    const ids = (graph: ObservedGraph) => graph.legendItems().map(i => i.id);

    test('the chord entry is shown exactly while the chord is drawn (P outside the circle)', () => {
        const {graph} = mountGraph();
        const chord = graph.legendItems().find(i => i.id === 'chord')!;
        expect(chord.kind).toBe('dashed-line');
        expect(drawn(graph, 'segment', chord.color, true)).toBe(1);
        act(() => { graph.setState({p: {x: 3, y: 0}}); }); // on the circle: no chord
        expect(ids(graph)).not.toContain('chord');
        expect(drawn(graph, 'segment', chord.color, true)).toBe(0);
        act(() => { graph.setState({p: {x: 0, y: 0}}); }); // inside
        expect(ids(graph)).not.toContain('chord');
    });

    test('the locus entry follows the locus status and matches the drawn element', () => {
        const {graph} = mountGraph();
        chooseMode('apollonius');
        let items = graph.legendItems();
        expect(items.map(i => [i.id, i.kind, i.label])).toEqual([['locus', 'line', t('circle_construction_legend_locus_circle')]]);
        expect(drawn(graph, 'circle', items[0].color, false)).toBe(1);
        act(() => { graph.setState({k: 1}); });
        items = graph.legendItems();
        expect(items.map(i => [i.id, i.kind, i.label])).toEqual([['locus', 'line', t('circle_construction_legend_locus_line')]]);
        expect(drawn(graph, 'line', items[0].color, false)).toBe(1);
        act(() => { graph.setState({b: graph.state.a}); });
        expect(ids(graph)).toEqual([]);
    });

    test('the pair of circles in the axis entries comes from the pair key', () => {
        const {graph} = mountGraph();
        chooseMode('radical');
        const axis = graph.legendItems().filter(i => i.id.startsWith('axis'));
        expect(axis.map(i => i.label)).toEqual([
            t('circle_construction_legend_axis_solid', {value0: t('circle_construction_pair', {value0: 1, value1: 2})}),
            t('circle_construction_legend_axis_dashed', {value0: t('circle_construction_pair', {value0: 1, value1: 3})}),
            t('circle_construction_legend_axis_dashed', {value0: t('circle_construction_pair', {value0: 2, value1: 3})}),
        ]);
        act(() => { setLanguage('en'); });
        expect(graph.legendItems()[0].label).toBe('Solid line: radical axis of circles 1, 2');
    });

    test('a cross or plus marker is stroked in the colour its legend entry states', () => {
        const {graph} = mountGraph();
        for (const mode of ['radical', 'common'] as const) {
            chooseMode(mode);
            const faced = graph.legendItems().filter(i => i.kind === 'cross' || i.kind === 'plus');
            expect(faced.length).toBeGreaterThan(0);
            for (const item of faced) {
                const found = probes(graph).filter(o => o.elType === 'point' && String(o.evalVisProp('face')) === item.kind
                    && o.evalVisProp('visible') && String(o.evalVisProp('strokecolor')) === item.color);
                expect(found).toHaveLength(1);
            }
        }
    });
});

describe('the legend states the style of the Thales circle, the radical axes and the common tangents', () => {
    const lines = (graph: ObservedGraph) => probes(graph).filter(o => o.elType === 'line' && o.evalVisProp('visible'));
    test('every entry matches a drawn element of that colour and dash', () => {
        const {graph} = mountGraph();
        const drawn = (elType: string, color: string, dashed: boolean) => probes(graph).filter(o => o.elType === elType && o.evalVisProp('visible')
            && String(o.evalVisProp('strokecolor')) === color && (Number(o.evalVisProp('dash')) > 0) === dashed).length;
        expect(graph.legendItems().map(i => [i.id, i.kind])).toEqual([['thales', 'dashed-line'], ['chord', 'dashed-line']]);
        expect(drawn('circle', graph.legendItems()[0].color, true)).toBe(1);
        expect(drawn('segment', graph.legendItems()[1].color, true)).toBe(1);
        chooseMode('radical');
        const items = graph.legendItems();
        expect(items.filter(i => i.id.startsWith('axis')).map(i => i.kind)).toEqual(['line', 'dashed-line', 'dashed-line']);
        for (const item of items.filter(i => i.id.startsWith('axis'))) expect(drawn('line', item.color, item.kind === 'dashed-line')).toBe(1);
        expect(drawn('circle', items.find(i => i.id === 'orthogonal')!.color, true)).toBe(1);
        expect(lines(graph)).toHaveLength(3);
        chooseMode('common');
        for (const item of graph.legendItems().filter(i => i.id.endsWith('tangents'))) expect(drawn('line', item.color, item.kind === 'dashed-line')).toBe(2);
        expect(document.querySelectorAll('[data-legend]').length).toBe(graph.legendItems().length);
    });
});
