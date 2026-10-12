import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {t} from '../../localization';
import BezierCurveGraph from '../curves/bezier/BezierCurveGraph';
import {GraphHost} from './GraphHost';
import {appStorage} from '../../storage/appStorage';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
    appStorage.clear();
});

test('the selected curve tools have distinct labels and their sliders follow a real change event', () => {
    class Graph extends BezierCurveGraph {
        selectFirst() { this.selectCurve(this.getFirstJxgCurve()); }
    }
    const graph = new Graph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => graph.selectFirst());

    for (const key of ['subdivision_parameter_t', 'extrapolation_parameter_t', 'end_parameter_of_the_shortened_curve_t', 'construction_parameter_t'] as const) {
        expect(view.getAllByLabelText(t(key))).toHaveLength(1);
    }
    fireEvent.change(view.getByLabelText(t('subdivision_parameter_t')), {target: {value: '0.3'}});
    expect(graph.getFirstJxgCurve().getSubdivisionT()).toBeCloseTo(0.3);
    expect(Number((view.getByLabelText(t('subdivision_parameter_t')) as HTMLInputElement).value)).toBeCloseTo(0.3);
    view.unmount();
});
