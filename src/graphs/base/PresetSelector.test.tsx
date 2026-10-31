import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {PresetSelector} from './PresetSelector';
import {PresetService} from './presets/Presets';
import {appStorage} from '../../storage/appStorage';

beforeEach(() => {
    appStorage.clear();
});

const renderSelector = (service: PresetService) => render(<PresetSelector presetService={service} selectedPresetId=""
    presetListVersion={0} onSelect={() => undefined} onReset={() => undefined} onSave={() => undefined}
    onDelete={() => undefined} onImported={() => undefined}/>);

test('an unreadable stored collection disables save and keeps the backup notice visible beside its alert', () => {
    appStorage.setItem('preset-bezier-curve', 'not json{');
    appStorage.setItem('preset-other', JSON.stringify({data: [{id: 'kept'}]}));
    URL.createObjectURL = () => 'blob:test';
    URL.revokeObjectURL = () => undefined;
    renderSelector(new PresetService('bezier-curve'));

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    const save = document.querySelector<HTMLButtonElement>('button.preset-save');
    expect(save).not.toBeNull();
    expect(save?.disabled).toBe(true);

    const exportButton = screen.getAllByRole('button').find(button => /izvoz|export/i.test(button.textContent ?? ''));
    expect(exportButton).toBeDefined();
    fireEvent.click(exportButton!);

    const alerts = screen.getAllByRole('alert').map(alert => alert.textContent);
    expect(alerts).toHaveLength(2);
    expect(alerts.some(text => text?.includes('preset-bezier-curve'))).toBe(true);
    expect(appStorage.getItem('preset-bezier-curve')).toBe('not json{');
});
