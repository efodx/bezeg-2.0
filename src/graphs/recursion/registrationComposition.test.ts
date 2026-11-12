// R5 composition of docs/specs/lesson-authoring-architecture.md for the recursion rows: every root references the
// family export, so deleting registration.ts, collections.ts and runtime.ts removes the family (ADR 0059). The rows are
// `lesson: false` for the cobweb row until its lessons land (families-prep F3, tasks 05 and 06); the growth row has its guided lessons (RG1, RG3), owned by the recursion chapter.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {recursionCollectionKeys, recursionDemonstrationRows} from './registration';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');

describe('R5 composition: every root references the recursion rows export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.recursionDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/recursion\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.recursionGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/recursion\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.recursionCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/recursion\/collections["']/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/recursion\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });

    test('the legacy constructor table excludes registered ids by type, not by a per-id list', () => {
        const source = read('src/graphs/graphFactories.ts');
        expect(source).toMatch(/Exclude<DemonstrationId, RegisteredDemonstrationId>/);
        for (const row of recursionDemonstrationRows) expect(source).not.toContain(`'${row.id}'`);
    });

    test('the eager test adapter derives from the registered loaders', () => {
        expect(read('src/graphs/allGraphFactories.ts')).toMatch(/Object\.entries\(registeredGraphLoaders\)/);
    });

    test('the family has rows, only the cobweb row opts out of lessons and each has its own collection key', () => {
        expect(recursionDemonstrationRows.length).toBe(2);
        expect(recursionDemonstrationRows.filter(row => 'lesson' in row && row.lesson === false).map(row => row.id)).toEqual(['recursion-cobweb']);
        expect(new Set(Object.values(recursionCollectionKeys)).size).toBe(recursionDemonstrationRows.length);
    });
});
