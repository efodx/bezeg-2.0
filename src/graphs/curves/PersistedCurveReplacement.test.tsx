/**
 * Controls open item (step 7, slice 3 note): applying a persisted Preset to a live curve scene replaces its curves.
 * Entries tested are the real ones: Preset selection and a reload after file import (`reloadAfterImport`), both through
 * the scene replacement. `importPreset` alone is the data step inside that replacement, not an entry.
 */
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {act} from '@testing-library/react';
import {appStorage} from '../../storage/appStorage';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, settle} from '../base/realGraphTestHarness';
import type {Preset} from '../base/presets/Presets';
import type {DemonstrationId} from '../../demonstrations';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());

type Internals = {
    jxgCurves: unknown[];
    exportPresetData(): unknown[];
    importPresetData(data: unknown): void;
    presets(): string;
    selectPreset(id: string): Promise<void>;
    reloadAfterImport(): Promise<void>;
};

const IDS: DemonstrationId[] = ['bezier', 'rational', 'ph-cubic', 'spline-c1', 'spline-g1'];

describe.each(IDS)('persisted application replaces the live curves (%s)', id => {
    function setup() {
        const graph = createGraph(id);
        const g = graph as unknown as Internals;
        const view = mountGraph(graph).view;
        const stored = JSON.parse(JSON.stringify(g.exportPresetData().slice(0, 1))) as unknown[];
        // The live scene gets a second curve.
        act(() => g.importPresetData(JSON.parse(JSON.stringify(stored))));
        expect(g.jxgCurves).toHaveLength(2);
        const store = (preset: Preset) => appStorage.setItem(`preset-${g.presets()}`, JSON.stringify({data: [preset]}));
        return {g, stored, store, view};
    }

    test('selecting a stored Preset', async () => {
        const {g, stored, store, view} = setup();
        store({id: 'one', data: stored} as unknown as Preset);
        await settle(() => g.selectPreset('one'));
        expect(g.jxgCurves).toHaveLength(1);
        expect(JSON.stringify(g.exportPresetData())).toBe(JSON.stringify(stored));
        view.unmount();
    });

    test('reload after file import', async () => {
        const {g, stored, store, view} = setup();
        store({id: 'one', data: stored} as unknown as Preset);
        await settle(() => g.selectPreset('one'));
        act(() => g.importPresetData(JSON.parse(JSON.stringify(stored))));
        expect(g.jxgCurves).toHaveLength(2);
        await settle(() => g.reloadAfterImport());
        expect(g.jxgCurves).toHaveLength(1);
        expect(JSON.stringify(g.exportPresetData())).toBe(JSON.stringify(stored));
        view.unmount();
    });

    test('bare importPreset is the data step: it appends, because the entries dispose first (documented)', () => {
        const {g, stored, view} = setup();
        (g as unknown as {importPreset(p: Preset): void}).importPreset({id: 'one', data: stored} as unknown as Preset);
        expect(g.jxgCurves).toHaveLength(3);
        view.unmount();
    });
});
