// R5 composition of docs/specs/lesson-authoring-architecture.md for the dynamics rows: every root references the
// family export, so deleting registration.ts, collections.ts and runtime.ts removes the family (ADR 0059). The
// phase-portrait row is `lesson: false` until families-prep F3; the logistic-map row is owned by the phase-portraits chapter.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../demonstrations';
import {dynamicsCollectionKeys, dynamicsDemonstrationRows} from './registration';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');

describe('R5 composition: every root references the dynamics rows export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.dynamicsDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/dynamics\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.dynamicsGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/dynamics\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.dynamicsCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/dynamics\/collections["']/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/dynamics\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });


    test('the eager test adapter derives from the registered loaders', () => {
        expect(read('src/graphs/allGraphFactories.ts')).toMatch(/Object\.entries\(registeredGraphLoaders\)/);
    });

    test('the family has rows, only the phase-portrait row opts out of lessons and each has its own collection key', () => {
        expect(dynamicsDemonstrationRows.length).toBe(2);
        expect(dynamicsDemonstrationRows.filter(row => 'lesson' in row && row.lesson === false).map(row => row.id)).toEqual(['phase-portrait']);
        expect(new Set(Object.values(dynamicsCollectionKeys)).size).toBe(dynamicsDemonstrationRows.length);
    });
});

test('placement: the phase-portrait and logistic-map rows follow the recursion rows in the analysis family', () => {
    const ids = getDemonstrationCatalog().demonstrations.filter(entry => entry.family === 'analysis').map(entry => entry.id);
    const at = ids.indexOf('recursion-growth');
    expect(at).toBeGreaterThan(0);
    expect(ids.slice(at, at + 3)).toEqual(['recursion-growth', 'phase-portrait', 'logistic-map']);
});
