// R5 composition and deletion test of docs/specs/lesson-authoring-architecture.md for the functions family (task 06 batch 11).
// The fourteen collections were entries of the shared function map; they stay in `functionPresetCollections.ts` as
// `functionsFamilyPresetCollections`, and the family list orders them. The Analysis and probability entries remain in the map.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../demonstrations';
import {chapterOwnerRows} from '../../learning/content/chapterOwnedLessons';
import {getGuidedLessonOwners, guidedLessonOwners} from '../../learning/chapter/guidedLessonOwnership';
import {presetCollections} from '../base/presets/PresetImport';
import {checkRegistrations} from '../registrationIntegrity';
import {functionsCollections} from './collections';
import {functionPresetCollections, functionsFamilyPresetCollections, unregisteredFunctionPresetCollections} from './functionPresetCollections';
import {functionsCollectionKeys, functionsDemonstrationRows, functionsPrimaryOwners} from './registration';
import {functionsGraphLoaders} from './runtime';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');
const expectedIds = [
    'linear-function', 'exponential-function', 'trigonometric-functions', 'function-transformation', 'function-inverse', 'polynomial-zeros',
    'rational-function', 'geometric-series', 'conic-focal', 'continuity', 'derivative', 'definite-integral', 'area-between-curves', 'arc-length',
] as const;

const centralFiles = [
    'src/demonstrations.ts', 'src/graphs/graphFactories.ts', 'src/graphs/graphLoaders.ts', 'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts', 'src/learning/chapter/guidedLessonOwnership.ts', 'scripts/probe-demonstration-clip-routes.cjs',
] as const;
const escape = (text: string) => text.replace(/[/-]/g, '\\$&');
const idPatterns = functionsDemonstrationRows.map(row => ({
    identity: row.id,
    pattern: new RegExp(`\\{id: '${escape(row.id)}'|^\\s*['"]?${escape(row.id)}['"]?:\\s*(\\{chapterId|\\(\\) =>)`, 'm'),
}));
const quotedPatterns = [...functionsDemonstrationRows.map(row => row.path), ...Object.values(functionsCollectionKeys)]
    .map(identity => ({identity, pattern: new RegExp(`['"\`]${escape(identity)}['"\`]`)}));

