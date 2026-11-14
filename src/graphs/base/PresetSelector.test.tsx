import React from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {PresetSelector} from './PresetSelector';
import {PresetService} from './presets/Presets';
import {PresetLockContext} from '../context/react/PresetLockContext';
import {appStorage} from '../../storage/appStorage';

beforeEach(() => {
    appStorage.clear();
});

const handlers = () => ({onSelect: vi.fn(), onReset: vi.fn(), onSave: vi.fn(), onDelete: vi.fn(), onRename: vi.fn(), onImported: vi.fn()});

function renderSelector(service: PresetService, selectedPresetId = '', locked = false, on = handlers()) {
    render(<PresetLockContext.Provider value={locked}><PresetSelector presetService={service} selectedPresetId={selectedPresetId}
        presetListVersion={0} {...on}/></PresetLockContext.Provider>);
    return on;
}

function withPresets(...ids: string[]) {
    const service = new PresetService('bezier-curve');
    ids.forEach(id => service.savePreset({id}));
    return service;
}

const openSave = () => fireEvent.click(document.querySelector<HTMLButtonElement>('button.preset-save')!);
const nameField = () => screen.getByLabelText('Ime stanja') as HTMLInputElement;
const selectOf = (id: string) => document.querySelector<HTMLButtonElement>(`li[data-preset-id="${id}"] button.preset-row-select`)!;
const menuOf = (name: string) => screen.getByRole('button', {name: `Meni za stanje ${name}`});

