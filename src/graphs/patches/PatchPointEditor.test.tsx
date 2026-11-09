import {fireEvent, render, screen} from '@testing-library/react';
import React from 'react';
import {expect, test, vi} from 'vitest';
import {PatchPointEditor} from './PatchPointEditor';

const field = (axis: string) => screen.getByRole<HTMLInputElement>('spinbutton', {name: `P, ${axis}`});
const type = (axis: string, text: string) => fireEvent.change(field(axis), {target: {value: text}});
const enter = (axis: string) => fireEvent.keyDown(field(axis), {key: 'Enter'});

test('a dragged coordinate shows at most four decimals, with no Apply button', () => {
    render(<PatchPointEditor name="P" xyz={[1, 0.123456789, -2.00000004]} onCommit={() => {}}/>);
    expect([field('x').value, field('y').value, field('z').value]).toEqual(['1', '0,1235', '−2']);
    expect(screen.queryByRole('button')).toBeNull();
});

test('Enter commits one coordinate and the untouched axes keep their exact values', () => {
    const onCommit = vi.fn();
    render(<PatchPointEditor name="P" xyz={[1, 0.123456789, -2.00000004]} onCommit={onCommit}/>);
    type('x', '3');
    expect(onCommit).not.toHaveBeenCalled();
    enter('x');
    expect(onCommit).toHaveBeenCalledWith([3, 0.123456789, -2.00000004]);
});

test('blur commits a typed value as typed', () => {
    const onCommit = vi.fn();
    render(<PatchPointEditor name="P" xyz={[1, 0.123456789, 0]} onCommit={onCommit}/>);
    type('y', '0,12');
    fireEvent.blur(field('y'));
    expect(onCommit).toHaveBeenCalledWith([1, 0.12, 0]);
});

test('leaving a field as shown writes nothing', () => {
    const onCommit = vi.fn();
    render(<PatchPointEditor name="P" xyz={[1, 0.123456789, 0]} onCommit={onCommit}/>);
    fireEvent.focus(field('y'));
    fireEvent.blur(field('y'));
    expect(onCommit).not.toHaveBeenCalled();
});

test('an empty draft is refused in the field hint and commits nothing', () => {
    const onCommit = vi.fn();
    render(<PatchPointEditor name="P" xyz={[1, 2, 3]} onCommit={onCommit}/>);
    type('z', '');
    enter('z');
    expect(onCommit).not.toHaveBeenCalled();
    expect(field('z').getAttribute('aria-invalid')).toBe('true');
});