describe('R5 deletion test: no central functions rows', () => {
    test.each(centralFiles)('%s names no functions Demonstration id, path or collection key', file => {
        const source = read(file).split('\n').filter(line => !/caption:/.test(line)).join('\n');
        const derived = [...idPatterns, ...quotedPatterns].filter(({pattern}) => pattern.test(source)).map(({identity}) => identity);
        expect({file, derived}).toEqual({file, derived: []});
    });

    test('the family owns fourteen rows in catalog order, one loader each and fourteen collections with their keys', () => {
        expect(functionsDemonstrationRows.map(row => row.id)).toEqual(expectedIds);
        expect(Object.keys(functionsGraphLoaders)).toEqual(expectedIds);
        expect(functionsCollections.map(collection => collection.key)).toEqual(expectedIds.map(id => functionsCollectionKeys[id]));
        expect(functionsCollectionKeys['trigonometric-functions']).toBe('trigonometric-function');
        expect(functionsCollectionKeys.continuity).toBe('piecewise-continuity');
        expect(Object.fromEntries(Object.entries(functionsCollectionKeys).filter(([id, key]) => id !== key)))
            .toEqual({'trigonometric-functions': 'trigonometric-function', continuity: 'piecewise-continuity'});
    });

    test('the family map holds exactly the fourteen entries; the other twenty-one stay unregistered and the full map is their union', () => {
        expect(Object.keys(functionsFamilyPresetCollections)).toEqual(expectedIds);
        expect(Object.keys(unregisteredFunctionPresetCollections)).toHaveLength(21);
        expect(Object.keys(unregisteredFunctionPresetCollections).filter(id => (expectedIds as readonly string[]).includes(id))).toEqual([]);
        expect(Object.keys(functionPresetCollections)).toHaveLength(35);
        expect(functionsCollections).toEqual(expectedIds.map(id => functionsFamilyPresetCollections[id]));
    });

    test('the family passes integrity', () => {
        const none = {rows: [], factoryIds: [], collections: []};
        expect(checkRegistrations([{
            family: 'functions', rows: functionsDemonstrationRows, loaderIds: Object.keys(functionsGraphLoaders),
            collectionKeys: functionsCollectionKeys, collections: functionsCollections,
        }], none)).toEqual([]);
    });

    test('every collection is importable exactly once under its key, and the unregistered entries are still there', () => {
        const keys = presetCollections.map(collection => collection.key);
        for (const key of Object.values(functionsCollectionKeys)) expect(keys.filter(item => item === key)).toEqual([key]);
        for (const collection of Object.values(unregisteredFunctionPresetCollections)) expect(keys.filter(item => item === collection.key)).toEqual([collection.key]);
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.functionsDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/functions\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.functionsGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/functions\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.functionsCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/functions\/collections["']/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.Object\.values\(unregisteredFunctionPresetCollections\)/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /functionsPrimaryOwners/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /functionsDemonstrationRows/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/functions\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });
});

describe('owners (R-owners)', () => {
    const oldOwners = {
        'linear-function': {chapterId: 'functions-and-calculus', sectionId: 'function-rules'},
        'exponential-function': {chapterId: 'functions-and-calculus', sectionId: 'function-rules'},
        'trigonometric-functions': {chapterId: 'functions-and-calculus', sectionId: 'function-rules'},
        'function-transformation': {chapterId: 'school-function-graphs', sectionId: 'function-transformation'},
        'function-inverse': {chapterId: 'school-function-graphs', sectionId: 'function-inverse'},
        'polynomial-zeros': {chapterId: 'school-function-graphs', sectionId: 'polynomial-zeros'},
        'rational-function': {chapterId: 'school-function-graphs', sectionId: 'rational-function'},
        'geometric-series': {chapterId: 'school-function-graphs', sectionId: 'geometric-series'},
        'conic-focal': {chapterId: 'school-function-graphs', sectionId: 'conic-focal'},
        continuity: {chapterId: 'functions-and-calculus', sectionId: 'continuity'},
        derivative: {chapterId: 'functions-and-calculus', sectionId: 'derivatives'},
        'definite-integral': {chapterId: 'functions-and-calculus', sectionId: 'integrals'},
        'area-between-curves': {chapterId: 'functions-and-calculus', sectionId: 'applications'},
        'arc-length': {chapterId: 'functions-and-calculus', sectionId: 'applications'},
    } as const;
    const derivedIds = expectedIds.filter(id => !Object.hasOwn(functionsPrimaryOwners, id));

    test('eight owners are explicit family metadata and six are derived', () => {
        expect(Object.keys(functionsPrimaryOwners)).toHaveLength(8);
        expect(derivedIds).toEqual(['function-transformation', 'function-inverse', 'polynomial-zeros', 'rational-function', 'geometric-series', 'conic-focal']);
    });

    test.each(expectedIds)('%s: no central owner row remains', id => {
        expect(Object.hasOwn(guidedLessonOwners, id)).toBe(false);
    });

    test.each(derivedIds)('%s: the primary owner is derived from the chapter-owned section', id => {
        const row = chapterOwnerRows().find(item => item.demonstrationId === id)!;
        expect(row).toBeDefined();
        expect(getGuidedLessonOwners(id)[0]).toEqual({chapterId: row.chapterId, sectionId: row.sectionId});
    });

    test('the primary owners are the ones the central table had', () => {
        expect(Object.fromEntries(expectedIds.map(id => [id, getGuidedLessonOwners(id)[0]]))).toEqual(oldOwners);
    });
});

describe('placement', () => {
    test('the functions catalog family lists the fourteen first, then the other registered rows in their old order', () => {
        const {families} = getDemonstrationCatalog();
        const ids = families.find(family => family.id === '/bezeg-2.0/functions')!.demonstrations.map(entry => entry.id);
        expect(ids.slice(0, 14)).toEqual(expectedIds);
        expect(ids.slice(14)).toEqual(['unit-circle', 'waves']);
    });
});
