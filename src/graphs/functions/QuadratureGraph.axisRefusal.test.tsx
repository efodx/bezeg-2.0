import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {QuadratureGraph} from './QuadratureGraph';
import {DomainError} from './BaseFunctionGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {message, setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => { setLanguage('sl'); localStorage.clear(); });

const REFUSED_A = 1.5;

/** The model's own rules never refuse a clamped drag of a bound, so one value stands in for a model that does. */
class StrictQuadratureGraph extends QuadratureGraph {
    protected override setBound(which: 'a' | 'b', value: number, options: {syncScene?: boolean} = {}): void {
        if (which === 'a' && value === REFUSED_A) throw new DomainError(message('quadrature_a_rejected_hint'));
        super.setBound(which, value, options);
    }
    announced() { return this.refusals.announcements; }
    boundA() { return this.model.a; }
    pointAHandle() {
        return this['pointA'] as unknown as {X(): number; Y(): number; moveTo(to: number[]): void; triggerEventHandlers(names: string[], args: unknown[]): void};
    }
    dragA(x: number) {
        const handle = this.pointAHandle();
        act(() => { handle.moveTo([x, 0]); handle.triggerEventHandlers(['drag'], []); });
    }
}

const notices = () => document.querySelectorAll('[data-refusal-notice]');
const noticeText = () => notices()[0]?.textContent;

test('a refused axis-point drag states the reason and keeps the point at the model; an accepted or clamped drag shows nothing', () => {
    const graph = new StrictQuadratureGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(notices()).toHaveLength(1);
    expect(noticeText()).toBe('');
    const before = graph.boundA();

    graph.dragA(REFUSED_A);
    expect(noticeText()).toBe('Meja a mora biti število med −7 in 7 ter manjša od b.');
    expect(graph.boundA()).toBe(before);
    expect(graph.pointAHandle().X()).toBeCloseTo(before, 9);

    const announced = graph.announced();
    graph.dragA(REFUSED_A); // the same refusal on the next frame: still one notice with the same text
    expect(noticeText()).toBe('Meja a mora biti število med −7 in 7 ter manjša od b.');
    expect(notices()).toHaveLength(1);
    expect(graph.announced()).toBe(announced); // repeated drag frames are not announced again

    graph.dragA(-3);
    expect(graph.boundA()).toBe(-3);
    expect(noticeText()).toBe('');

    graph.dragA(-50); // clamped at the lower end of the range: accepted, silent
    expect(graph.boundA()).toBe(-7);
    expect(noticeText()).toBe('');
});

test('restoring a model (Reset, a Preset or a lesson checkpoint) clears a refusal', () => {
    const graph = new StrictQuadratureGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    graph.dragA(REFUSED_A);
    expect(noticeText()).not.toBe('');
    act(() => graph.importPresetData(graph.defaultPreset()));
    expect(noticeText()).toBe('');
});
