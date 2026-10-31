import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {PointListInput} from './PointListInput';

const points = [[0, 0], [1, 2], [3, 3]] as const;
const type = (input: HTMLElement, value: string) => fireEvent.input(input, {target: {value}, inputType: 'insertText'});
const list = (onCommit: (index: number, value: readonly [number, number]) => string | void, rows = points) =>
    <PointListInput title="Točke" points={rows} pointLabel={i => `Točka ${i + 1}`} onCommit={onCommit} min={-1000} max={1000}/>;

test('every point has an x and a y field named after it, in reading order', () => {
    render(list(() => undefined));
    const names = screen.getAllByRole('spinbutton').map(field => field.getAttribute('id') && (document.querySelector(`label[for="${field.id}"]`)?.textContent));
    expect(names).toEqual(['Točka 1, x', 'Točka 1, y', 'Točka 2, x', 'Točka 2, y', 'Točka 3, x', 'Točka 3, y']);
    expect(screen.getByRole('group', {name: 'Točka 2'})).toBeInTheDocument();
    expect((screen.getByRole('spinbutton', {name: 'Točka 2, y'}) as HTMLInputElement).value).toBe('2');
});

test('keyboard alone: Tab to a field, type, Enter commits the whole point with the other coordinate kept', () => {
    const onCommit = vi.fn();
    render(list(onCommit));
    userEvent.tab();
    expect(screen.getByRole('spinbutton', {name: 'Točka 1, x'})).toHaveFocus();
    userEvent.tab();
    userEvent.tab();
    const x2 = screen.getByRole('spinbutton', {name: 'Točka 2, x'});
    expect(x2).toHaveFocus();
    type(x2, '1,5');
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.keyDown(x2, {key: 'Enter'});
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(1, [1.5, 2]);
    userEvent.tab();
    expect(screen.getByRole('spinbutton', {name: 'Točka 2, y'})).toHaveFocus();
});

test('blur commits, an unparseable draft and an out-of-range value commit nothing', () => {
    const onCommit = vi.fn();
    render(list(onCommit));
    const y1 = screen.getByRole('spinbutton', {name: 'Točka 3, y'});
    type(y1, '-');
    fireEvent.blur(y1);
    type(y1, '5000');
    fireEvent.keyDown(y1, {key: 'Enter'});
    expect(onCommit).not.toHaveBeenCalled();
    type(y1, '-4');
    fireEvent.blur(y1);
    expect(onCommit).toHaveBeenCalledWith(2, [3, -4]);
});

test('a refused edit shows the caller message at that field and the field returns to the model value', () => {
    const onCommit = vi.fn(() => 'Točki 1 in 2 se ujemata');
    render(list(onCommit));
    const x2 = screen.getByRole('spinbutton', {name: 'Točka 2, x'}) as HTMLInputElement;
    type(x2, '0');
    fireEvent.keyDown(x2, {key: 'Enter'});
    expect(onCommit).toHaveBeenCalledWith(1, [0, 2]);
    expect(x2).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Točki 1 in 2 se ujemata')).toBeInTheDocument();
    fireEvent.blur(x2);
    expect(x2.value).toBe('1');
    expect(x2).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('spinbutton', {name: 'Točka 2, y'})).not.toHaveAttribute('aria-invalid');
});

test('a refusal disappears when the points change (drag, reset, import) and is never shown for a row that is gone', () => {
    const refuse = () => 'Točki se ujemata';
    const {rerender} = render(list(refuse));
    const x3 = screen.getByRole('spinbutton', {name: 'Točka 3, x'});
    type(x3, '0');
    fireEvent.keyDown(x3, {key: 'Enter'});
    expect(screen.getByText('Točki se ujemata')).toBeInTheDocument();
    rerender(list(refuse, [[0, 0], [1, 2], [3.5, 3]] as unknown as typeof points));
    expect(screen.queryByText('Točki se ujemata')).toBeNull();
    expect(screen.queryByText(/zavrnjena|ni sprejeta/i)).toBeNull();
    expect(screen.getByRole('spinbutton', {name: 'Točka 3, x'})).not.toHaveAttribute('aria-invalid');
    const x2 = screen.getByRole('spinbutton', {name: 'Točka 2, x'});
    type(x2, '0');
    fireEvent.keyDown(x2, {key: 'Enter'});
    expect(screen.getByText('Točki se ujemata')).toBeInTheDocument();
    rerender(list(refuse, [[0, 0]] as unknown as typeof points));
    expect(screen.queryByText('Točki se ujemata')).toBeNull();
    expect(screen.queryByRole('spinbutton', {name: 'Točka 2, x'})).toBeNull();
});

test('the fields follow the points handed in', () => {
    const {rerender} = render(list(() => undefined));
    rerender(list(() => undefined, [[0, 0], [7.25, -2], [3, 3]] as unknown as typeof points));
    expect((screen.getByRole('spinbutton', {name: 'Točka 2, x'}) as HTMLInputElement).value).toBe('7,25');
});
