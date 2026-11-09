import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
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

describe('PointListInput: step', () => {
    test('an arrow key moves a field by the step prop, by 1 without it', () => {
        const onCommit = vi.fn();
        const {unmount} = render(<PointListInput title="t" points={[[0, 0]] as const} pointLabel={name} onCommit={onCommit} step={0.25}/>);
        act(() => { fireEvent.keyDown(screen.getByRole('spinbutton', {name: 'T1, x'}), {key: 'ArrowUp'}); });
        expect(onCommit).toHaveBeenLastCalledWith(0, [0.25, 0]);
        unmount();
        render(<PointListInput title="t" points={[[0, 0]] as const} pointLabel={name} onCommit={onCommit}/>);
        act(() => { fireEvent.keyDown(screen.getByRole('spinbutton', {name: 'T1, x'}), {key: 'ArrowUp'}); });
        expect(onCommit).toHaveBeenLastCalledWith(0, [1, 0]);
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
        expect(screen.getByRole('button', {name: 'Izberi: T2'})).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', {name: 'Izberi: T1'})).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(screen.getByRole('button', {name: 'Izberi: T1'}));
        expect(onSelect).toHaveBeenLastCalledWith(0);
        fireEvent.click(screen.getByRole('button', {name: 'Izberi: T2'}));
        expect(onSelect).toHaveBeenLastCalledWith(undefined);
    });

    test('the toggle names its point, not just the bare label', () => {
        setLanguage('sl');
        render(<PointListInput title="t" points={[[0, 0]] as const} pointLabel={name} onCommit={() => undefined} selected={undefined} onSelect={() => undefined}/>);
        expect(screen.getByRole('button', {name: 'Izberi: T1'})).toHaveTextContent('T1');
        expect(screen.queryByRole('button', {name: 'T1'})).toBeNull();
    });

    test('SelectablePointButton stands alone', () => {
        const onToggle = vi.fn();
        render(<SelectablePointButton label="A" pressed onToggle={onToggle}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Izberi: A'}));
        expect(screen.getByRole('button', {name: 'Izberi: A'})).toHaveAttribute('aria-pressed', 'true');
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

    test('the visible count line is not live; a count change is announced once through the status region', () => {
        const onRemove = vi.fn();
        const view = render(<PointCollection {...base} count={2} onAdd={() => undefined} removal={{kind: 'selected', onRemove, hasSelection: true}}/>);
        expect(document.querySelector('.point-collection-count')).not.toHaveAttribute('role');
        const region = document.querySelector('[data-point-collection-status]')!;
        expect(region.textContent).toBe('');
        view.rerender(<PointCollection {...base} count={3} onAdd={() => undefined} removal={{kind: 'selected', onRemove, hasSelection: true}}/>);
        expect(region.textContent).toContain('3');
        expect(document.querySelector('.point-collection-count')).not.toHaveAttribute('role');
    });

    test('a pressed reason is shown again in the new language after a switch', () => {
        const props = {label: 'p', min: 0, max: 3, count: 3, onAdd: () => undefined, removal: {kind: 'selected', onRemove: () => undefined, hasSelection: false} as const};
        render(<PointCollection {...props}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Dodaj točko'}));
        const reason = () => document.querySelector('[data-point-collection-reason]')?.textContent;
        const slovenian = reason();
        expect(slovenian).toBeTruthy();
        act(() => setLanguage('en'));
        try {
            expect(reason()).toBeTruthy();
            expect(reason()).not.toBe(slovenian);
        } finally {
            act(() => setLanguage('sl'));
        }
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
    test('a refused typed add keeps the typed values and shows the refusal; an accepted one clears them', () => {
        let refusal: string | undefined = 'Ta točka že obstaja.';
        const onAdd = vi.fn(() => refusal);
        render(<PointCollection {...base} count={2} onAdd={onAdd} removal={{kind: 'last', onRemove: () => undefined}}
                                typedEntry={{axisLabels: ['x', 'y']}}/>);
        const [x, y] = screen.getAllByRole('spinbutton') as HTMLInputElement[];
        type(x, '4');
        fireEvent.keyDown(x, {key: 'Enter'});
        type(y, '2');
        fireEvent.keyDown(y, {key: 'Enter'});
        expect(onAdd).toHaveBeenCalledWith([4, 2]);
        expect(x.value).toBe('4');
        expect(y.value).toBe('2');
        expect(document.querySelector('[data-point-collection-reason]')?.textContent).toBe('Ta točka že obstaja.');
        refusal = undefined;
        fireEvent.keyDown(y, {key: 'Enter'});
        expect(onAdd).toHaveBeenCalledTimes(2);
        expect(x.value).toBe('');
    });

    test('a refused untyped add shows the refusal reason', () => {
        render(<PointCollection {...base} count={2} onAdd={() => 'Ta točka že obstaja.'} removal={{kind: 'selected', onRemove: () => undefined, hasSelection: false}}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Dodaj točko'}));
        expect(document.querySelector('[data-point-collection-reason]')?.textContent).toBe('Ta točka že obstaja.');
    });

    test('the shown reason follows a changed min', () => {
        const props = {label: 'p', max: 5, count: 3, onAdd: () => undefined, removal: {kind: 'last', onRemove: () => undefined} as const, onClear: () => undefined};
        const view = render(<PointCollection {...props} min={1}/>);
        fireEvent.click(screen.getByRole('button', {name: /Počisti/}));
        expect(document.querySelector('[data-point-collection-reason]')?.textContent).toContain('1');
        view.rerender(<PointCollection {...props} min={2}/>);
        expect(document.querySelector('[data-point-collection-reason]')?.textContent).toContain('2');
    });
});
