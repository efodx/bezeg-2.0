// R5 composition of docs/specs/lesson-authoring-architecture.md for the level-set rows: every root references the
// family export, so deleting registration.ts, collections.ts and runtime.ts removes the family (ADR 0059). The rows are
// `lesson: false` until families-prep F3, so no lesson ownership or chapter script names them.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../demonstrations';
import {levelSetsCollections} from './collections';
import {levelSetsCollectionKeys, levelSetsDemonstrationRows} from './registration';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');

describe('R5 composition: every root references the level-set rows export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.levelSetsDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/levelsets\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.levelSetsGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/levelsets\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.levelSetsCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/levelsets\/collections["']/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/levelsets\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });

    test('the legacy constructor table excludes registered ids by type, not by a per-id list', () => {
        const source = read('src/graphs/graphFactories.ts');
        expect(source).toMatch(/Exclude<DemonstrationId, RegisteredDemonstrationId>/);
        for (const row of levelSetsDemonstrationRows) expect(source).not.toContain(`'${row.id}'`);
    });

    test('the eager test adapter derives from the registered loaders', () => {
        expect(read('src/graphs/allGraphFactories.ts')).toMatch(/Object\.entries\(registeredGraphLoaders\)/);
    });

    test('the family has rows, each row opts out of lessons and each has its own collection key', () => {
        expect(levelSetsDemonstrationRows.length).toBe(2);
        expect(levelSetsDemonstrationRows.every(row => row.lesson === false)).toBe(true);
        expect(levelSetsCollections.map(collection => collection.key).sort()).toEqual(levelSetsDemonstrationRows.map(row => row.id).sort());
        expect(new Set(Object.values(levelSetsCollectionKeys)).size).toBe(levelSetsDemonstrationRows.length);
    });
});

test('placement: the contour-map and linear-program rows follow the solids row in the analysis family', () => {
    const ids = getDemonstrationCatalog().demonstrations.filter(entry => entry.family === 'analysis').map(entry => entry.id);
    const at = ids.indexOf('solids');
    expect(at).toBeGreaterThan(0);
    expect(ids.slice(at, at + 3)).toEqual(['solids', 'contour-map', 'linear-program']);
});
