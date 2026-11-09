import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test, vi} from 'vitest';
import {OperationTool, BezierAdapter} from './BezierCurveControls';
import {RationalBezierCurveControls} from './RationalBezierCurveControls';
import {JXGRationalBezierCurve} from '../../curves/object/JXGRationalBezierCurve';

const elevateCurve = () => ({board: {update: vi.fn()}, elevate: vi.fn()}) as unknown as BezierAdapter;

test('a press on an unavailable Apply shows its reason as visible text in a polite region that is empty until then', () => {
    const onChanged = vi.fn();
    render(<OperationTool curve={elevateCurve()} tool="elevation" onChanged={onChanged} previews={null} applyReason="Najvišja stopnja je dosežena."/>);
    const region = document.querySelector('[role="status"][aria-live="polite"]')!;
    expect(region.textContent).toBe('');
    fireEvent.click(screen.getByRole('button', {name: /.+/}));
    expect(region).toHaveTextContent('Najvišja stopnja je dosežena.');
    expect(onChanged).not.toHaveBeenCalled();
});

test('a press on an available Apply applies and leaves the region empty', () => {
    const curve = elevateCurve();
    render(<OperationTool curve={curve} tool="elevation" onChanged={vi.fn()} previews={null}/>);
    fireEvent.click(screen.getByRole('button', {name: /.+/}));
    expect((curve as unknown as {elevate: () => void}).elevate).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[role="status"]')!.textContent).toBe('');
});

test('Reset weight at weight 1 shows its reason on a press; a weight that is 1 up to rounding error is unavailable too', () => {
    const curve = {board: {update: vi.fn()}, getWeightNumber: () => 0, getCurrentWeight: () => 1 + 1e-12, inStandardForm: () => false, resetWeight: vi.fn()};
    render(<RationalBezierCurveControls curve={curve as unknown as JXGRationalBezierCurve} curveNumber={1} onChanged={vi.fn()}/>);
    const button = screen.getByRole('button', {name: 'Ponastavi utež'});
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(document.querySelector('[data-reset-weight-reason]')).toBeNull();
    fireEvent.click(button);
    expect(document.querySelector('[data-reset-weight-reason]')).toHaveTextContent('Ta utež je že 1.');
    expect(curve.resetWeight).not.toHaveBeenCalled();
});

test('the shared Apply class has the coarse-pointer 44px rule (layout is not measurable in jsdom, so the CSS source is read)', () => {
    const css = readFileSync(join(__dirname, 'BezierCurveControls.css'), 'utf8');
    expect(css).toMatch(/@media \(pointer: coarse\), \(max-width: 700px\)\s*\{\s*\.operation-apply \{ min-height: 44px; \}/);
    render(<OperationTool curve={elevateCurve()} tool="elevation" onChanged={vi.fn()} previews={null}/>);
    expect(screen.getByRole('button', {name: /.+/})).toHaveClass('operation-apply');
});
