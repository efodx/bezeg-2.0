// R5 composition and deletion test of docs/specs/lesson-authoring-architecture.md for the plane-geometry family (task 06 batch 14).
// The five collections are reused unchanged; the owners of all five derive from their chapter-owned sections.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../../demonstrations';
import {chapterOwnerRows} from '../../../learning/content/chapterOwnedLessons';
import {getGuidedLessonOwners, guidedLessonOwners} from '../../../learning/chapter/guidedLessonOwnership';
import {presetCollections} from '../../base/presets/PresetImport';
import {checkRegistrations} from '../../registrationIntegrity';
import {planeGeometryCollections} from './collections';
import {planeGeometryCollectionKeys, planeGeometryDemonstrationRows} from './registration';
import {planeGeometryGraphLoaders} from './runtime';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');
const expectedIds = ['triangle-centres', 'inscribed-angle', 'euler-line', 'simson-line', 'inversion'] as const;

const centralFiles = [
    'src/demonstrations.ts', 'src/graphs/graphFactories.ts', 'src/graphs/graphLoaders.ts', 'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts', 'src/learning/chapter/guidedLessonOwnership.ts', 'scripts/probe-demonstration-clip-routes.cjs',
] as const;
const escape = (text: string) => text.replace(/[/-]/g, '\\$&');
const idPatterns = planeGeometryDemonstrationRows.map(row => ({
    identity: row.id,
    pattern: new RegExp(`\\{id: '${escape(row.id)}'|^\\s*['"]?${escape(row.id)}['"]?:\\s*(\\{chapterId|\\(\\) =>)`, 'm'),
}));
const quotedPatterns = planeGeometryDemonstrationRows.map(row => row.path)
    .map(identity => ({identity, pattern: new RegExp(`['"\`]${escape(identity)}['"\`]`)}));

describe('R5 deletion test: no central plane-geometry rows', () => {
    test.each(centralFiles)('%s names no plane-geometry Demonstration id or path', file => {
        const source = read(file).split('\n').filter(line => !/caption:/.test(line)).join('\n');
        const derived = [...idPatterns, ...quotedPatterns].filter(({pattern}) => pattern.test(source)).map(({identity}) => identity);
        expect({file, derived}).toEqual({file, derived: []});
    });

    test('the family owns five rows in catalog order, one loader each and five collections with their keys', () => {
        expect(planeGeometryDemonstrationRows.map(row => row.id)).toEqual(expectedIds);
        expect(Object.keys(planeGeometryGraphLoaders)).toEqual(expectedIds);
        expect(planeGeometryCollections.map(collection => collection.key)).toEqual(expectedIds.map(id => planeGeometryCollectionKeys[id]));
        // The storage keys are a file contract and differ from the ids; they stay unchanged.
        expect(planeGeometryCollectionKeys).toEqual({
            'triangle-centres': 'compgeo-notable-points',
            'inscribed-angle': 'compgeo-inscribed-angle',
            'euler-line': 'compgeo-euler-line',
            'simson-line': 'compgeo-simson-line',
            'inversion': 'compgeo-inversion',
        });
    });

    test('the family passes integrity', () => {
        const none = {rows: [], factoryIds: [], collections: []};
        expect(checkRegistrations([{
            family: 'plane-geometry', rows: planeGeometryDemonstrationRows, loaderIds: Object.keys(planeGeometryGraphLoaders),
            collectionKeys: planeGeometryCollectionKeys, collections: planeGeometryCollections,
        }], none)).toEqual([]);
    });

    test('every collection is importable exactly once under its key', () => {
        const keys = presetCollections.map(collection => collection.key);
        for (const key of Object.values(planeGeometryCollectionKeys)) expect(keys.filter(item => item === key)).toEqual([key]);
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.planeGeometryDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/compgeo\/planeGeometry\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.planeGeometryGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/compgeo\/planeGeometry\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.planeGeometryCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/compgeo\/planeGeometry\/collections["']/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /planeGeometryDemonstrationRows/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/compgeo\/planeGeometry\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });
});

describe('owners (R-owners)', () => {
    const oldOwners = {
        'triangle-centres': {chapterId: 'triangle-geometry', sectionId: 'notable-points'},
        'inscribed-angle': {chapterId: 'triangle-geometry', sectionId: 'inscribed-angle'},
        'euler-line': {chapterId: 'triangle-geometry', sectionId: 'euler-line'},
        'simson-line': {chapterId: 'triangle-geometry', sectionId: 'simson-line'},
        inversion: {chapterId: 'triangle-geometry', sectionId: 'inversion'},
    } as const;

    test.each(expectedIds)('%s: no central owner row remains', id => {
        expect(Object.hasOwn(guidedLessonOwners, id)).toBe(false);
    });

    test.each(expectedIds)('%s: the primary owner is derived from the chapter-owned section', id => {
        const row = chapterOwnerRows().find(item => item.demonstrationId === id)!;
        expect(row).toBeDefined();
        expect(getGuidedLessonOwners(id)[0]).toEqual({chapterId: row.chapterId, sectionId: row.sectionId});
    });

    test('the primary owners are the ones the central table had', () => {
        expect(Object.fromEntries(expectedIds.map(id => [id, getGuidedLessonOwners(id)[0]]))).toEqual(oldOwners);
    });
});

describe('placement', () => {
    test('the plane-geometry catalog family lists the five first, then the registered rows in definitions order', () => {
        const {families} = getDemonstrationCatalog();
        const ids = families.find(family => family.id === 'plane-geometry')!.demonstrations.map(entry => entry.id);
        expect(ids).toEqual(['triangle-centres', 'inscribed-angle', 'euler-line', 'simson-line', 'inversion', 'triangle-solver', 'line-geometry', 'circle-construction']);
    });
});
