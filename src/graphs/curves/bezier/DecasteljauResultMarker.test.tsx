import {act, fireEvent} from '@testing-library/react';
import {setLanguage} from '../../../localization';
import {appStorage} from '../../../storage/appStorage';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, settle} from '../../base/realGraphTestHarness';
import {GraphPalette} from '../../styles/GraphPalette';
import RationalDecasteljauGraph from '../rational/RationalDecasteljauGraph';
import DecasteljauGraph from './DecasteljauGraph';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => {
    act(() => setLanguage('sl'));
    vi.restoreAllMocks();
});

const trace = (graph: DecasteljauGraph) => graph.getFirstJxgCurve().getJxgCurve();
const result = (graph: DecasteljauGraph) => graph.getFirstJxgCurve().getJXGDecasteljauPoints().at(-1)!;

function expectMarkerAt(graph: DecasteljauGraph, t: number) {
    const marker = result(graph);
    const renderedTrace = trace(graph) as JXG.Curve & {points: JXG.Coords[]};
    const board = renderedTrace.board;
    expect(board.objectsList.filter(object => object.elType === 'curve')).toEqual([renderedTrace]);
    expect(board.objectsList.filter(object => JXG.isPoint(object) && object.rendNode?.getAttribute('stroke') === GraphPalette.emphasis)).toEqual([marker]);
    expect(marker.visPropCalc.visible).toBe(true);
    expect(marker.visProp.fixed).toBe(true);
    const [, screenX, screenY] = marker.coords.scrCoords;
    expect(marker.hasPoint(screenX, screenY)).toBe(false);
    expect(marker.rendNode.localName).toBe('path');
    expect(marker.rendNode.getAttribute('fill')).toBe(GraphPalette.boardSurface);
    const point = graph.getFirstCurve().eval(t);
    expect(marker.X()).toBeCloseTo(point.X(), 10);
    expect(marker.Y()).toBeCloseTo(point.Y(), 10);
    const end = renderedTrace.points[renderedTrace.numberPoints - 1].usrCoords;
    expect(end[1]).toBeCloseTo(marker.X(), 10);
    expect(end[2]).toBeCloseTo(marker.Y(), 10);
    return marker;
}

