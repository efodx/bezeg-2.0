// R5 composition of docs/specs/lesson-authoring-architecture.md for the kinematics row: every root references the
// family export, so deleting registration.ts, collections.ts and runtime.ts removes the family (ADR 0059). The row has lessons (families-prep F3 batch A), so
// the kinematics chapter owns it.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {kinematicsCollectionKeys, kinematicsDemonstrationRows} from './registration';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');

describe('R5 composition: every root references the kinematics row export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.kinematicsDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/curves\/kinematics\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.kinematicsGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/curves\/kinematics\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.kinematicsCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/curves\/kinematics\/collections["']/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/curves\/kinematics\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });

    test('the legacy constructor table excludes registered ids by type, not by a per-id list', () => {
        const source = read('src/graphs/graphFactories.ts');
        expect(source).toMatch(/Exclude<DemonstrationId, RegisteredDemonstrationId>/);
        for (const row of kinematicsDemonstrationRows) expect(source).not.toContain(`'${row.id}'`);
    });

    test('the eager test adapter derives from the registered loaders', () => {
        expect(read('src/graphs/allGraphFactories.ts')).toMatch(/Object\.entries\(registeredGraphLoaders\)/);
    });

    test('the family has rows, no row opts out of lessons and each has its own collection key', () => {
        expect(kinematicsDemonstrationRows.length).toBe(1);
        expect(kinematicsDemonstrationRows.filter(row => 'lesson' in row && row.lesson === false)).toEqual([]);
        expect(new Set(Object.values(kinematicsCollectionKeys)).size).toBe(kinematicsDemonstrationRows.length);
    });
});
