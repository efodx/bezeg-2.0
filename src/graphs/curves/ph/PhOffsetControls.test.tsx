import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {t} from '../../../localization';
import BaseCurveGraph from '../../base/BaseCurveGraph';
import {PhOffsetDisplayControls, PhOffsetParameterControls} from '../../base/controls/PhBezierCurveControls';
import CubicPhBezierCurveGraph from './CubicPhBezierCurveGraph';
import UniformParamBezierCurveGraph from '../parametrisations/UniformParamBezierCurveGraph';

function fakePhCurve(initial: {offsets?: boolean, controlPoints?: boolean, lines?: boolean} = {}) {
    const state = {offsets: initial.offsets ?? true, controlPoints: initial.controlPoints ?? false,
        lines: initial.lines ?? false, count: 2, distance: 1.25};
    return {
        state,
        isShowingOffsetCurve: () => state.offsets,
        setShowOffsetCurve: vi.fn((value: boolean) => { state.offsets = value; }),
        isShowingOffsetCurveControlPoints: () => state.controlPoints,
        setShowOffsetCurveControlPoints: vi.fn((value: boolean) => { state.controlPoints = value; }),
        isShowingOffsetCurveControlPointsLines: () => state.lines,
        setShowOffsetCurveControlPointsLines: vi.fn((value: boolean) => { state.lines = value; }),
        getNumberOfOffsetCurves: () => state.count,
        addOffsetCurve: vi.fn(() => { state.count++; }),
        removeOffsetCurve: vi.fn(() => { state.count--; }),
        getCurve: () => ({getOffsetCurveDistance: () => state.distance}),
        setOffsetCurveDistance: vi.fn((value: number) => { state.distance = value; }),
    };
}

describe('PH offset controls', () => {
    test('the count and distance render while offsets are shown', () => {
        const curve = fakePhCurve({offsets: true});
        render(<PhOffsetParameterControls curve={curve as any} onChanged={() => undefined}/>);
        expect(screen.getByRole('group', {name: t('number_of_offsets')})).toBeInTheDocument();
        expect(screen.getByRole('slider', {name: t('offset_distance_d')})).toHaveValue('1.25');
        expect(screen.queryByText(t('offset_parameters_hint'))).toBeNull();
    });

    test('without offsets the parameters are replaced by a hint', () => {
        const curve = fakePhCurve({offsets: false});
        render(<PhOffsetParameterControls curve={curve as any} onChanged={() => undefined}/>);
        expect(screen.getByText(t('offset_parameters_hint'))).toBeInTheDocument();
        expect(screen.queryByRole('slider')).toBeNull();
        expect(screen.queryByRole('group', {name: t('number_of_offsets')})).toBeNull();
    });

    test('the Display toggles remain and show the control-point lines only with control points on', () => {
        const curve = fakePhCurve({offsets: true, controlPoints: false});
        render(<PhOffsetDisplayControls curve={curve as any} onChanged={() => undefined}/>);
        expect(screen.getByRole('checkbox', {name: t('curve_offsets')})).toBeChecked();
        expect(screen.getByRole('checkbox', {name: t('offset_curve_control_points')})).not.toBeChecked();
        expect(screen.getByRole('checkbox', {name: t('lines_through_offset_control_points')})).toBeDisabled();
        expect(screen.queryByRole('slider')).toBeNull();
    });

    test('turning the offsets off cascades to their control points and lines', () => {
        const curve = fakePhCurve({offsets: true, controlPoints: true, lines: true});
        const onChanged = vi.fn();
        render(<PhOffsetDisplayControls curve={curve as any} onChanged={onChanged}/>);
        fireEvent.click(screen.getByRole('checkbox', {name: t('curve_offsets')}));
        expect(curve.setShowOffsetCurve).toHaveBeenCalledWith(false);
        expect(curve.setShowOffsetCurveControlPoints).toHaveBeenCalledWith(false);
        expect(curve.setShowOffsetCurveControlPointsLines).toHaveBeenCalledWith(false);
        expect(onChanged).toHaveBeenCalled();
    });
});

describe('PH graph placement', () => {
    beforeEach(() => {
        vi.spyOn(BaseCurveGraph.prototype as any, 'workspaceEdit').mockReturnValue(null);
        vi.spyOn(BaseCurveGraph.prototype as any, 'workspaceGraphDisplay').mockReturnValue(null);
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    function phGraph(proto: object, state: Record<string, unknown>, curve: ReturnType<typeof fakePhCurve>) {
        const graph = Object.create(proto) as any;
        graph.store.replaceState({initialized: true, showingCurve: true, ...state});
        graph.jxgCurves = [curve];
        graph.getSelectedCurve = () => undefined;
        return graph;
    }

    test('cubic PH: offset count and distance are in Edit, the toggles in Display', () => {
        const curve = fakePhCurve({offsets: true});
        const graph = phGraph(CubicPhBezierCurveGraph.prototype, {}, curve);
        render(<>{graph.workspaceEdit()}</>);
        expect(screen.getByRole('slider', {name: t('offset_distance_d')})).toBeInTheDocument();
        expect(screen.queryByRole('checkbox', {name: t('curve_offsets')})).toBeNull();
    });

    test('cubic PH: the offset toggle stays in Display and the parameters follow it', () => {
        const curve = fakePhCurve({offsets: false});
        const graph = phGraph(CubicPhBezierCurveGraph.prototype, {}, curve);
        render(<>{graph.workspaceGraphDisplay()}</>);
        expect(screen.getByRole('checkbox', {name: t('curve_offsets')})).not.toBeChecked();
        expect(screen.queryByRole('slider')).toBeNull();
    });

    test('uniform parametrization: the parameter group precedes the offset group in Edit', () => {
        const curve = fakePhCurve({offsets: true});
        const graph = phGraph(UniformParamBezierCurveGraph.prototype, {isAlphaParam: true, alpha: 0.5, numberOfPoints: 10}, curve);
        render(<>{graph.workspaceEdit()}</>);
        const parametrization = screen.getByRole('heading', {name: t('parametrization')});
        const offsets = screen.getByRole('heading', {name: t('curve_offsets')});
        expect(parametrization.compareDocumentPosition(offsets) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getByRole('combobox', {name: t('choose_parametrization')})).toBeInTheDocument();
        expect(screen.getByRole('slider', {name: t('parameter_alpha')})).toBeInTheDocument();
        expect(screen.getByRole('group', {name: t('number_of_offsets')})).toBeInTheDocument();
    });
});
