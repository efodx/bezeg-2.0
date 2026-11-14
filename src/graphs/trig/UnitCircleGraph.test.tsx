import React from 'react';
import {vi} from 'vitest';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {expectHandleHitZones} from '../base/handleHitZoneBehaviour';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {pointOnCircle} from '../../trig/unitCircle';
import {angleFromHalfDegrees} from '../../trig/angle';
import {deriveUnitCircle} from '../../trig/trigModel';
import {
    exactPlain, HANDLE_TOUCH_RADIUS, HIT_SLACK, TRACE_ORIGIN_X, traceX, UnitCircleGraph, unrolledTrace,
} from './UnitCircleGraph';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** Exposes the board and the protected disposal the scene replacement calls. */
class ObservedUnitCircleGraph extends UnitCircleGraph {
    liveBoard() { return this.board; }
    disposeNow() { this.disposeFigureScene(); }
}

function mountGraph(strict = false) {
    const graph = new ObservedUnitCircleGraph();
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    const view = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
    return {graph, view};
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
/** The angle slider's exact field is named "<label>, vrednost"; the multiple-of-pi entry is found by its own label. */
const field = (label: string) => (screen.queryByRole('spinbutton', {name: `${label}, vrednost`}) ?? screen.getByLabelText(label)) as HTMLInputElement;
const handleOf = (graph: ObservedUnitCircleGraph) => graph.handles().angle!;
const curves = (graph: ObservedUnitCircleGraph) => graph.liveBoard().objectsList.filter((o): o is JXG.Curve => o instanceof JXG.Curve && o.elType === 'curve');
type EventedPoint = JXG.Point & {eventHandlers: Record<string, unknown[]>; triggerEventHandlers(names: string[], args: unknown[]): void};
const dragListeners = (point: JXG.Point) => (point as EventedPoint).eventHandlers.drag?.length ?? 0;

/** Simulates JSXGraph's drag: the user moves the handle (anywhere), then the board fires its drag event. */
function dragHandleTo(point: JXG.Point, x: number, y: number) {
    point.setPosition(JXG.COORDS_BY_USER, [x, y]);
    act(() => { (point as EventedPoint).triggerEventHandlers(['drag'], []); });
}

test('mounts the unit circle at 60 degrees with exact special values, the quadrant, signs and a text status', () => {
    const {graph} = mountGraph();
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjectCount()).toBeGreaterThan(10);
    expect(readout('angle')).toBe('60°, π/3 rad');
    expect(readout('cos')).toBe('1/2 ≈ 0,5');
    expect(readout('sin')).toBe('√3/2 ≈ 0,8660254');
    expect(readout('position')).toBe('v prvem kvadrantu');
    expect(readout('signs')).toBe('cos θ > 0, sin θ > 0');
    expect(document.querySelector('[data-unit-circle-status]')!.textContent)
        .toBe('Točka pri kotu 60° (π/3 rad): cos θ = 1/2 ≈ 0,5, sin θ = √3/2 ≈ 0,8660254, v prvem kvadrantu.');
    expect(document.querySelector('[data-readout-live]')!.textContent).toContain('Točka pri kotu 60°');
});

test('a typed angle in degrees or in multiples of pi snaps to half-degrees and is refused outside the stored range', () => {
    const {graph} = mountGraph();
    act(() => { enterNumber(field('Kot θ (°)'), '200'); });
    expect(graph.state.angle).toBe(400);
    const expected = pointOnCircle(angleFromHalfDegrees(400));
    expect(handleOf(graph).X()).toBe(expected[0]);
    expect(handleOf(graph).Y()).toBe(expected[1]);
    expect(readout('cos')).toBe('≈ −0,9396926');
    expect(readout('position')).toBe('v tretjem kvadrantu');
    expect(readout('signs')).toBe('cos θ < 0, sin θ < 0');
    expect(document.querySelector('[data-unit-circle-note]')).toBeNull();

    act(() => { enterNumber(field('Kot θ (°)'), '135,3'); });
    expect(graph.state.angle).toBe(271);
    // the slider's exact field has no grid, so the model's note says that 135,5 was used
    expect(document.querySelector('[data-unit-circle-note]')!.textContent).toContain('135,5');

    act(() => { enterNumber(field('Kot θ (večkratnik števila π)'), '0,75'); });
    expect(graph.state.angle).toBe(270);
    expect(document.querySelector('[data-unit-circle-note]')).toBeNull();
    act(() => { enterNumber(field('Kot θ (večkratnik števila π)'), '1,75'); });
    expect(graph.state.angle).toBe(630);
    act(() => { enterNumber(field('Kot θ (°)'), '180'); });
    expect(graph.state.angle).toBe(360);
});

