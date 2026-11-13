// R5 composition and deletion test of docs/specs/lesson-authoring-architecture.md for the probability family (task 06 batch 13).
// The five collections were the last entries of the shared function map; they stay in `functions/functionPresetCollections.ts` as
// `probabilityFamilyPresetCollections`, and the family list orders them. No unregistered function collection remains.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../demonstrations';
import {chapterOwnerRows} from '../../learning/content/chapterOwnedLessons';
import {getGuidedLessonOwners, guidedLessonOwners} from '../../learning/chapter/guidedLessonOwnership';
import {presetCollections} from '../base/presets/PresetImport';
import {checkRegistrations} from '../registrationIntegrity';
import {probabilityCollections} from './collections';
import * as functionCollections from '../functions/functionPresetCollections';
import {probabilityCollectionKeys, probabilityDemonstrationRows} from './registration';
import {probabilityGraphLoaders} from './runtime';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');
const expectedIds = ['prob-density', 'prob-binomial-normal', 'prob-clt', 'prob-summary', 'prob-correlation'] as const;

const centralFiles = [
    'src/demonstrations.ts', 'src/graphs/graphLoaders.ts', 'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts', 'src/learning/chapter/guidedLessonOwnership.ts', 'scripts/probe-demonstration-clip-routes.cjs',
] as const;
const escape = (text: string) => text.replace(/[/-]/g, '\\$&');
const idPatterns = probabilityDemonstrationRows.map(row => ({
    identity: row.id,
    pattern: new RegExp(`\\{id: '${escape(row.id)}'|^\\s*['"]?${escape(row.id)}['"]?:\\s*(\\{chapterId|\\(\\) =>)`, 'm'),
}));
const quotedPatterns = probabilityDemonstrationRows.map(row => row.path)
    .map(identity => ({identity, pattern: new RegExp(`['"\`]${escape(identity)}['"\`]`)}));

describe('R5 deletion test: no central probability rows', () => {
    test.each(centralFiles)('%s names no probability Demonstration id or path', file => {
        const source = read(file).split('\n').filter(line => !/caption:/.test(line)).join('\n');
        const derived = [...idPatterns, ...quotedPatterns].filter(({pattern}) => pattern.test(source)).map(({identity}) => identity);
        expect({file, derived}).toEqual({file, derived: []});
    });

    test('the family owns five rows in catalog order, one loader each and five collections with their keys', () => {
        expect(probabilityDemonstrationRows.map(row => row.id)).toEqual(expectedIds);
        expect(Object.keys(probabilityGraphLoaders)).toEqual(expectedIds);
        expect(probabilityCollections.map(collection => collection.key)).toEqual(expectedIds.map(id => probabilityCollectionKeys[id]));
        expect(Object.entries(probabilityCollectionKeys).filter(([id, key]) => id !== key)).toEqual([]);
    });

    test('the family map holds exactly the five entries and the full map is the union of the three families; no unregistered map remains', () => {
        expect(Object.keys(functionCollections.probabilityFamilyPresetCollections)).toEqual(expectedIds);
        expect(Object.hasOwn(functionCollections, 'unregisteredFunctionPresetCollections')).toBe(false);
        expect(Object.keys(functionCollections.functionPresetCollections)).toHaveLength(35);
        expect(probabilityCollections).toEqual(Object.values(functionCollections.probabilityFamilyPresetCollections));
    });

    test('the family passes integrity', () => {
        const none = {rows: [], factoryIds: [], collections: []};
        expect(checkRegistrations([{
            family: 'probability', rows: probabilityDemonstrationRows, loaderIds: Object.keys(probabilityGraphLoaders),
            collectionKeys: probabilityCollectionKeys, collections: probabilityCollections,
        }], none)).toEqual([]);
    });

    test('every collection is importable exactly once under its key', () => {
        const keys = presetCollections.map(collection => collection.key);
        for (const key of Object.values(probabilityCollectionKeys)) expect(keys.filter(item => item === key)).toEqual([key]);
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.probabilityDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/probability\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.probabilityGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/probability\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.probabilityCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/probability\/collections["']/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /probabilityDemonstrationRows/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/probability\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });
});

describe('owners (R-owners)', () => {
    const oldOwners = {
        'prob-density': {chapterId: 'probability', sectionId: 'density'},
        'prob-binomial-normal': {chapterId: 'probability', sectionId: 'binomial-normal'},
        'prob-clt': {chapterId: 'probability', sectionId: 'clt'},
        'prob-summary': {chapterId: 'probability', sectionId: 'summary'},
        'prob-correlation': {chapterId: 'probability', sectionId: 'correlation'},
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
    test('the probability catalog family lists the five first, then the simulation row of the random family', () => {
        const {families} = getDemonstrationCatalog();
        const ids = families.find(family => family.id === '/bezeg-2.0/probability')!.demonstrations.map(entry => entry.id);
        expect(ids).toEqual([...expectedIds, 'prob-simulation']);
    });
});
