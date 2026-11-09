import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {expect, test, vi} from 'vitest';
import {RationalBezierCurveControls} from './RationalBezierCurveControls';
import {JXGRationalBezierCurve} from '../../curves/object/JXGRationalBezierCurve';

function stubCurve() {
    const curve = {
        board: {update: vi.fn()}, weight: 1,
        getWeightNumber: () => 2, getCurrentWeight: () => curve.weight, inStandardForm: () => false,
        changeWeight: vi.fn((delta: number) => { curve.weight += delta; }),
        setWeight: vi.fn((value: number) => { curve.weight = value; }),
        prevWeight: vi.fn(), nextWeight: vi.fn(), resetWeight: vi.fn(), setStandardForm: vi.fn(),
    };
    return curve;
}

test('the weight is one shared stepper: plus and minus change it by a quarter, a typed weight sets it, and w <= 0 is refused with its reason', () => {
    const curve = stubCurve();
    const onChanged = vi.fn();
    render(<RationalBezierCurveControls curve={curve as unknown as JXGRationalBezierCurve} curveNumber={1} onChanged={onChanged}/>);
    fireEvent.click(screen.getByRole('button', {name: 'Povečaj utež'}));
    expect(curve.changeWeight).toHaveBeenLastCalledWith(0.25);
    fireEvent.click(screen.getByRole('button', {name: 'Zmanjšaj utež'}));
    expect(curve.changeWeight).toHaveBeenLastCalledWith(-0.25);
    const field = screen.getByRole('spinbutton') as HTMLInputElement;
    fireEvent.input(field, {target: {value: '2,5'}, inputType: 'insertText'});
    fireEvent.keyDown(field, {key: 'Enter'});
    expect(curve.setWeight).toHaveBeenLastCalledWith(2.5);
    fireEvent.input(field, {target: {value: '0'}, inputType: 'insertText'});
    fireEvent.keyDown(field, {key: 'Enter'});
    expect(curve.setWeight).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.number-input-hint')).toHaveTextContent('Utež mora biti pozitivna.');
    expect(onChanged).toHaveBeenCalledTimes(3);
});
