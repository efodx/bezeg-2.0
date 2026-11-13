// R5 composition of docs/specs/lesson-authoring-architecture.md for the Batch D rows of the maps family: every root references the
// family export, so deleting registration.ts, collections.ts and runtime.ts removes the rows (ADR 0059). The rows are
// `lesson: false` until families-prep F3, so no lesson ownership or chapter script names them.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../../demonstrations';
import {complexBatchDCollections} from './collections';
import {complexBatchDCollectionKeys, complexBatchDDemonstrationRows} from './registration';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');

describe('R5 composition: every root references the Batch D rows export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.complexBatchDDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/complex\/batchD\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.complexBatchDGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/complex\/batchD\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.complexBatchDCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/complex\/batchD\/collections["']/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/complex\/batchD\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });


    test('the eager test adapter derives from the registered loaders', () => {
        expect(read('src/graphs/allGraphFactories.ts')).toMatch(/Object\.entries\(registeredGraphLoaders\)/);
    });

    test('the family has rows, each row opts out of lessons and each has its own collection key', () => {
        expect(complexBatchDDemonstrationRows.length).toBe(2);
        expect(complexBatchDDemonstrationRows.every(row => row.lesson === false)).toBe(true);
        expect(complexBatchDCollections.map(collection => collection.key).sort()).toEqual(complexBatchDDemonstrationRows.map(row => row.id).sort());
        expect(new Set(Object.values(complexBatchDCollectionKeys)).size).toBe(complexBatchDDemonstrationRows.length);
    });
});

test('placement: the complex-power and complex-euler rows follow the complex-roots row in the maps family', () => {
    const ids = getDemonstrationCatalog().demonstrations.filter(entry => entry.family === 'maps').map(entry => entry.id);
    const at = ids.indexOf('complex-roots');
    expect(at).toBeGreaterThan(0);
    expect(ids.slice(at, at + 3)).toEqual(['complex-roots', 'complex-power', 'complex-euler']);
});
