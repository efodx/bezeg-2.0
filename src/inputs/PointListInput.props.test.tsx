import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {PointListInput, SelectablePointButton} from './PointListInput';
import {PointCollection} from './PointCollection';
import {setLanguage} from '../localization';

beforeEach(() => setLanguage('sl'));
const type = (input: HTMLElement, value: string) => fireEvent.input(input, {target: {value}, inputType: 'insertText'});
const name = (i: number) => `T${i + 1}`;

describe('PointListInput: axisLabels of length 1, 2 and 3', () => {
    test('one field per axis, and the whole row is committed with the other coordinates kept', () => {
        const onCommit = vi.fn();
        render(<PointListInput title="t" points={[[1, 2, 3]] as const} axisLabels={['x', 'y', 'z']} pointLabel={name} onCommit={onCommit}/>);
        expect(screen.getAllByRole('spinbutton').map(f => f.id && document.querySelector(`label[for="${f.id}"]`)?.textContent)).toEqual(['T1, x', 'T1, y', 'T1, z']);
        const z = screen.getByRole('spinbutton', {name: 'T1, z'});
        type(z, '7');
        fireEvent.keyDown(z, {key: 'Enter'});
        expect(onCommit).toHaveBeenCalledWith(0, [1, 2, 7]);
    });

    test('a 1D list has a single field', () => {
        const onCommit = vi.fn();
        render(<PointListInput title="t" points={[[4], [5]] as const} axisLabels={['t']} pointLabel={name} onCommit={onCommit}/>);
        expect(screen.getAllByRole('spinbutton')).toHaveLength(2);
        const field = screen.getByRole('spinbutton', {name: 'T2, t'});
        type(field, '6');
        fireEvent.keyDown(field, {key: 'Enter'});
        expect(onCommit).toHaveBeenCalledWith(1, [6]);
    });
});

describe('PointListInput: grid and integer', () => {
    test('grid snaps an off-grid value with the field notice; integer refuses a fraction', () => {
        const onCommit = vi.fn();
        render(<PointListInput title="t" points={[[0, 0]] as const} pointLabel={name} onCommit={onCommit} grid={0.5} min={-10} max={10}/>);
        const x = screen.getByRole('spinbutton', {name: 'T1, x'});
        type(x, '1,3');
        fireEvent.keyDown(x, {key: 'Enter'});
        expect(onCommit).toHaveBeenCalledWith(0, [1.5, 0]);
        expect(document.querySelector('.number-input-hint')).toBeTruthy();
    });

    test('integer refuses a fraction', () => {
        const onCommit = vi.fn();
        render(<PointListInput title="t" points={[[0, 0]] as const} pointLabel={name} onCommit={onCommit} integer min={-10} max={10}/>);
        const x = screen.getByRole('spinbutton', {name: 'T1, x'});
        type(x, '1,5');
        fireEvent.keyDown(x, {key: 'Enter'});
        expect(onCommit).not.toHaveBeenCalled();
    });
});

