import {describe, expect, test} from 'vitest';
import {presetCollections} from './base/presets/PresetImport';
import type BaseGraph from './base/BaseGraph';
import type {BaseGraphState} from './base/BaseGraph';
import {graphFactories} from './graphFactories';
import {registeredGraphLoaders} from './graphLoaders';

/**
 * A graph must save and load with the collection the file importer checks by. Identity (not behavioural equality) is
 * asserted: every collection is built once by its family module and the graph returns that instance, so a rival
 * definition for the same storage key inside a graph would fail here even if it happened to check alike today.
 * Graphs are constructed without a board (constructors only), as the registered factories and loaders do.
 */
const canonicalByKey = new Map(presetCollections.map(collection => [collection.key, collection]));

async function allGraphs() {
    const graphs: [string, BaseGraph<BaseGraphState>][] = Object.entries<() => BaseGraph<BaseGraphState>>(graphFactories).map(([id, create]) => [id, create()]);
    for (const [id, load] of Object.entries(registeredGraphLoaders)) graphs.push([id, (await load())()]);
    return graphs;
}

describe('the collection a graph saves and loads with is the registered one', () => {
    test('every graph with a collection uses a registered key and the registered instance', async () => {
        const graphs = await allGraphs();
        expect(graphs.length).toBeGreaterThan(50);
        const problems: string[] = [];
        let withCollection = 0;
        for (const [id, graph] of graphs) {
            const collection = graph.presetCollection();
            if (!collection) continue;
            withCollection++;
            const registered = canonicalByKey.get(collection.key);
            if (!registered) problems.push(`${id}: key "${collection.key}" is not in presetCollections.`);
            else if (registered !== collection) problems.push(`${id}: collection "${collection.key}" is a different instance than the registered one.`);
        }
        expect(withCollection).toBeGreaterThan(50);
        expect(problems).toEqual([]);
    });
});
