// R5 composition and deletion test of docs/specs/lesson-authoring-architecture.md for the curve geometry family (task 06 batch 8).
// Five collections leave the aggregate curve map, which is deleted with its last user; the parametric collection was standalone.
// The `curve-geometry` chapter owns a lesson row per Demonstration, so all six primary owners are derived (R-owners).
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../../demonstrations';
import {chapterOwnerRows} from '../../../learning/content/chapterOwnedLessons';
import {getGuidedLessonOwners, guidedLessonOwners} from '../../../learning/chapter/guidedLessonOwnership';
import {presetCollections} from '../../base/presets/PresetImport';
import {checkRegistrations} from '../../registrationIntegrity';
import {curveGeometryCollections} from './collections';
import {curveGeometryCollectionKeys, curveGeometryDemonstrationRows} from './registration';
import {curveGeometryGraphLoaders} from './runtime';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');
const expectedIds = ['curve-parametric', 'curve-curvature', 'curve-comb', 'curve-evolute', 'curve-offset', 'curve-envelope'] as const;

const centralFiles = [
    'src/demonstrations.ts', 'src/graphs/graphLoaders.ts', 'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts', 'src/learning/chapter/guidedLessonOwnership.ts', 'scripts/probe-demonstration-clip-routes.cjs',
    'src/graphs/curves/curvePresetCollections.ts',
] as const;
const escape = (text: string) => text.replace(/[/-]/g, '\\$&');
const idPatterns = curveGeometryDemonstrationRows.map(row => ({
    identity: row.id,
    pattern: new RegExp(`\\{id: '${escape(row.id)}'|^\\s*['"]?${escape(row.id)}['"]?:\\s*(\\{chapterId|\\(\\) =>)`, 'm'),
}));
const quotedPatterns = [...curveGeometryDemonstrationRows.map(row => row.path), ...Object.values(curveGeometryCollectionKeys)]
    .map(identity => ({identity, pattern: new RegExp(`['"\`]${escape(identity)}['"\`]`)}));

describe('R5 deletion test: no central curve geometry rows', () => {
    test.each(centralFiles)('%s names no curve geometry Demonstration id, path or collection key', file => {
        const source = read(file).split('\n').filter(line => !/caption:/.test(line)).join('\n');
        const derived = [...idPatterns, ...quotedPatterns].filter(({pattern}) => pattern.test(source)).map(({identity}) => identity);
        expect({file, derived}).toEqual({file, derived: []});
    });

    test('the family owns six rows in catalog order, one loader each and six collections with their keys', () => {
        expect(curveGeometryDemonstrationRows.map(row => row.id)).toEqual(expectedIds);
        expect(Object.keys(curveGeometryGraphLoaders)).toEqual(expectedIds);
        expect(curveGeometryCollections.map(collection => collection.key)).toEqual(expectedIds.map(id => curveGeometryCollectionKeys[id]));
        expect(curveGeometryCollectionKeys).toEqual({
            'curve-parametric': 'curve-parametric', 'curve-curvature': 'curve-curvature', 'curve-comb': 'curve-comb',
            'curve-evolute': 'curve-evolute', 'curve-offset': 'curve-offset', 'curve-envelope': 'curve-envelope',
        });
    });

    test('the aggregate curve map is deleted with its last user; the curveCollection helper stays', () => {
        const source = read('src/graphs/curves/curvePresetCollections.ts');
        expect(source).not.toMatch(/export const curvePresetCollections\b/);
        expect(source).toMatch(/export function curveCollection\b/);
        expect(read('src/graphs/base/presets/PresetImport.ts')).not.toMatch(/curvePresetCollections\b/);
    });

    test('the family passes integrity', () => {
        const none = {rows: [], factoryIds: [], collections: []};
        expect(checkRegistrations([{
            family: 'curve-geometry', rows: curveGeometryDemonstrationRows, loaderIds: Object.keys(curveGeometryGraphLoaders),
            collectionKeys: curveGeometryCollectionKeys, collections: curveGeometryCollections,
        }], none)).toEqual([]);
    });

    test('every collection is still importable under its key', () => {
        const keys = presetCollections.map(collection => collection.key);
        for (const key of Object.values(curveGeometryCollectionKeys)) expect(keys.filter(item => item === key)).toEqual([key]);
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.curveGeometryDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/curves\/geometry\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.curveGeometryGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/curves\/geometry\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.curveGeometryCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/curves\/geometry\/collections["']/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /curveGeometryDemonstrationRows/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/curves\/geometry\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });
});

describe('owners (R-owners)', () => {
    test.each(expectedIds)('%s: the primary owner is derived from the chapter-owned section, not a central row', id => {
        expect(Object.hasOwn(guidedLessonOwners, id)).toBe(false);
        const row = chapterOwnerRows().find(item => item.demonstrationId === id)!;
        expect(row).toBeDefined();
        expect(getGuidedLessonOwners(id)[0]).toEqual({chapterId: row.chapterId, sectionId: row.sectionId});
    });

    test('the derived primary owners are the ones the central table had', () => {
        expect(Object.fromEntries(expectedIds.map(id => [id, getGuidedLessonOwners(id)[0]]))).toEqual(
            Object.fromEntries(expectedIds.map(id => [id, {chapterId: 'curve-geometry', sectionId: id}])));
    });
});

describe('placement', () => {
    test('the curve geometry catalog family lists its six entries in order after the other registered entries of the family, with the same neighbour families', () => {
        const {families} = getDemonstrationCatalog();
        expect(families.find(family => family.id === '/bezeg-2.0/curve-geometry')!.demonstrations.map(entry => entry.id).filter(id => (expectedIds as readonly string[]).includes(id))).toEqual(expectedIds);
        const order = families.map(family => family.id);
        const at = order.indexOf('/bezeg-2.0/curve-geometry');
        expect(order.slice(at - 1, at + 2)).toEqual(['/bezeg-2.0/param', '/bezeg-2.0/curve-geometry', '/bezeg-2.0/interpolation']);
    });
});
