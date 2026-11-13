// R5 composition of docs/specs/lesson-authoring-architecture.md for the simulation row: every root references the
// family export, so deleting registration.ts, collections.ts and runtime.ts removes the family (ADR 0059). The row is
// The simulation row has its guided lessons (RS1, RS2), owned by the randomness chapter (families-prep F3, batch A).
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {randomCollectionKeys, randomDemonstrationRows} from './registration';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');

describe('R5 composition: every root references the simulation row export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.randomDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/random\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.randomGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/random\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.randomCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/random\/collections["']/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/random\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });


    test('the eager test adapter derives from the registered loaders', () => {
        expect(read('src/graphs/allGraphFactories.ts')).toMatch(/Object\.entries\(registeredGraphLoaders\)/);
    });

    test('the family has rows, no row opts out of lessons and each has its own collection key', () => {
        expect(randomDemonstrationRows.length).toBe(1);
        expect(randomDemonstrationRows.filter(row => 'lesson' in row && row.lesson === false)).toEqual([]);
        expect(new Set(Object.values(randomCollectionKeys)).size).toBe(randomDemonstrationRows.length);
    });
});
