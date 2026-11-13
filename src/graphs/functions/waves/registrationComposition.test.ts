// R5 composition of docs/specs/lesson-authoring-architecture.md for the waves row: every root references the
// family export, so deleting registration.ts, collections.ts and runtime.ts removes the family (ADR 0059). The row is
// lessonful (families-prep F3 batch A), so the waves chapter owns the row.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {wavesCollectionKeys, wavesDemonstrationRows} from './registration';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');

describe('R5 composition: every root references the waves row export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.wavesDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/functions\/waves\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.wavesGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/functions\/waves\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.wavesCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/functions\/waves\/collections["']/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/functions\/waves\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });


    test('the eager test adapter derives from the registered loaders', () => {
        expect(read('src/graphs/allGraphFactories.ts')).toMatch(/Object\.entries\(registeredGraphLoaders\)/);
    });

    test('the family has rows, no row opts out of lessons and each has its own collection key', () => {
        expect(wavesDemonstrationRows.length).toBe(1);
        expect(wavesDemonstrationRows.filter(row => 'lesson' in row && row.lesson === false)).toEqual([]);
        expect(new Set(Object.values(wavesCollectionKeys)).size).toBe(wavesDemonstrationRows.length);
    });
});
