// R5 composition of docs/specs/lesson-authoring-architecture.md for the mechanics rows: every root references the
// family export, so deleting registration.ts, collections.ts and runtime.ts removes the family (ADR 0059). The rows are
// `lesson: false` until families-prep F3, so no lesson ownership or chapter script names them.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../demonstrations';
import {mechanicsCollectionKeys, mechanicsDemonstrationRows} from './registration';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');

describe('R5 composition: every root references the mechanics rows export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.mechanicsDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/mechanics\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.mechanicsGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/mechanics\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.mechanicsCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/mechanics\/collections["']/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/mechanics\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });

    test('the legacy constructor table excludes registered ids by type, not by a per-id list', () => {
        const source = read('src/graphs/graphFactories.ts');
        expect(source).toMatch(/Exclude<DemonstrationId, RegisteredDemonstrationId>/);
        for (const row of mechanicsDemonstrationRows) expect(source).not.toContain(`'${row.id}'`);
    });

    test('the eager test adapter derives from the registered loaders', () => {
        expect(read('src/graphs/allGraphFactories.ts')).toMatch(/Object\.entries\(registeredGraphLoaders\)/);
    });

    test('the family has rows, each row opts out of lessons and each has its own collection key', () => {
        expect(mechanicsDemonstrationRows.length).toBe(1);
        expect(mechanicsDemonstrationRows.every(row => row.lesson === false)).toBe(true);
        expect(new Set(Object.values(mechanicsCollectionKeys)).size).toBe(mechanicsDemonstrationRows.length);
    });
});

test('placement: the descent row is the last of the curve-geometry family, after the kinematics row', () => {
    const ids = getDemonstrationCatalog().demonstrations.filter(entry => entry.family === '/bezeg-2.0/curve-geometry').map(entry => entry.id);
    expect(ids.slice(-2)).toEqual(['curve-kinematics', 'mechanics-descent']);
});
