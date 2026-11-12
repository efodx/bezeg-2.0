// R5 composition of docs/specs/lesson-authoring-architecture.md for the combinatorics family: every root references the family
// export, so deleting registration.ts, collections.ts and runtime.ts removes the family (ADR 0059). The rows have lessons (families-prep F3 batch A), so
// the combinatorics chapter owns them.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {combinatoricsCollectionKeys, combinatoricsDemonstrationRows} from './registration';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');

describe('R5 composition: every root references the combinatorics family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.combinatoricsDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/combinatorics\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.combinatoricsGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/combinatorics\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.combinatoricsCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/combinatorics\/collections["']/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/combinatorics\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });

    test('the legacy constructor table excludes registered ids by type, not by a per-id list', () => {
        const source = read('src/graphs/graphFactories.ts');
        expect(source).toMatch(/Exclude<DemonstrationId, RegisteredDemonstrationId>/);
        for (const row of combinatoricsDemonstrationRows) expect(source).not.toContain(`'${row.id}'`);
    });

    test('the eager test adapter derives from the registered loaders', () => {
        expect(read('src/graphs/allGraphFactories.ts')).toMatch(/Object\.entries\(registeredGraphLoaders\)/);
    });

    test('the family has rows, no row opts out of lessons and each has its own collection key', () => {
        expect(combinatoricsDemonstrationRows.length).toBe(2);
        expect(combinatoricsDemonstrationRows.filter(row => 'lesson' in row && row.lesson === false)).toEqual([]);
        expect(new Set(Object.values(combinatoricsCollectionKeys)).size).toBe(combinatoricsDemonstrationRows.length);
    });
});