test('the single construction marker follows scrubbing, control-point dragging and playback', () => {
    const graph = new DecasteljauGraph();
    const {view} = mountGraph(graph);
    const slider = () => view.container.querySelector<HTMLInputElement>('.decasteljau-animation-slider input[type="range"]')!;
    const marker = expectMarkerAt(graph, 0.5);
    const curve = graph.getFirstJxgCurve();
    const control = curve.getJxgPoints()[0] as JXG.Point & {triggerEventHandlers(names: string[], args: unknown[]): void};

    fireEvent.change(slider(), {target: {value: '0'}});
    expect(expectMarkerAt(graph, 0)).toBe(marker);
    expect([marker.X(), marker.Y()]).toEqual([control.X(), control.Y()]);
    const layerOrder = marker.rendNode.parentElement!.compareDocumentPosition(control.rendNode.parentElement!);
    expect(layerOrder & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    act(() => {
        control.moveTo([-2, -1], 0);
        control.triggerEventHandlers(['drag'], []);
        trace(graph).board.update();
    });
    expect([expectMarkerAt(graph, 0).X(), marker.Y()]).toEqual([-2, -1]);

    fireEvent.change(slider(), {target: {value: '1'}});
    expect(expectMarkerAt(graph, 1)).toBe(marker);
    act(() => setLanguage('en'));
    expect(view.container.querySelector('.decasteljau-animation-heading output')?.textContent).toBe('t = 1.00');
    expect(expectMarkerAt(graph, 1)).toBe(marker);

    let frame: FrameRequestCallback = () => { throw new Error('Playback did not request a frame'); };
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 1; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    fireEvent.change(slider(), {target: {value: '0.4'}});
    fireEvent.click(view.container.querySelector<HTMLButtonElement>('.decasteljau-animation-actions [data-action="play-pause"]')!);
    act(() => frame(100));
    act(() => frame(116));
    // The board draws between readout updates.
    expect(Number(slider().value)).toBe(0.4);
    expect(curve.getDecasteljauT()).toBeGreaterThan(0.4);
    expect(expectMarkerAt(graph, curve.getDecasteljauT())).toBe(marker);

    fireEvent.click(view.container.querySelector<HTMLButtonElement>('.decasteljau-animation-actions [data-action="reset"]')!);
    expect(Number(slider().value)).toBe(0);
    expect(expectMarkerAt(graph, 0)).toBe(marker);
    view.unmount();
});

test('checkpoint and Preset replacement retain one marker even for coincident and single-point constructions', async () => {
    const graph = new DecasteljauGraph();
    const {view} = mountGraph(graph);
    const slider = () => view.container.querySelector<HTMLInputElement>('.decasteljau-animation-slider input[type="range"]')!;
    const lesson = graph.getLessonCapabilities();
    const initial = expectMarkerAt(graph, 0.5);
    act(() => {
        lesson.apply({kind: 'parameter', name: 't', value: 0.1});
        lesson.apply({kind: 'parameter', name: 't', value: 0.8});
    });
    expect(Number(slider().value)).toBe(0.8);
    expect(expectMarkerAt(graph, 0.8)).toBe(initial);
    act(() => lesson.apply({kind: 'curve-visibility', target: 'decasteljau-scheme', visible: false}));
    expect(initial.visPropCalc.visible).toBe(false);
    act(() => lesson.apply({kind: 'curve-visibility', target: 'decasteljau-scheme', visible: true}));
    expect(expectMarkerAt(graph, 0.8)).toBe(initial);
    const checkpoint = lesson.captureState();
    const saved = graph.exportPreset();
    const [type, dto] = graph.exportPresetData()[0];
    graph.presetService!.savePreset({...saved, id: 'coincident', data: [[type, {...dto, points: [[1, 2], [1, 2]]}]]});
    await settle(() => graph.selectPreset('coincident'));
    expect(Number(slider().value)).toBe(0.8);
    const coincident = expectMarkerAt(graph, 0.8);
    expect([coincident.X(), coincident.Y()]).toEqual([1, 2]);
    expect(trace(graph).board.objectsList).not.toContain(initial);

    graph.presetService!.savePreset({...saved, id: 'single', data: [[type, {...dto, points: [[3, 2]]}]]});
    await settle(() => graph.selectPreset('single'));
    expect([expectMarkerAt(graph, 0.8).X(), result(graph).Y()]).toEqual([3, 2]);
    const curve = graph.getFirstJxgCurve();
    const board = trace(graph).board;
    act(() => {
        board.suspendUpdate();
        curve.addPoint(-2, 0);
        board.unsuspendUpdate();
    });
    expect(expectMarkerAt(graph, 0.8).X()).toBeCloseTo(-1, 10);
    act(() => {
        board.suspendUpdate();
        curve.removePoint(1);
        board.unsuspendUpdate();
    });
    expect(expectMarkerAt(graph, 0.8).X()).toBe(3);

    act(() => lesson.restoreState(checkpoint));
    expect(Number(slider().value)).toBe(0.8);
    expect(expectMarkerAt(graph, 0.8)).not.toBe(coincident);
    await settle(() => graph.selectPreset(''));
    act(() => lesson.apply({kind: 'parameter', name: 't', value: 0.6}));
    await settle(() => graph.reset());
    expect(Number(slider().value)).toBe(0.5);
    expectMarkerAt(graph, 0.5);
    view.unmount();
});

test('the rational demonstration keeps its existing result appearance', () => {
    const graph = new RationalDecasteljauGraph();
    const {view} = mountGraph(graph);
    expect(result(graph).rendNode.localName).toBe('ellipse');
    expect(result(graph).rendNode.getAttribute('fill')).toBe(GraphPalette.constructionAccent);
    view.unmount();
});