describe('range of the typed angles', () => {
    test.each([['Kot θ (°)', '400', 80], ['Kot θ (°)', '360', 0], ['Kot θ (°)', '-30', 660]])('%s: %s wraps around the circle, as the angle slider does', (label, typed, angle) => {
        const {graph} = mountGraph();
        act(() => { enterNumber(field(label), typed); });
        expect(graph.state.angle).toBe(angle);
    });

    test.each([['Kot θ (večkratnik števila π)', '2'], ['Kot θ (večkratnik števila π)', '-0,25']])(
        '%s: %s is refused with the range hint, not wrapped', (label, typed) => {
            const {graph} = mountGraph();
            act(() => { enterNumber(field(label), typed); });
            expect(graph.state.angle).toBe(120);
            expect(document.body.textContent).toMatch(/med/);
            expect(document.querySelector('[data-unit-circle-note]')).toBeNull();
        });

    test('the second angle wraps like the first, and the multiple of pi has a help that says what it means', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({showAddition: true}); });
        act(() => { enterNumber(field('Drugi kot β (°)'), '360'); });
        expect(graph.state.secondAngle).toBe(0);
        act(() => { enterNumber(field('Drugi kot β (°)'), '359,5'); });
        expect(graph.state.secondAngle).toBe(719);
        const help = (label: string) => document.getElementById(field(label).getAttribute('aria-describedby')!.split(' ').find(id => id.endsWith('-help'))!)!.textContent;
        expect(help('Kot θ (večkratnik števila π)')).toContain('večkratnik števila π');
        const slider = screen.getByRole('slider', {name: 'Kot θ (°)'}) as HTMLInputElement;
        expect([slider.min, slider.max, slider.step]).toEqual(['0', '360', '1']);
    });
});

describe('the rounding note', () => {
    const NOTE = '[data-unit-circle-note]';
    // 0,4444 pi is 159,98 half-degrees: stored as 160 (80 degrees) with the note
    const withNote = () => {
        const mounted = mountGraph();
        act(() => { enterNumber(field('Kot θ (večkratnik števila π)'), '0,4444'); });
        expect(mounted.graph.state.angle).toBe(160);
        expect(document.querySelector(NOTE)!.textContent).toContain('80°');
        return mounted;
    };

    test('it appears only for an entry that is not exactly a half-degree multiple', () => {
        const {graph} = mountGraph();
        act(() => { enterNumber(field('Kot θ (°)'), '30'); });
        act(() => { enterNumber(field('Kot θ (večkratnik števila π)'), '0,5'); });
        expect(graph.state.angle).toBe(180);
        expect(document.querySelector(NOTE)).toBeNull();
    });

    test('it states the stored value', () => { withNote(); });

    test.each([
        ['a toggle', (_g: ObservedUnitCircleGraph) => { act(() => { fireEvent.click(screen.getByRole('checkbox', {name: 'Prikaži tudi kosinus'})); }); }],
        ['a lesson action', (g: ObservedUnitCircleGraph) => { act(() => { g.setState({angle: 300}); }); }],
        ['a drag', (g: ObservedUnitCircleGraph) => dragHandleTo(g.handles().angle!, 0, 1)],
        ['the second angle', (g: ObservedUnitCircleGraph) => { act(() => { g.setState({secondAngle: 10}); }); }],
    ])('%s clears it', (_name, change) => {
        const {graph} = withNote();
        change(graph);
        expect(document.querySelector(NOTE)).toBeNull();
    });

    test('Reset clears it', async () => {
        const {graph} = withNote();
        let pending: Promise<void> = Promise.resolve();
        act(() => { pending = graph.reset(); });
        await act(async () => { await pending; });
        expect(graph.state.angle).toBe(120);
        expect(document.querySelector(NOTE)).toBeNull();
    });
});