test('an unreadable stored collection makes save unavailable but focusable and keeps the backup notice visible beside its alert', () => {
    appStorage.setItem('preset-bezier-curve', 'not json{');
    appStorage.setItem('preset-other', JSON.stringify({data: [{id: 'kept'}]}));
    URL.createObjectURL = () => 'blob:test';
    URL.revokeObjectURL = () => undefined;
    const on = renderSelector(new PresetService('bezier-curve'));

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    const save = document.querySelector<HTMLButtonElement>('button.preset-save');
    expect(save).not.toBeNull();
    expect(save?.disabled).toBe(false);
    expect(save?.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(save!);
    expect(screen.queryByLabelText('Ime stanja')).toBeNull();
    expect(on.onSave).not.toHaveBeenCalled();

    const exportButton = screen.getAllByRole('button').find(button => /izvoz|export/i.test(button.textContent ?? ''));
    expect(exportButton).toBeDefined();
    fireEvent.click(exportButton!);

    const alerts = screen.getAllByRole('alert').map(alert => alert.textContent);
    expect(alerts).toHaveLength(2);
    expect(alerts.some(text => text?.includes('preset-bezier-curve'))).toBe(true);
    expect(appStorage.getItem('preset-bezier-curve')).toBe('not json{');
});

describe('the list of saved states', () => {
    test('lists the default state first, then each stored preset, and marks the selected one', () => {
        renderSelector(withPresets('alpha', 'beta'), 'beta');
        const rows = within(screen.getByRole('list', {name: 'Shranjena stanja'})).getAllByRole('listitem');
        expect(rows.map(row => row.getAttribute('data-preset-id'))).toEqual(['', 'alpha', 'beta']);
        expect(within(rows[0]).getByRole('button', {name: /Privzeto stanje/}).hasAttribute('aria-current')).toBe(false);
        expect(selectOf('beta').getAttribute('aria-current')).toBe('true');
        expect(selectOf('alpha').hasAttribute('aria-current')).toBe(false);
    });

    test('marks the default state when no stored preset is selected', () => {
        renderSelector(withPresets('alpha'), '');
        expect(screen.getByRole('button', {name: /Privzeto stanje/}).getAttribute('aria-current')).toBe('true');
    });

    test('selecting a row calls onSelect with its id, the default row with an empty id', () => {
        const on = renderSelector(withPresets('alpha', 'beta'), 'beta');
        fireEvent.click(selectOf('alpha'));
        expect(on.onSelect).toHaveBeenLastCalledWith('alpha');
        fireEvent.click(screen.getByRole('button', {name: /Privzeto stanje/}));
        expect(on.onSelect).toHaveBeenLastCalledWith('');
    });
});

describe('saving the current state in place', () => {
    test('opens a labelled field prefilled with the selected name, focuses it, and saves the trimmed name on Enter', () => {
        const on = renderSelector(withPresets('alpha'), 'alpha');
        openSave();
        expect(nameField().value).toBe('alpha');
        expect(document.activeElement).toBe(nameField());
        fireEvent.change(nameField(), {target: {value: '  fresh  '}});
        fireEvent.keyDown(nameField(), {key: 'Enter'});
        expect(on.onSave).toHaveBeenCalledWith('fresh');
        expect(screen.queryByLabelText('Ime stanja')).toBeNull();
        expect(document.activeElement).toBe(document.querySelector('button.preset-save'));
    });

    test('shows the overwrite notice while the name equals an existing preset', () => {
        renderSelector(withPresets('alpha', 'beta'), '');
        openSave();
        expect(nameField().value).toBe('');
        expect(screen.queryByRole('status')).toBeNull();
        fireEvent.change(nameField(), {target: {value: ' beta '}});
        expect(screen.getByRole('status').textContent).toContain('beta');
        fireEvent.change(nameField(), {target: {value: 'gamma'}});
        expect(screen.queryByRole('status')).toBeNull();
    });

    test('cannot save an empty or whitespace-only name', () => {
        const on = renderSelector(withPresets('alpha'), '');
        openSave();
        fireEvent.change(nameField(), {target: {value: '   '}});
        fireEvent.keyDown(nameField(), {key: 'Enter'});
        const save = screen.getByRole('button', {name: 'Shrani'});
        fireEvent.click(save);
        expect(on.onSave).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toMatch(/ime/i);
    });

    test('Escape cancels without saving and returns focus to the trigger; Cancel does the same', () => {
        const on = renderSelector(withPresets('alpha'), '');
        openSave();
        fireEvent.change(nameField(), {target: {value: 'x'}});
        fireEvent.keyDown(nameField(), {key: 'Escape'});
        expect(screen.queryByLabelText('Ime stanja')).toBeNull();
        expect(document.activeElement).toBe(document.querySelector('button.preset-save'));
        openSave();
        fireEvent.click(screen.getByRole('button', {name: 'Prekliči'}));
        expect(screen.queryByLabelText('Ime stanja')).toBeNull();
        expect(on.onSave).not.toHaveBeenCalled();
    });
});

describe('the row menu', () => {
    test('overwrite saves the current state under the row name', () => {
        const on = renderSelector(withPresets('alpha', 'beta'), 'alpha');
        fireEvent.click(menuOf('beta'));
        fireEvent.click(screen.getByRole('button', {name: 'Prepiši s trenutnim stanjem'}));
        expect(on.onSave).toHaveBeenCalledWith('beta');
    });

    test('delete asks inline first, Cancel keeps the preset, Delete passes the row id', () => {
        const on = renderSelector(withPresets('alpha', 'beta'), 'alpha');
        fireEvent.click(menuOf('beta'));
        fireEvent.click(screen.getByRole('button', {name: 'Izbriši'}));
        expect(on.onDelete).not.toHaveBeenCalled();
        expect(screen.getByText(/Izbrišem stanje/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', {name: 'Prekliči'}));
        expect(on.onDelete).not.toHaveBeenCalled();
        fireEvent.click(menuOf('beta'));
        fireEvent.click(screen.getByRole('button', {name: 'Izbriši'}));
        fireEvent.click(within(screen.getByRole('group', {name: /Izbrišem stanje/})).getByRole('button', {name: 'Izbriši'}));
        expect(on.onDelete).toHaveBeenCalledWith('beta');
    });

    test('rename rejects a duplicate and an empty name with a visible message, and accepts a free name', () => {
        const on = renderSelector(withPresets('alpha', 'beta'), 'alpha');
        fireEvent.click(menuOf('beta'));
        fireEvent.click(screen.getByRole('button', {name: 'Preimenuj'}));
        const field = screen.getAllByRole('textbox').find(input => (input as HTMLInputElement).value === 'beta')!;
        fireEvent.change(field, {target: {value: 'alpha'}});
        fireEvent.keyDown(field, {key: 'Enter'});
        expect(screen.getByRole('alert').textContent).toMatch(/že obstaja/);
        fireEvent.change(field, {target: {value: ' '}});
        fireEvent.keyDown(field, {key: 'Enter'});
        expect(screen.getByRole('alert').textContent).toMatch(/Vpiši/);
        expect(on.onRename).not.toHaveBeenCalled();
        fireEvent.change(field, {target: {value: 'gamma'}});
        fireEvent.keyDown(field, {key: 'Enter'});
        expect(on.onRename).toHaveBeenCalledWith('beta', 'gamma');
    });
});

test('under the lesson lock every state-changing control is unavailable but focusable, while export stays usable', () => {
    const on = renderSelector(withPresets('alpha', 'beta'), 'alpha', true);
    const unavailable = (button: HTMLElement) => button.getAttribute('aria-disabled') === 'true' && !(button as HTMLButtonElement).disabled;
    fireEvent.click(selectOf('beta'));
    fireEvent.click(menuOf('beta'));
    fireEvent.click(screen.getByRole('button', {name: 'Ponastavi prednastavitev'}));
    fireEvent.click(document.querySelector<HTMLButtonElement>('button.preset-save')!);
    expect(on.onSelect).not.toHaveBeenCalled();
    expect(on.onReset).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Ime stanja')).toBeNull();
    expect(screen.queryByRole('button', {name: 'Preimenuj'})).toBeNull();
    expect([selectOf('beta'), menuOf('beta'), screen.getByRole('button', {name: 'Ponastavi prednastavitev'}),
        document.querySelector<HTMLButtonElement>('button.preset-save')!, screen.getByRole('button', {name: 'Uvozi prednastavitve'})].every(unavailable)).toBe(true);
    expect(unavailable(screen.getByRole('button', {name: 'Izvozi prednastavitve'}))).toBe(false);
});
