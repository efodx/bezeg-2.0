import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {NumberGrid, type NumberGridCell} from './NumberGrid';

const cells = (onChange: (value: number) => void | boolean = vi.fn()): NumberGridCell[] => [
    {label: 'a: vrstica 1, stolpec 1', value: 1, onChange, min: -4, max: 4, step: 0.25},
    {label: 'b: vrstica 1, stolpec 2', value: 2, onChange, min: -4, max: 4, step: 0.25},
    {label: 'c: vrstica 2, stolpec 1', value: 3, onChange, min: -4, max: 4, step: 0.25},
    {label: 'd: vrstica 2, stolpec 2', value: 4, onChange, min: -4, max: 4, step: 0.25},
];

test('the grid is a group named by its caption and its cells keep their names in row-major order', () => {
    render(<NumberGrid label="Matrika A" columns={2} cells={cells()}/>);
    const group = screen.getByRole('group', {name: 'Matrika A'});
    expect(group).toBeInTheDocument();
    const fields = screen.getAllByRole('spinbutton');
    expect(fields.map(field => field.getAttribute('id') && (field as HTMLInputElement).value)).toEqual(['1', '2', '3', '4']);
    expect(fields.map(field => field.closest('.number-input')!.querySelector('label')!.textContent)).toEqual(
        ['a: vrstica 1, stolpec 1', 'b: vrstica 1, stolpec 2', 'c: vrstica 2, stolpec 1', 'd: vrstica 2, stolpec 2']);
    expect(screen.getByRole('spinbutton', {name: 'c: vrstica 2, stolpec 1'})).toHaveValue('3');
    expect(group).toContainElement(fields[3]);
});

test('cell labels are hidden visually and the cells are compact', () => {
    render(<NumberGrid label="Matrika A" columns={2} cells={cells()}/>);
    const label = screen.getByText('b: vrstica 1, stolpec 2');
    expect(label).toHaveClass('visually-hidden');
    expect(label.closest('.number-input')).toHaveClass('number-input-compact');
    expect(document.querySelector('.number-grid-cells')!.getAttribute('style')).toContain('--number-grid-columns: 2');
});

test('a wrapping grid marks itself and sets no column count', () => {
    render(<NumberGrid label="Vozli" columns="wrap" cells={cells()}/>);
    const body = document.querySelector('.number-grid-cells')!;
    expect(body).toHaveAttribute('data-columns', 'wrap');
    expect(body.getAttribute('style')).toBeNull();
});

test('a typed value is committed on Enter to the onChange of its own cell', () => {
    const onChange = vi.fn();
    render(<NumberGrid label="Matrika A" columns={2} cells={cells(onChange)}/>);
    const field = screen.getByRole('spinbutton', {name: 'c: vrstica 2, stolpec 1'});
    fireEvent.change(field, {target: {value: '2,5'}});
    fireEvent.keyDown(field, {key: 'Enter'});
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(2.5);
});

test('a refused value shows the cell hint instead of committing', () => {
    const onChange = vi.fn();
    render(<NumberGrid label="Matrika A" columns={2} cells={cells(onChange)}/>);
    const field = screen.getByRole('spinbutton', {name: 'a: vrstica 1, stolpec 1'});
    fireEvent.change(field, {target: {value: '9'}});
    fireEvent.keyDown(field, {key: 'Enter'});
    expect(onChange).not.toHaveBeenCalled();
    expect(field).toHaveAccessibleDescription(/\S/);
    expect(document.querySelector('.number-input-hint')).toBeInTheDocument();
});

test('a cell can bring its own rejected hint', () => {
    const list = cells();
    list[1] = {...list[1], rejectedHint: 'Vozli ne smejo padati.', onChange: () => false};
    render(<NumberGrid label="Vozli" columns="wrap" cells={list}/>);
    const field = screen.getByRole('spinbutton', {name: 'b: vrstica 1, stolpec 2'});
    fireEvent.change(field, {target: {value: '1'}});
    fireEvent.keyDown(field, {key: 'Enter'});
    expect(screen.getByText('Vozli ne smejo padati.')).toBeInTheDocument();
});

test('describedBy and help describe the group and every cell', () => {
    render(<>
        <p id="notice">Obvestilo.</p>
        <NumberGrid label="Matrika A" columns={2} cells={cells()} describedBy="notice" help="Pomoč za matriko."/>
    </>);
    expect(screen.getByRole('group', {name: 'Matrika A'})).toHaveAccessibleDescription('Obvestilo. Pomoč za matriko.');
    for (const field of screen.getAllByRole('spinbutton')) expect(field).toHaveAccessibleDescription('Obvestilo. Pomoč za matriko.');
});
