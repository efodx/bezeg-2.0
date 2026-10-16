import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {t} from '../../localization';
import BezierCurveGraph from '../curves/bezier/BezierCurveGraph';
import {GraphHost} from './GraphHost';
import {appStorage} from '../../storage/appStorage';
import RationalBezierCurveGraph from '../curves/rational/RationalBezierCurveGraph';
import {JXGRationalBezierCurve} from '../curves/object/JXGRationalBezierCurve';
import {CurveDisplayControls, CurveDisplayToggle, displayToggles} from './controls/CurveDisplayControls';
import {selectedCurveControls} from './controls/SelectedCurveControls';

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

class RationalGraph extends RationalBezierCurveGraph {
    selectFirst() { this.selectCurve(this.getFirstJxgCurve()); }
}

function renderSelectedRational() {
    const graph = new RationalGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => graph.selectFirst());
    const curve = graph.getFirstJxgCurve();
    if (!(curve instanceof JXGRationalBezierCurve)) throw new Error('the first curve of the rational graph is not rational');
    return {view, curve};
}

/** The preview point the subdivision toggle creates; undefined until the first preview. */
function subdivisionPointVisible(curve: JXGRationalBezierCurve): boolean | undefined {
    return (curve as unknown as {subdivisionPoint?: {visProp: {visible: boolean}}}).subdivisionPoint?.visProp.visible;
}

test('a selected rational curve names its weight and edits it in an exact field, not a button', () => {
    const {view, curve} = renderSelectedRational();
    const identity = t('rational_weight_identity', {value0: '1', value1: '₀₁₂₃₄₅₆₇₈₉'[curve.getWeightNumber()]});
    expect(view.getByText(identity)).toBeTruthy();
    const field = view.getByRole('spinbutton', {name: t('weight_value')}) as HTMLInputElement;
    expect(field.tagName).toBe('INPUT');

    fireEvent.change(field, {target: {value: '2'}});
    expect(curve.getCurrentWeight()).toBeCloseTo(2);
    expect(curve.getCurve().getWeights()[curve.getWeightNumber()]).toBeCloseTo(2);

    fireEvent.change(view.getByRole('spinbutton', {name: t('weight_value')}), {target: {value: '0'}});
    expect(curve.getCurrentWeight()).toBeCloseTo(2);
    expect(view.getByText(t('weight_must_be_positive'))).toBeTruthy();
    view.unmount();
});

test('reset weight is its own button, and the stepper and navigation change the current weight', () => {
    const {view, curve} = renderSelectedRational();
    const field = () => view.getByRole('spinbutton', {name: t('weight_value')}) as HTMLInputElement;
    fireEvent.change(field(), {target: {value: '3'}});
    fireEvent.click(view.getByRole('button', {name: t('increase_weight')}));
    expect(curve.getCurrentWeight()).toBeCloseTo(3.25);
    fireEvent.click(view.getByRole('button', {name: t('decrease_weight')}));
    expect(curve.getCurrentWeight()).toBeCloseTo(3);

    fireEvent.click(view.getByRole('button', {name: t('reset_weight')}));
    expect(curve.getCurrentWeight()).toBeCloseTo(1);
    expect(Number(field().value.replace(',', '.'))).toBeCloseTo(1);

    const start = curve.getWeightNumber();
    fireEvent.click(view.getByRole('button', {name: t('next_weight')}));
    expect(curve.getWeightNumber()).toBe(start + 1);
    fireEvent.click(view.getByRole('button', {name: t('previous_weight')}));
    expect(curve.getWeightNumber()).toBe(start);
    view.unmount();
});

test('a preview toggle shows and hides its point through aria-pressed and never moves control points', () => {
    const {view, curve} = renderSelectedRational();
    const controlPoints = () => curve.getCurve().getPoints().map(point => [point.X(), point.Y()]);
    const before = controlPoints();
    expect(subdivisionPointVisible(curve)).toBeFalsy();

    fireEvent.click(view.getByRole('button', {name: t('preview_subdivision')}));
    expect(view.getByRole('button', {name: t('preview_subdivision')}).getAttribute('aria-pressed')).toBe('true');
    expect(subdivisionPointVisible(curve)).toBe(true);
    expect(controlPoints()).toEqual(before);

    fireEvent.click(view.getByRole('button', {name: t('preview_subdivision')}));
    expect(view.getByRole('button', {name: t('preview_subdivision')}).getAttribute('aria-pressed')).toBe('false');
    expect(subdivisionPointVisible(curve)).toBe(false);
    expect(controlPoints()).toEqual(before);
    view.unmount();
});

test('the selected panel has no display switches, and the Display tab lists the weights switch of a rational curve', () => {
    const {view, curve} = renderSelectedRational();
    const selected = selectedCurveControls(curve, () => undefined, 1);
    expect(selected.some(element => element.type === CurveDisplayToggle)).toBe(false);
    view.unmount();

    expect(displayToggles(curve)).toContain('weights');
    const display = render(<CurveDisplayControls curve={curve} onChanged={() => undefined}/>);
    expect(display.getByLabelText(t('weights'))).toBeTruthy();
    display.unmount();
});
