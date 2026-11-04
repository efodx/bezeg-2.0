import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {CONIC_VIEW_BOX, ConicFocalGraph} from './ConicFocalGraph';
import {GraphHost} from '../base/GraphHost';
import {renderMessage, setLanguage} from '../../localization';
import {functionPresetCollections} from './functionPresetCollections';
import {CONIC_EXAMPLE_MODELS, conicFocalView} from '../../analysis/conicFocalModel';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => setLanguage('sl'));

interface BoardPoint {
    elType: string;
    name?: string;
    X(): number;
    Y(): number;
    moveTo(to: number[]): void;
    triggerEventHandlers(events: string[], args: unknown[]): void;
}

/** A real graph through the real host and a real JSXGraph board (jsdom). */
class ObservedConicGraph extends ConicFocalGraph {
    modelNow() { return this.model; }
    ownedObjects() { return this.generatedObjectCount; }
    boardObjects() { return this.board.objectsList.length; }
    editEpsilon(value: number) { this.setEpsilon(value); }
    editEll(value: number) { this.setEll(value); }
    editPhi(value: number) { this.setPhi(value); }
    editWeight(value: number | null) { this.setWeight(value); }
    editBridge(value: boolean) { this.setBridge(value); }
    boardP(): BoardPoint {
        return (this.board.objectsList as unknown as BoardPoint[]).find(object => object.elType === 'point' && object.name === '$$P$$') as BoardPoint;
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const statusIds = () => [...document.querySelectorAll('[data-conic-status]')].map(element => element.getAttribute('data-conic-status'));
const chooseExample = (id: string) => act(() => { fireEvent.change(screen.getByLabelText('Primer stožnice'), {target: {value: id}}); });
const num = (id: string) => Number((readout(id) ?? '').replace(',', '.'));

function mountGraph(strict = false) {
    const graph = new ObservedConicGraph();
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    const view = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
    return {graph, view};
}

test('mounts on the ellipse with the spec numbers: |PF| 5, |Pd| 6.25, ratio 0.8, sum 10, bridge off', () => {
    const {graph} = mountGraph();
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(graph.modelNow()).toEqual(CONIC_EXAMPLE_MODELS.ellipse);
    expect(readout('kind')).toBe('elipsa');
    expect(num('pf')).toBeCloseTo(5, 3);
    expect(num('pd')).toBeCloseTo(6.25, 3);
    expect(num('ratio')).toBeCloseTo(0.8, 3);
    expect(num('sum')).toBeCloseTo(10, 3);
    expect(readout('weight')).toBeUndefined();
    expect(statusIds()).toEqual(['ellipse']);
    const p = graph.boardP();
    expect(p.X()).toBeCloseTo(0, 6);
    expect(p.Y()).toBeCloseTo(3, 6);
});

test('the parabola and hyperbola examples show the spec numbers; the ratio equals the eccentricity', () => {
    mountGraph();
    chooseExample('parabola');
    expect(readout('kind')).toBe('parabola');
    expect(num('pf')).toBeCloseTo(2, 3);
    expect(num('pd')).toBeCloseTo(2, 3);
    expect(readout('ratio')).toBe('1');
    chooseExample('hyperbola');
    expect(readout('kind')).toBe('hiperbola');
    expect(num('pf')).toBeCloseTo(7, 3);
    expect(num('pd')).toBeCloseTo(4.2, 3);
    expect(num('pf2')).toBeCloseTo(13, 3);
    expect(num('difference')).toBeCloseTo(6, 3);
    expect(num('ratio')).toBeCloseTo(5 / 3, 3);
});

test('dragging P and the numeric angle keep the ratio equal to the eccentricity', () => {
    const {graph} = mountGraph();
    const e = 0.8;
    for (const target of [[2, 2.5], [-3, -2], [8, 0.5], [0, -4]]) {
        act(() => {
            const p = graph.boardP();
            p.moveTo(target);
            p.triggerEventHandlers(['drag'], []);
        });
        expect(num('ratio')).toBeCloseTo(e, 3);
        const p = graph.boardP();
        // Directrix of the default ellipse: x = 6.25.
        expect(Math.hypot(p.X() - 4, p.Y())).toBeCloseTo(e * (6.25 - p.X()), 6);
    }
    for (const phi of [-2.5, -1, 0.3, 1.9, 3]) {
        act(() => { graph.editPhi(phi); });
        expect(num('ratio')).toBeCloseTo(e, 3);
    }
    expect(() => graph.editPhi(4)).toThrow();
    expect(() => graph.editPhi(Number.NaN)).toThrow();
});

test('the epsilon slider steps land on exactly 1 and exactly 0, with the kind and the circle readout', () => {
    const {graph} = mountGraph();
    const slider = () => screen.getByLabelText('Numerična ekscentričnost ε');
    for (let i = 0; i <= 50; i++) {
        act(() => { fireEvent.change(slider(), {target: {value: String(i * 0.05)}}); });
        if (i === 20) {
            expect(graph.modelNow().epsilon).toBe(1);
            expect(readout('kind')).toBe('parabola');
        }
    }
    act(() => { fireEvent.change(slider(), {target: {value: '0'}}); });
    expect(graph.modelNow().epsilon).toBe(0);
    expect(readout('kind')).toBe('krožnica');
    expect(readout('ratio')).toBe('nedoločeno (krožnica nima vodnice)');
    expect(readout('pd')).toBe('ni');
    expect(statusIds()).toEqual(['circle']);
    expect(() => graph.editEpsilon(2.6)).toThrow();
    expect(() => graph.editEpsilon(-0.1)).toThrow();
    expect(graph.modelNow().epsilon).toBe(0);
});

test('the default view leaves at least 30 percent of its height above P, the second focus and the bridge arc for the caption', () => {
    const [, top, , bottom] = CONIC_VIEW_BOX;
    for (const model of Object.values(CONIC_EXAMPLE_MODELS)) {
        const view = conicFocalView(model);
        const ys = [view.p.y, view.secondFocus?.y ?? 0, ...(view.bridge?.points.map(point => point.y) ?? [])];
        expect((top - Math.max(...ys)) / (top - bottom)).toBeGreaterThanOrEqual(0.3);
    }
});

test('the circle example has no directrix, no sum and no second focus readout', () => {
    mountGraph();
    chooseExample('circle');
    expect(readout('ratio')).toContain('nedoločeno');
    expect(readout('pf2')).toBeUndefined();
    expect(readout('sum')).toBeUndefined();
    expect(num('pf')).toBeCloseTo(3, 6);
});

test('the bridge is off by default; a moved weight departs from the matched one, the deviation grows, and the reset restores it', () => {
    const {graph} = mountGraph();
    expect(graph.modelNow().bridge).toBe(false);
    act(() => { fireEvent.click(screen.getByLabelText('Pokaži Bézierjev lok')); });
    expect(graph.modelNow().bridge).toBe(true);
    expect(num('weight')).toBeCloseTo(Math.SQRT1_2, 3);
    expect(readout('weight-kind')).toBe('elipsa');
    expect(num('deviation')).toBeLessThan(1e-9);
    act(() => { graph.editWeight(1); });
    expect(readout('weight-kind')).toBe('parabola');
    expect(num('weight')).toBe(1);
    expect(num('matched-weight')).toBeCloseTo(Math.SQRT1_2, 3);
    expect(num('deviation')).toBeGreaterThan(0.01);
    act(() => { graph.editWeight(1.6); });
    expect(readout('weight-kind')).toBe('hiperbola');
    expect(() => graph.editWeight(0)).toThrow();
    expect(() => graph.editWeight(6)).toThrow();
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Prilegajoča se utež'})); });
    expect(graph.modelNow().weight).toBeNull();
    expect(num('weight')).toBeCloseTo(Math.SQRT1_2, 3);
    expect(num('deviation')).toBeLessThan(1e-9);
    chooseExample('parabola');
    act(() => { graph.editBridge(true); });
    expect(readout('weight')).toBe('1');
    expect(readout('weight-kind')).toBe('parabola');
});

test('the bridge example turns the bridge on; an out-of-range edit leaves the model unchanged', () => {
    const {graph} = mountGraph();
    chooseExample('bridge');
    expect(graph.modelNow().bridge).toBe(true);
    const before = graph.modelNow();
    expect(() => graph.editEll(0.1)).toThrow();
    expect(graph.modelNow()).toBe(before);
});

test('disposal: unmount clears the owned objects, also under StrictMode and after example switches', () => {
    const {graph, view} = mountGraph(true);
    expect(graph.state.initialized).toBe(true);
    const baseline = graph.boardObjects();
    // Every object beyond the board's own 14 (axes, ticks, labels) is owned by the graph; an unowned object would leak.
    expect(graph.boardObjects() - graph.ownedObjects()).toBe(14);
    chooseExample('hyperbola');
    chooseExample('circle');
    act(() => { graph.editBridge(true); });
    expect(graph.boardObjects()).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});

test('timing of one epsilon update (resample and redraw), reported only', () => {
    const {graph} = mountGraph();
    const times: number[] = [];
    for (let i = 0; i < 40; i++) {
        const start = performance.now();
        act(() => { graph.editEpsilon(0.1 + (i % 20) * 0.1); });
        times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    console.info(`conic epsilon update median ${times[20].toFixed(1)} ms, p95 ${times[37].toFixed(1)} ms (jsdom)`);
    expect(times[20]).toBeLessThan(2000);
});

describe('Preset collection', () => {
    const collection = functionPresetCollections['conic-focal'];
    const valid = CONIC_EXAMPLE_MODELS.ellipse;
    const reasons = (data: unknown) => {
        const check = collection.check(data);
        return 'rejection' in check ? renderMessage(check.rejection) : 'ok';
    };

    test('accepts every example; rejects bad fields with the field named and an actionable fix', () => {
        for (const model of Object.values(CONIC_EXAMPLE_MODELS)) expect(reasons(model)).toBe('ok');
        expect(reasons({...valid, epsilon: 3})).toContain('polje epsilon');
        expect(reasons({...valid, epsilon: Number.NaN})).toContain('popravi vrednost v datoteki');
        expect(reasons({...valid, ell: 0})).toContain('polje ell');
        expect(reasons({...valid, weight: 9})).toContain('polje weight');
        expect(reasons({...valid, phi: 7})).toContain('polje phi');
        expect(reasons({...valid, direction: 2})).toContain('polje direction');
        expect(reasons({...valid, bridge: 'yes'})).toContain('polje bridge');
        expect(reasons('nonsense')).toContain('objekt s polji');
        expect(reasons(null)).toContain('objekt s polji');
    });

    test('the English messages name the same fields', () => {
        act(() => { setLanguage('en'); });
        expect(reasons({...valid, epsilon: 3})).toContain('epsilon');
        expect(reasons({...valid, epsilon: 3})).not.toContain('polje');
        expect(reasons(null)).toContain('focusX');
        act(() => { setLanguage('sl'); });
    });

    test('an import into the mounted graph shows the model; an invalid file is rejected by the collection before it reaches the graph', () => {
        const {graph} = mountGraph();
        const hyperbola = collection.check({...CONIC_EXAMPLE_MODELS.hyperbola});
        expect('rejection' in hyperbola).toBe(false);
        act(() => { graph.importPresetData({...CONIC_EXAMPLE_MODELS.hyperbola}); });
        expect(readout('kind')).toBe('hiperbola');
        expect('rejection' in collection.check({...valid, epsilon: 9})).toBe(true);
        expect(readout('kind')).toBe('hiperbola');
    });
});
