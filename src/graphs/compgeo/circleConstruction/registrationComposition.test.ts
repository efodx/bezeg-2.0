// R5 composition of docs/specs/lesson-authoring-architecture.md for the circle-construction family: every root references the
// family export, so deleting registration.ts, collections.ts and runtime.ts removes the family (ADR 0059). The row is
// `lesson: false` until families-prep F3, so no lesson ownership or chapter script names it.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {circleConstructionCollectionKeys, circleConstructionDemonstrationRows} from './registration';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');

describe('R5 composition: every root references the circle-construction family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.circleConstructionDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/compgeo\/circleConstruction\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.circleConstructionGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/compgeo\/circleConstruction\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.circleConstructionCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/compgeo\/circleConstruction\/collections["']/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/compgeo\/circleConstruction\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });

    test('the legacy constructor table excludes registered ids by type, not by a per-id list', () => {
        const source = read('src/graphs/graphFactories.ts');
        expect(source).toMatch(/Exclude<DemonstrationId, RegisteredDemonstrationId>/);
        for (const row of circleConstructionDemonstrationRows) expect(source).not.toContain(`'${row.id}'`);
    });

    test('the eager test adapter derives from the registered loaders', () => {
        expect(read('src/graphs/allGraphFactories.ts')).toMatch(/Object\.entries\(registeredGraphLoaders\)/);
    });

    test('the family has rows, each row opts out of lessons and each has its own collection key', () => {
        expect(circleConstructionDemonstrationRows.length).toBe(1);
        expect(circleConstructionDemonstrationRows.every(row => row.lesson === false)).toBe(true);
        expect(new Set(Object.values(circleConstructionCollectionKeys)).size).toBe(circleConstructionDemonstrationRows.length);
    });
});