describe('the legend of the symmetric points and the second radius', () => {
    const legend = (graph: ObservedUnitCircleGraph) => graph.legendItems().map(item => [item.id, item.kind, item.label]);
    const points = (graph: ObservedUnitCircleGraph) => graph.liveBoard().objectsList.filter((o): o is JXG.Point => o instanceof JXG.Point);

    test('nothing is listed while the symmetric points and the second angle are off', () => {
        const {graph} = mountGraph();
        expect(legend(graph)).toEqual([]);
        expect(document.querySelector('[data-legend]')).toBeNull();
    });

    test('each entry states the face the marker is drawn with, in its colour', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({showSymmetries: true, showAddition: true}); });
        expect(legend(graph)).toEqual([
            ['symmetry-x', 'cross', 'Križec: zrcalna slika čez os x'],
            ['symmetry-y', 'plus', 'Plus: zrcalna slika čez os y'],
            ['symmetry-origin', 'diamond', 'Romb: zrcalna slika čez izhodišče'],
            ['second-radius', 'dashed-line', 'Črtkana črta: drugi polmer do kota β'],
        ]);
        expect(document.querySelectorAll('[data-legend]')).toHaveLength(4);
        for (const item of graph.legendItems().slice(0, 3)) {
            // A cross or plus face is drawn by its stroke alone, so the stroke must carry the stated colour.
            const colour = item.kind === 'cross' || item.kind === 'plus' ? 'strokecolor' : 'fillcolor';
            const drawn = points(graph).filter(p => String(vp(p, 'face')) === item.kind && String(vp(p, colour)) === item.color);
            expect(drawn).toHaveLength(1);
        }
        // the second radius is the dashed segment in the comparison colour
        const segments = graph.liveBoard().objectsList.filter(o => (o as {elType: string}).elType === 'segment');
        expect(segments.some(o => Number(vp(o, 'dash')) > 0 && String(vp(o, 'strokecolor')) === graph.legendItems()[3].color)).toBe(true);
    });
});

test.each([
    ['0', '0°, 0 rad', '1', '0', 'cos θ > 0, sin θ = 0'],
    ['90', '90°, π/2 rad', '0', '1', 'cos θ = 0, sin θ > 0'],
    ['270', '270°, 3π/2 rad', '0', '−1', 'cos θ = 0, sin θ < 0'],
    ['180', '180°, π rad', '−1', '0', 'cos θ < 0, sin θ = 0'],
])('on the axis at %s degrees the readout gives the position, the exact values and the signs with zero', (typed, angle, cos, sin, signs) => {
    const {graph} = mountGraph();
    act(() => { enterNumber(field('Kot θ (°)'), typed); });
    expect(readout('angle')).toBe(angle);
    expect(readout('position')).toBe('na osi');
    expect(readout('signs')).toBe(signs);
    expect(readout('cos')).toBe(cos);
    expect(readout('sin')).toBe(sin);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|-0/);
    expect(graph.state.angle).toBe((Number(typed) * 2) % 720);
});

test('the angle shows as a reduced multiple of pi on the half-degree grid', () => {
    mountGraph();
    act(() => { enterNumber(field('Kot θ (°)'), '315'); });
    expect(readout('angle')).toBe('315°, 7π/4 rad');
    act(() => { enterNumber(field('Kot θ (°)'), '120'); });
    expect(readout('angle')).toBe('120°, 2π/3 rad');
    act(() => { enterNumber(field('Kot θ (°)'), '30'); });
    expect(readout('angle')).toBe('30°, π/6 rad');
    act(() => { enterNumber(field('Kot θ (°)'), '0,5'); });
    expect(readout('angle')).toBe('0,5°, π/360 rad');
});

test('the traces carry on-graph names, the cosine name only while the cosine is shown', () => {
    const {graph} = mountGraph();
    const labels = () => graph.liveBoard().objectsList
        .map(o => o as unknown as {elType: string; plaintext: string; evalVisProp(name: string): unknown})
        .filter(o => o.elType === 'text' && o.plaintext.includes('θ')).map(o => `${o.plaintext}:${o.evalVisProp('visible') ? 'on' : 'off'}`);
    expect(labels()).toEqual(['sin θ:on', 'cos θ:off']);
    act(() => { graph.setState({showCosine: true}); });
    expect(labels()).toEqual(['sin θ:on', 'cos θ:on']);
});

test('keyboard steps are one degree for an arrow and ten degrees for Shift with an arrow or a Page key (the angle slider)', () => {
    const {graph} = mountGraph();
    const input = field('Kot θ (°)');
    act(() => { fireEvent.keyDown(input, {key: 'ArrowUp'}); });
    expect(graph.state.angle).toBe(122);
    act(() => { fireEvent.keyDown(field('Kot θ (°)'), {key: 'ArrowDown', shiftKey: true}); });
    expect(graph.state.angle).toBe(102);
    act(() => { fireEvent.keyDown(field('Kot θ (°)'), {key: 'PageUp'}); });
    expect(graph.state.angle).toBe(122);
});