describe('PointListInput: onRemove and minCount', () => {
    const points = [[0, 0], [1, 1], [2, 2]] as const;
    test('each row has a remove button naming its point', () => {
        const onRemove = vi.fn();
        render(<PointListInput title="t" points={points} pointLabel={name} onCommit={() => undefined} onRemove={onRemove}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Odstrani: T2'}));
        expect(onRemove).toHaveBeenCalledWith(1);
    });

    test('at the fewest points the button is unavailable, keeps focus, and a press states the reason', () => {
        const onRemove = vi.fn();
        render(<PointListInput title="t" points={points} pointLabel={name} onCommit={() => undefined} onRemove={onRemove} minCount={3}/>);
        const button = screen.getByRole('button', {name: 'Odstrani: T1'});
        expect(button).toHaveAttribute('aria-disabled', 'true');
        button.focus();
        expect(button).toHaveFocus();
        fireEvent.click(button);
        expect(onRemove).not.toHaveBeenCalled();
        expect(document.querySelector('[data-point-reason]')?.textContent).toBe('Najmanj 3.');
    });
});

describe('PointListInput: selection', () => {
    test('the row name is a pressed toggle; pressing the selected row releases it', () => {
        const onSelect = vi.fn();
        render(<PointListInput title="t" points={[[0, 0], [1, 1]] as const} pointLabel={name} onCommit={() => undefined} selected={1} onSelect={onSelect}/>);
        expect(screen.getByRole('button', {name: 'T2'})).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', {name: 'T1'})).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(screen.getByRole('button', {name: 'T1'}));
        expect(onSelect).toHaveBeenLastCalledWith(0);
        fireEvent.click(screen.getByRole('button', {name: 'T2'}));
        expect(onSelect).toHaveBeenLastCalledWith(undefined);
    });

    test('SelectablePointButton stands alone', () => {
        const onToggle = vi.fn();
        render(<SelectablePointButton label="A" pressed onToggle={onToggle}/>);
        fireEvent.click(screen.getByRole('button', {name: 'A'}));
        expect(screen.getByRole('button', {name: 'A'})).toHaveAttribute('aria-pressed', 'true');
        expect(onToggle).toHaveBeenCalledTimes(1);
    });
});

describe('PointCollection', () => {
    const base = {label: 'Točke', min: 1, max: 3};
    test('remove-last renders the stepper; plus adds without coordinates', () => {
        const onAdd = vi.fn(), onRemove = vi.fn();
        render(<PointCollection {...base} count={2} onAdd={onAdd} removal={{kind: 'last', onRemove}}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Povečaj število'}));
        expect(onAdd).toHaveBeenCalledWith();
        fireEvent.click(screen.getByRole('button', {name: 'Zmanjšaj število'}));
        expect(onRemove).toHaveBeenCalledTimes(1);
    });

    test('remove-selected: unavailable without a selection and at the minimum, each with a reason', () => {
        const onRemove = vi.fn();
        const view = render(<PointCollection {...base} count={2} onAdd={() => undefined} removal={{kind: 'selected', onRemove, hasSelection: false}}/>);
        const remove = () => screen.getByRole('button', {name: 'Odstrani izbrano točko'});
        expect(remove()).toHaveAttribute('aria-disabled', 'true');
        fireEvent.click(remove());
        expect(document.querySelector('[data-point-collection-reason]')?.textContent).toBe('Nobena točka ni izbrana.');
        view.rerender(<PointCollection {...base} count={2} onAdd={() => undefined} removal={{kind: 'selected', onRemove, hasSelection: true}}/>);
        fireEvent.click(remove());
        expect(onRemove).toHaveBeenCalledTimes(1);
        view.rerender(<PointCollection {...base} count={1} onAdd={() => undefined} removal={{kind: 'selected', onRemove, hasSelection: true}}/>);
        expect(remove()).toHaveAttribute('aria-disabled', 'true');
        fireEvent.click(remove());
        expect(document.querySelector('[data-point-collection-reason]')?.textContent).toBe('Najmanj 1.');
    });

    test('Clear all is available only with points and no lower bound; otherwise it says why', () => {
        const onClear = vi.fn();
        const props = {label: 'p', max: 3, onAdd: () => undefined, removal: {kind: 'last', onRemove: () => undefined} as const, onClear};
        const view = render(<PointCollection {...props} min={0} count={2}/>);
        const clear = () => screen.getByRole('button', {name: 'Počisti vse točke'});
        fireEvent.click(clear());
        expect(onClear).toHaveBeenCalledTimes(1);
        view.rerender(<PointCollection {...props} min={0} count={0}/>);
        expect(clear()).toHaveAttribute('aria-disabled', 'true');
        fireEvent.click(clear());
        expect(document.querySelector('[data-point-collection-reason]')?.textContent).toBe('Ni točk.');
        view.rerender(<PointCollection {...props} min={1} count={2}/>);
        expect(clear()).toHaveAttribute('aria-disabled', 'true');
    });

    test('addMode is a pressed toggle', () => {
        const onToggle = vi.fn();
        render(<PointCollection {...base} count={2} onAdd={() => undefined} removal={{kind: 'last', onRemove: () => undefined}} addMode={{on: true, onToggle}}/>);
        const button = screen.getByRole('button', {name: 'Dodajanje z dotikom ali klikom'});
        expect(button).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(button);
        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    test('typed entry: Enter adds at the coordinates; a refused value adds nothing and keeps the field hint', () => {
        const onAdd = vi.fn();
        render(<PointCollection {...base} count={2} onAdd={onAdd} removal={{kind: 'last', onRemove: () => undefined}}
                                typedEntry={{axisLabels: ['x', 'y'], min: 0, max: 10, integer: true}}/>);
        const [x, y] = screen.getAllByRole('spinbutton');
        type(x, '99');
        fireEvent.keyDown(x, {key: 'Enter'});
        expect(onAdd).not.toHaveBeenCalled();
        expect(document.querySelector('.number-input-hint')).toBeTruthy();
        type(x, '4');
        fireEvent.keyDown(x, {key: 'Enter'});
        expect(onAdd).not.toHaveBeenCalled(); // y is still missing: the reason is shown
        expect(document.querySelector('[data-point-collection-reason]')?.textContent).toBe('Najprej vnesi vse koordinate nove točke.');
        type(y, '2,5');
        fireEvent.keyDown(y, {key: 'Enter'});
        expect(onAdd).not.toHaveBeenCalled(); // not an integer
        type(y, '2');
        fireEvent.keyDown(y, {key: 'Enter'});
        expect(onAdd).toHaveBeenCalledWith([4, 2]);
        expect((x as HTMLInputElement).value).toBe('');
    });

    test('typed entry at the maximum count refuses with the limit reason', () => {
        const onAdd = vi.fn();
        render(<PointCollection {...base} count={3} onAdd={onAdd} removal={{kind: 'selected', onRemove: () => undefined, hasSelection: false}}
                                typedEntry={{axisLabels: ['x']}}/>);
        const x = screen.getByRole('spinbutton');
        type(x, '1');
        fireEvent.keyDown(x, {key: 'Enter'});
        expect(onAdd).not.toHaveBeenCalled();
        expect(screen.getByRole('button', {name: 'Dodaj na koordinatah'})).toHaveAttribute('aria-disabled', 'true');
        expect(document.querySelector('[data-point-collection-reason]')?.textContent).toBe('Doseženo je največje število točk (3). Odstrani točko, preden dodaš novo.');
    });
});
