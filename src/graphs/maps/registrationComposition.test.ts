// R5 composition and deletion test of docs/specs/lesson-authoring-architecture.md for the maps family (task 06 batch 14).
// The three collections are reused unchanged; the owners of all three derive from their chapter-owned sections.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../demonstrations';
import {chapterOwnerRows} from '../../learning/content/chapterOwnedLessons';
import {getGuidedLessonOwners, guidedLessonOwners} from '../../learning/chapter/guidedLessonOwnership';
import {presetCollections} from '../base/presets/PresetImport';
import {checkRegistrations} from '../registrationIntegrity';
import {mapsCollections} from './collections';
import {mapsCollectionKeys, mapsDemonstrationRows} from './registration';
import {mapsGraphLoaders} from './runtime';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');
const expectedIds = ['linear-map', 'complex-reciprocal', 'complex-roots'] as const;

const centralFiles = [
    'src/demonstrations.ts', 'src/graphs/graphLoaders.ts', 'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts', 'src/learning/chapter/guidedLessonOwnership.ts', 'scripts/probe-demonstration-clip-routes.cjs',
] as const;
const escape = (text: string) => text.replace(/[/-]/g, '\\$&');
const idPatterns = mapsDemonstrationRows.map(row => ({
    identity: row.id,
    pattern: new RegExp(`\\{id: '${escape(row.id)}'|^\\s*['"]?${escape(row.id)}['"]?:\\s*(\\{chapterId|\\(\\) =>)`, 'm'),
}));
const quotedPatterns = mapsDemonstrationRows.map(row => row.path)
    .map(identity => ({identity, pattern: new RegExp(`['"\`]${escape(identity)}['"\`]`)}));

describe('R5 deletion test: no central maps rows', () => {
    test.each(centralFiles)('%s names no maps Demonstration id or path', file => {
        const source = read(file).split('\n').filter(line => !/caption:/.test(line)).join('\n');
        const derived = [...idPatterns, ...quotedPatterns].filter(({pattern}) => pattern.test(source)).map(({identity}) => identity);
        expect({file, derived}).toEqual({file, derived: []});
    });

    test('the family owns three rows in catalog order, one loader each and three collections with their keys', () => {
        expect(mapsDemonstrationRows.map(row => row.id)).toEqual(expectedIds);
        expect(Object.keys(mapsGraphLoaders)).toEqual(expectedIds);
        expect(mapsCollections.map(collection => collection.key)).toEqual(expectedIds.map(id => mapsCollectionKeys[id]));
        expect(Object.entries(mapsCollectionKeys).filter(([id, key]) => id !== key)).toEqual([]);
    });

    test('the family passes integrity', () => {
        const none = {rows: [], factoryIds: [], collections: []};
        expect(checkRegistrations([{
            family: 'maps', rows: mapsDemonstrationRows, loaderIds: Object.keys(mapsGraphLoaders),
            collectionKeys: mapsCollectionKeys, collections: mapsCollections,
        }], none)).toEqual([]);
    });

    test('every collection is importable exactly once under its key', () => {
        const keys = presetCollections.map(collection => collection.key);
        for (const key of Object.values(mapsCollectionKeys)) expect(keys.filter(item => item === key)).toEqual([key]);
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.mapsDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/maps\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.mapsGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/maps\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.mapsCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/maps\/collections["']/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /mapsDemonstrationRows/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/maps\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });
});

describe('owners (R-owners)', () => {
    const oldOwners = {
        'linear-map': {chapterId: 'linear-maps', sectionId: 'matrix-and-image'},
        'complex-reciprocal': {chapterId: 'complex-maps', sectionId: 'reciprocal-inversion'},
        'complex-roots': {chapterId: 'complex-maps', sectionId: 'roots'},
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
    test('the maps catalog family lists the three first, then the complex batch D rows, then isometries', () => {
        const {families} = getDemonstrationCatalog();
        const ids = families.find(family => family.id === 'maps')!.demonstrations.map(entry => entry.id);
        expect(ids).toEqual(['linear-map', 'complex-reciprocal', 'complex-roots', 'complex-power', 'complex-euler', 'isometries']);
    });
});
