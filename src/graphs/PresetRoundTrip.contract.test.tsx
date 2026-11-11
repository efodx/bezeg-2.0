/**
 * Every graph with a Preset collection: its own exported Preset passes its own collection, imports back to the same
 * data, and so does an entry that carries the data but no graphState. Both go through Preset selection and Reset.
 * The data is the mount default; a graph cannot be moved to other data generically.
 */
import {afterEach, beforeAll, describe, expect, test} from 'vitest';
import {act, cleanup} from '@testing-library/react';
import BaseGraph, {BaseGraphState} from './base/BaseGraph';
import {installBoardShims, mountGraph, settle} from './base/realGraphTestHarness';
import {allGraphFactories} from './allGraphFactories';
import {ComplexPowerGraph} from './complex/ComplexPowerGraph';
import {EulerCircleGraph} from './complex/EulerCircleGraph';
import SolidsGraph from './solids/SolidsGraph';
import {renderMessage} from '../localization';

beforeAll(installBoardShims);
afterEach(() => { cleanup(); localStorage.clear(); });

type Create = () => BaseGraph<BaseGraphState>;
// Graphs no route or loader mounts yet are listed here so their Preset round trip is covered too.
const unrouted: Array<[string, Create]> = [
    ['complex-power (unrouted)', () => new ComplexPowerGraph() as unknown as BaseGraph<BaseGraphState>],
    ['euler-circle (unrouted)', () => new EulerCircleGraph() as unknown as BaseGraph<BaseGraphState>],
    ['solids (unrouted)', () => new SolidsGraph() as unknown as BaseGraph<BaseGraphState>],
];
const entries: Array<[string, Create]> = [...Object.entries(allGraphFactories), ...unrouted];
/**
 * Moves a graph whose whole state is its Preset data off the mount default, so a round trip that restores the default
 * instead of the data fails. Other graphs run with their mount data.
 */
const changes: Record<string, Record<string, unknown>> = {
    'patch-coons': {linkedCorners: false},
    'complex-power (unrouted)': {n: 3},
    'euler-circle (unrouted)': {degrees: 60},
    'solids (unrouted)': {offset: 1},
};

describe.each(entries)('%s', (id, create) => {
    test('Preset round trip', async () => {
        const {graph} = mountGraph(create());
        const collection = graph.presetCollection();
        if (!collection) return;
        if (changes[id]) act(() => { (graph as unknown as {setState(s: unknown): void}).setState(changes[id]); });
        const preset = graph.exportPreset();
        const data = graph.exportPresetData();
        if (changes[id]) expect(data).not.toEqual(graph.defaultPreset());
        const copy = <T,>(value: T): T => value === undefined ? value : JSON.parse(JSON.stringify(value));
        const checked = collection.check(copy(preset.data));
        const own = collection.checkGraphState?.(preset.graphState);
        expect(own === undefined ? '' : renderMessage(own)).toBe('');
        expect('data' in checked || preset.data === undefined ? '' : renderMessage(checked.rejection)).toBe('');

        const g = graph;
        const notice = () => {
            const value = (g as unknown as {presetNoticeValue?: unknown}).presetNoticeValue;
            return value === undefined ? '' : JSON.stringify(value);
        };

        // The real selection path (a curve graph's plain importPreset adds curves, selection replaces the scene).
        act(() => { g.saveCurrentPreset('full'); });
        expect(notice()).toBe('');
        localStorage.setItem(`bezeg-2.0:preset-${collection.key}`, JSON.stringify({data: [
            {...copy(preset), id: 'full'},
            {id: 'bare', ...(preset.data === undefined ? {} : {data: copy(preset.data)})},
        ]}));
        for (const id of ['full', 'bare']) {
            await settle(() => g.selectPreset(id));
            expect(notice(), id).toBe('');
            expect(g.selectedPresetId, id).toBe(id);
            expect(g.exportPresetData(), id).toEqual(data);
            await settle(() => g.reset());
            expect(g.exportPresetData(), `${id} after Reset`).toEqual(data);
        }

    });
});