test('dragging snaps the handle to the nearest half-degree on the circle and updates state and readout', () => {
    const {graph} = mountGraph();
    const handle = handleOf(graph);
    // 37,3 degrees at radius 1,3: nearest half-degree is 37,5 = 75 half-degrees.
    const theta = (37.3 * Math.PI) / 180;
    dragHandleTo(handle, 1.3 * Math.cos(theta), 1.3 * Math.sin(theta));
    expect(graph.state.angle).toBe(75);
    const snapped = pointOnCircle(angleFromHalfDegrees(75));
    expect(handle.X()).toBe(snapped[0]);
    expect(handle.Y()).toBe(snapped[1]);
    expect(readout('angle')).toMatch(/^37,5°/);
    // below the x-axis wraps into [0, 360)
    dragHandleTo(handle, 1, -1);
    expect(graph.state.angle).toBe(630);
    // dragging a handle does not change the number of board objects
    expect(graph.ownedObjectCount()).toBeGreaterThan(10);
});

test('the unrolled traces are the circle point doubles at all 720 half-degrees, and the point reads the same table', () => {
    const trace = unrolledTrace();
    expect(trace.xs).toHaveLength(721);
    for (let h = 0; h < 720; h++) {
        const point = deriveUnitCircle({angle: h, secondAngle: 0, showSymmetries: false, showCosine: false}).point;
        expect(trace.sin[h]).toBe(point[1]);
        expect(trace.cos[h]).toBe(point[0]);
        expect(trace.xs[h]).toBe(traceX(h));
    }
    expect(trace.xs[0]).toBe(TRACE_ORIGIN_X);
    expect(trace.xs[720]).toBeCloseTo(TRACE_ORIGIN_X + 2 * Math.PI, 12);

    const {graph} = mountGraph();
    const [sinCurve] = curves(graph);
    // the board gets copies: it must not share the module-level table with other boards
    expect(sinCurve.dataX).not.toBe(unrolledTrace().xs);
    expect(sinCurve.dataY).not.toBe(unrolledTrace().sin);
    for (const halfDegrees of [0, 75, 180, 400, 719]) {
        act(() => { graph.setState({angle: halfDegrees}); });
        expect(sinCurve.dataY[halfDegrees]).toBe(handleOf(graph).Y());
    }
});

test('the toggles show the cosine, the three symmetric points and the second angle with its rotated frame', () => {
    const {graph} = mountGraph();
    expect(readout('symmetry-x')).toBeUndefined();
    act(() => { fireEvent.click(screen.getByRole('checkbox', {name: 'Prikaži simetrične točke'})); });
    expect(graph.state.showSymmetries).toBe(true);
    // 60 degrees: reflection in the x-axis is 300 degrees, in the y-axis 120, the half-turn 240 (integer operations)
    expect(readout('symmetry-x')).toBe('(0,5; −0,8660254)');
    expect(readout('symmetry-origin')).toBe('(−0,5; −0,8660254)');
    expect(readout('symmetry-y')).toBe('(−0,5; 0,8660254)');

    act(() => { fireEvent.click(screen.getByRole('checkbox', {name: 'Prikaži tudi kosinus'})); });
    expect(graph.state.showCosine).toBe(true);
    act(() => { fireEvent.click(screen.getByRole('checkbox', {name: 'Drugi kot β in zasukani sistem'})); });
    expect(graph.state.showAddition).toBe(true);
    expect(readout('sum-angle')).toBe('105°');
    // The first angle is θ in the field and in the sum (not α), in both languages.
    const label = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent;
    expect(label('sum-angle')).toBe('Kot θ + β');
    expect(label('sum-point')).toBe('(cos (θ + β); sin (θ + β))');
    act(() => { setLanguage('en'); });
    expect(label('sum-angle')).toBe('Angle θ + β');
    expect(label('sum-point')).toBe('(cos (θ + β), sin (θ + β))');
    act(() => { setLanguage('sl'); });
    expect(field('Drugi kot β (°)').value).toBe('45');
    const second = graph.handles().second!;
    dragHandleTo(second, 0, 2);
    expect(graph.state.secondAngle).toBe(180);
    expect(readout('sum-angle')).toBe('150°');
    expect(readout('sum-point')).toBe('(−0,8660254; 0,5)');
    expect(second.visProp.visible).toBeTruthy();
});

