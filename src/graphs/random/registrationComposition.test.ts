// R5 composition of docs/specs/lesson-authoring-architecture.md for the simulation row: every root references the
// family export, so deleting registration.ts, collections.ts and runtime.ts removes the family (ADR 0059). The row is
// `lesson: false` until families-prep F3, so no lesson ownership or chapter script names it.
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

    test('the legacy constructor table excludes registered ids by type, not by a per-id list', () => {
        const source = read('src/graphs/graphFactories.ts');
        expect(source).toMatch(/Exclude<DemonstrationId, RegisteredDemonstrationId>/);
        for (const row of randomDemonstrationRows) expect(source).not.toContain(`'${row.id}'`);
    });

    test('the eager test adapter derives from the registered loaders', () => {
        expect(read('src/graphs/allGraphFactories.ts')).toMatch(/Object\.entries\(registeredGraphLoaders\)/);
    });

    test('the family has rows, each row opts out of lessons and each has its own collection key', () => {
        expect(randomDemonstrationRows.length).toBe(1);
        expect(randomDemonstrationRows.every(row => row.lesson === false)).toBe(true);
        expect(new Set(Object.values(randomCollectionKeys)).size).toBe(randomDemonstrationRows.length);
    });
});
