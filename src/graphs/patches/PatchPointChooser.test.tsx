import {fireEvent, render, screen} from '@testing-library/react';
import React from 'react';
import {expect, test, vi} from 'vitest';
import {PatchPointChooser} from './PatchPointChooser';

const options = (count: number) => Array.from({length: count}, (_, k) => ({value: String(k), text: String(k)}));
const select = (label: string) => screen.getByLabelText<HTMLSelectElement>(label);
const pick = (label: string, value: string) => fireEvent.change(select(label), {target: {value}});

test('Tensor shape: two index axes; a change on one axis keeps the other and gets undefined where nothing is chosen', () => {
    const onChange = vi.fn();
    const {rerender} = render(<PatchPointChooser noneText="None" axes={[{label: 'i', options: options(4)}, {label: 'j', options: options(4)}]} selection={undefined} onChange={onChange}/>);
    expect([...select('i').options].map(o => o.text)).toEqual(['None', '0', '1', '2', '3']);
    pick('i', '2');
    expect(onChange).toHaveBeenLastCalledWith(['2', undefined]);
    rerender(<PatchPointChooser noneText="None" axes={[{label: 'i', options: options(4)}, {label: 'j', options: options(4)}]} selection={['2', '1']} onChange={onChange}/>);
    expect(select('i').value).toBe('2');
    expect(select('j').value).toBe('1');
    pick('j', '3');
    expect(onChange).toHaveBeenLastCalledWith(['2', '3']);
    pick('i', '');
    expect(onChange).toHaveBeenLastCalledWith(undefined);
});

test('Coons shape: a boundary name axis and an index axis with named options', () => {
    const onChange = vi.fn();
    render(<PatchPointChooser noneText="No selection" axes={[{label: 'Boundary', options: [{value: 'c0', text: 'Bottom'}, {value: 'd1', text: 'Right'}]}, {label: 'Index', options: options(4)}]}
                              selection={['d1', '0']} onChange={onChange}/>);
    pick('Boundary', 'c0');
    expect(onChange).toHaveBeenLastCalledWith(['c0', '0']);
});

test('Triangular shape: one axis of ids', () => {
    const onChange = vi.fn();
    render(<PatchPointChooser noneText="None" axes={[{label: 'Point', options: [{value: '2-0-0', text: 'P₂₀₀'}, {value: '1-1-0', text: 'P₁₁₀'}], help: 'Barycentric index'}]}
                              selection={undefined} onChange={onChange}/>);
    expect(screen.getByText('Barycentric index')).toBeTruthy();
    pick('Point', '1-1-0');
    expect(onChange).toHaveBeenLastCalledWith(['1-1-0']);
});

test('Join B-net shape: rows and columns of the second net', () => {
    const onChange = vi.fn();
    render(<PatchPointChooser noneText="None" axes={[{label: 'Row of B', options: options(2)}, {label: 'Column of B', options: options(4)}]} selection={['1', '3']} onChange={onChange}/>);
    pick('Column of B', '');
    expect(onChange).toHaveBeenLastCalledWith(undefined);
    pick('Row of B', '0');
    expect(onChange).toHaveBeenLastCalledWith(['0', '3']);
});
