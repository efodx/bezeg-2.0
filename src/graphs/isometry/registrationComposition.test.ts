// R5 composition of docs/specs/lesson-authoring-architecture.md for the isometry family: every root references the family
// export, so deleting registration.ts, collections.ts and runtime.ts removes the family (ADR 0059). The row has its guided lessons
// (families-prep F3), owned by the isometries chapter.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {isometryCollectionKeys, isometryDemonstrationRows} from './registration';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');

describe('R5 composition: every root references the isometry family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.isometryDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/isometry\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.isometryGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/isometry\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.isometryCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/isometry\/collections["']/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/isometry\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });


    test('the eager test adapter derives from the registered loaders', () => {
        expect(read('src/graphs/allGraphFactories.ts')).toMatch(/Object\.entries\(registeredGraphLoaders\)/);
    });

    test('the family has rows, no row opts out of lessons and each has its own collection key', () => {
        expect(isometryDemonstrationRows.length).toBe(1);
        expect(isometryDemonstrationRows.filter(row => 'lesson' in row && row.lesson === false)).toEqual([]);
        expect(new Set(Object.values(isometryCollectionKeys)).size).toBe(isometryDemonstrationRows.length);
    });
});