test('mount, state change and unmount: objects and listeners are owned and released, and a rebuild does not duplicate them', () => {
    const {graph, view} = mountGraph();
    expectHandleHitZones(graph.liveBoard(), [handleOf(graph)], HANDLE_TOUCH_RADIUS + HIT_SLACK);
    const board = graph.liveBoard();
    const owned = graph.ownedObjectCount();
    const boardCount = board.objectsList.length;
    expect(graph.ownedListenerCount()).toBe(2);
    expect(dragListeners(handleOf(graph))).toBe(1);
    act(() => { graph.setState({angle: 300, showSymmetries: true, showAddition: true}); });
    expect(graph.ownedObjectCount()).toBe(owned);
    expect(board.objectsList.length).toBe(boardCount);

    // a scene disposal releases everything the graph created, leaving the board's own axes
    const handle = handleOf(graph);
    const ownedByGraph = new Set(board.objectsList.slice(board.objectsList.length - owned));
    graph.disposeNow();
    expect(graph.ownedObjectCount()).toBe(0);
    expect(graph.ownedListenerCount()).toBe(0);
    expect(dragListeners(handle)).toBe(0);
    expect(board.objectsList.some(object => ownedByGraph.has(object))).toBe(false);
    expect(board.objectsList.length).toBe(boardCount - owned);

    view.unmount();
    expect(graph.ownedObjectCount()).toBe(0);
    expect(graph.ownedListenerCount()).toBe(0);
});

test('unmount releases the objects and listeners of a live scene', () => {
    const {graph, view} = mountGraph();
    const handle = handleOf(graph);
    expect(graph.ownedObjectCount()).toBeGreaterThan(0);
    view.unmount();
    expect(graph.ownedObjectCount()).toBe(0);
    expect(graph.ownedListenerCount()).toBe(0);
    expect(dragListeners(handle)).toBe(0);
});

test('StrictMode mount registers its listeners once and unmount releases the owned objects', () => {
    const strict = mountGraph(true);
    expect(strict.graph.ownedListenerCount()).toBe(2);
    strict.view.unmount();
    expect(strict.graph.ownedObjectCount()).toBe(0);
});

test('the status and labels follow a language switch', () => {
    mountGraph();
    act(() => { setLanguage('en'); });
    expect(document.querySelector('[data-unit-circle-status]')!.textContent)
        .toBe('Point at angle 60° (π/3 rad): cos θ = 1/2 ≈ 0.5, sin θ = √3/2 ≈ 0.8660254, in the first quadrant.');
    expect(screen.getByLabelText('Angle θ (multiple of π)')).toBeInTheDocument();
    expect(document.querySelector('[data-readout-live]')!.textContent).toContain('Point at angle 60°');
    act(() => { fireEvent.click(screen.getByRole('checkbox', {name: 'Show the symmetric points'})); });
    expect(readout('symmetry-x')).toBe('(0.5, −0.8660254)');
});

test('exactPlain turns the closed-table LaTeX into plain text', () => {
    expect(exactPlain('\\frac{\\sqrt{3}}{2}')).toBe('√3/2');
    expect(exactPlain('-\\frac{\\sqrt{2}}{2}')).toBe('−√2/2');
    expect(exactPlain('-\\frac{1}{2}')).toBe('−1/2');
    expect(exactPlain('0')).toBe('0');
    expect(exactPlain('-1')).toBe('−1');
});

/** Reads a visual attribute of a board element whose JSXGraph type does not declare `evalVisProp`. */
function vp(element: unknown, name: string): unknown {
    return (element as {evalVisProp(attribute: string): unknown}).evalVisProp(name);
}

test('a scene restore hides the cosine trace in the same tick, with no later board update', () => {
    const {graph} = mountGraph();
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    act(() => { graph.setState({showCosine: true}); });
    const cosineShown = () => curves(graph).filter(c => c.visPropCalc.visible && c.visProp.dash === 2).length;
    expect(cosineShown()).toBe(1);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(graph.state.showCosine).toBe(false);
    expect(cosineShown()).toBe(0);
});

test('a drag or a typed angle change redraws without fullUpdate; a visibility switch still calls it', () => {
    const {graph} = mountGraph();
    const board = graph.liveBoard();
    const fullUpdate = vi.spyOn(board, 'fullUpdate');
    const target = pointOnCircle(angleFromHalfDegrees(100));
    dragHandleTo(handleOf(graph), target[0], target[1]);
    expect(graph.state.angle).toBe(100);
    act(() => { enterNumber(field('Kot θ (°)'), '200'); });
    expect(graph.state.angle).toBe(400);
    expect(fullUpdate).not.toHaveBeenCalled();
    act(() => { graph.setState({showCosine: true}); });
    expect(fullUpdate).toHaveBeenCalledTimes(1);
});
