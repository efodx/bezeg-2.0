// R5 composition of docs/specs/lesson-authoring-architecture.md for the solids row: every root references the
// family export, so deleting registration.ts, collections.ts and runtime.ts removes the family (ADR 0059). The row has
// its guided lessons (SV1, SV2), chapter-owned by the solids chapter.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../demonstrations';
import {solidsCollections} from './collections';
import {solidsCollectionKeys, solidsDemonstrationRows} from './registration';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');

describe('R5 composition: every root references the solids row export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.solidsDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/solids\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.solidsGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/solids\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.solidsCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/solids\/collections["']/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/solids\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });

    test('the legacy constructor table excludes registered ids by type, not by a per-id list', () => {
        const source = read('src/graphs/graphFactories.ts');
        expect(source).toMatch(/Exclude<DemonstrationId, RegisteredDemonstrationId>/);
        for (const row of solidsDemonstrationRows) expect(source).not.toContain(`'${row.id}'`);
    });

    test('the eager test adapter derives from the registered loaders', () => {
        expect(read('src/graphs/allGraphFactories.ts')).toMatch(/Object\.entries\(registeredGraphLoaders\)/);
    });

    test('the family has rows, no row opts out of lessons and each has its own collection key', () => {
        expect(solidsDemonstrationRows.length).toBe(1);
        expect(solidsDemonstrationRows.filter(row => 'lesson' in row && row.lesson === false)).toEqual([]);
        expect(solidsCollections.map(collection => collection.key).sort()).toEqual(solidsDemonstrationRows.map(row => row.id).sort());
        expect(new Set(Object.values(solidsCollectionKeys)).size).toBe(solidsDemonstrationRows.length);
    });
});

test('placement: the solids row follows the logistic-map row in the analysis family and is an orbited view', () => {
    const entries = getDemonstrationCatalog().demonstrations.filter(entry => entry.family === 'analysis');
    const ids = entries.map(entry => entry.id);
    const at = ids.indexOf('logistic-map');
    expect(at).toBeGreaterThan(0);
    expect(ids.slice(at, at + 4)).toEqual(['logistic-map', 'solids', 'contour-map', 'linear-program']);
    expect(entries[at + 1].view).toBe('surface');
    expect(entries[at + 2].view).toBe('board');
});
