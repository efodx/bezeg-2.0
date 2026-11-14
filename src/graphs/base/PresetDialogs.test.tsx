import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {PresetFigureBatchDialog} from './PresetFigureBatchDialog';
import {PresetImportDialog} from './PresetImportDialog';
import {PresetService} from './presets/Presets';
import {appStorage} from '../../storage/appStorage';

beforeEach(() => appStorage.clear());

describe('the preset dialogs share the site dialog style and keep focus', () => {
    it('figure batch: focus is inside the dialog when open and returns to the trigger on cancel', async () => {
        const service = new PresetService('bezier-curve');
        service.savePreset({id: 'mine'});
        render(<PresetFigureBatchDialog presetService={service} onConfirm={() => undefined}/>);
        const trigger = screen.getByRole('button', {name: 'Generiraj slike za prednastavitve'});
        trigger.focus();
        fireEvent.click(trigger);
        const dialog = await screen.findByRole('dialog');
        expect(dialog.classList.contains('bezeg-dialog')).toBe(true);
        await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
        fireEvent.click(screen.getByRole('button', {name: 'Prekliči'}));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        await waitFor(() => expect(document.activeElement).toBe(trigger));
    });

    it('import: focus is inside the dialog when open and returns to the trigger on cancel', async () => {
        render(<PresetImportDialog onImported={() => undefined}/>);
        const trigger = screen.getByRole('button', {name: 'Uvozi prednastavitve'});
        trigger.focus();
        fireEvent.click(trigger);
        const dialog = await screen.findByRole('dialog');
        expect(dialog.classList.contains('bezeg-dialog')).toBe(true);
        await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
        fireEvent.click(screen.getByRole('button', {name: 'Prekliči'}));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        await waitFor(() => expect(document.activeElement).toBe(trigger));
    });
});
