// R5 composition and deletion test of docs/specs/lesson-authoring-architecture.md for the patches family (task 06 batch 10).
// The six tensor/triangular collections were already family-owned (`patchPresetCollections`, kept for its graph importers); the Coons
// collection was standalone. The surface view flag is carried unchanged on every row.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../demonstrations';
import {chapterOwnerRows} from '../../learning/content/chapterOwnedLessons';
import {getGuidedLessonOwners, guidedLessonOwners} from '../../learning/chapter/guidedLessonOwnership';
import {patchPresetCollections} from './patchPresetCollections';
import {presetCollections} from '../base/presets/PresetImport';
import {checkRegistrations} from '../registrationIntegrity';
import {patchesCollections} from './collections';
import {patchesCollectionKeys, patchesDemonstrationRows} from './registration';
import {patchesGraphLoaders} from './runtime';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');
const expectedIds = ['patch-tensor', 'patch-decasteljau', 'patch-derivatives', 'patch-subdivision', 'patch-joins', 'patch-triangular', 'patch-coons'] as const;

const centralFiles = [
    'src/demonstrations.ts', 'src/graphs/graphLoaders.ts', 'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts', 'src/learning/chapter/guidedLessonOwnership.ts', 'scripts/probe-demonstration-clip-routes.cjs',
] as const;
const escape = (text: string) => text.replace(/[/-]/g, '\\$&');
const idPatterns = patchesDemonstrationRows.map(row => ({
    identity: row.id,
    pattern: new RegExp(`\\{id: '${escape(row.id)}'|^\\s*['"]?${escape(row.id)}['"]?:\\s*(\\{chapterId|\\(\\) =>)`, 'm'),
}));
const quotedPatterns = [...patchesDemonstrationRows.map(row => row.path), ...Object.values(patchesCollectionKeys)]
    .map(identity => ({identity, pattern: new RegExp(`['"\`]${escape(identity)}['"\`]`)}));

describe('R5 deletion test: no central patches rows', () => {
    test.each(centralFiles)('%s names no patches Demonstration id, path or collection key', file => {
        const source = read(file).split('\n').filter(line => !/caption:/.test(line)).join('\n');
        const derived = [...idPatterns, ...quotedPatterns].filter(({pattern}) => pattern.test(source)).map(({identity}) => identity);
        expect({file, derived}).toEqual({file, derived: []});
    });

    test('the family owns seven rows in catalog order, one loader each and seven collections with their keys', () => {
        expect(patchesDemonstrationRows.map(row => row.id)).toEqual(expectedIds);
        expect(Object.keys(patchesGraphLoaders)).toEqual(expectedIds);
        expect(patchesCollections.map(collection => collection.key)).toEqual(expectedIds.map(id => patchesCollectionKeys[id]));
        expect(patchesCollectionKeys).toEqual(Object.fromEntries(expectedIds.map(id => [id, id])));
    });

    test('patchPresetCollections holds exactly the six tensor and triangular entries, and the family list adds the Coons collection', () => {
        expect(Object.keys(patchPresetCollections).sort()).toEqual(expectedIds.filter(id => id !== 'patch-coons').sort());
        expect(patchesCollections.slice(0, 6)).toEqual(expectedIds.slice(0, 6).map(id => patchPresetCollections[id as keyof typeof patchPresetCollections]));
    });

    test('the family passes integrity', () => {
        const none = {rows: [], factoryIds: [], collections: []};
        expect(checkRegistrations([{
            family: 'patches', rows: patchesDemonstrationRows, loaderIds: Object.keys(patchesGraphLoaders),
            collectionKeys: patchesCollectionKeys, collections: patchesCollections,
        }], none)).toEqual([]);
    });

    test('every collection is still importable under its key', () => {
        const keys = presetCollections.map(collection => collection.key);
        for (const key of Object.values(patchesCollectionKeys)) expect(keys.filter(item => item === key)).toEqual([key]);
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.patchesDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/patches\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.patchesGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/patches\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.patchesCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/patches\/collections["']/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /patchesDemonstrationRows/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/patches\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });
});

describe('owners (R-owners)', () => {
    const oldOwners = {
        'patch-tensor': {chapterId: 'bezier-patches', sectionId: 'curve-to-patch'},
        'patch-decasteljau': {chapterId: 'bezier-patches', sectionId: 'tensor-decasteljau'},
        'patch-derivatives': {chapterId: 'bezier-patches', sectionId: 'tensor-derivatives'},
        'patch-subdivision': {chapterId: 'bezier-patches', sectionId: 'tensor-subdivision'},
        'patch-joins': {chapterId: 'bezier-patches', sectionId: 'tensor-joins'},
        'patch-triangular': {chapterId: 'bezier-patches', sectionId: 'triangular-patches'},
        'patch-coons': {chapterId: 'advanced-bezier', sectionId: 'patch-coons'},
    } as const;

    test.each(expectedIds)('%s: the primary owner is derived from the chapter-owned section, not a central row', id => {
        expect(Object.hasOwn(guidedLessonOwners, id)).toBe(false);
        const row = chapterOwnerRows().find(item => item.demonstrationId === id)!;
        expect(row).toBeDefined();
        expect(getGuidedLessonOwners(id)[0]).toEqual({chapterId: row.chapterId, sectionId: row.sectionId});
    });

    test('the derived primary owners are the ones the central table had', () => {
        expect(Object.fromEntries(expectedIds.map(id => [id, getGuidedLessonOwners(id)[0]]))).toEqual(oldOwners);
    });
});

describe('placement', () => {
    test('the patches catalog family lists its seven entries in order, with the same neighbour families', () => {
        const {families} = getDemonstrationCatalog();
        expect(families.find(family => family.id === '/bezeg-2.0/patches')!.demonstrations.map(entry => entry.id)).toEqual(expectedIds);
        const order = families.map(family => family.id);
        const at = order.indexOf('/bezeg-2.0/patches');
        expect(order.slice(at - 1, at + 2)).toEqual(['/bezeg-2.0/bspline', '/bezeg-2.0/patches', '/bezeg-2.0/functions']);
    });

    test('every row keeps the surface view', () => {
        expect(patchesDemonstrationRows.map(row => row.view)).toEqual(expectedIds.map(() => 'surface'));
        expect(getDemonstrationCatalog().demonstrations.filter(entry => entry.view === 'surface').map(entry => entry.id)).toEqual([...expectedIds, 'solids']);
    });
});
