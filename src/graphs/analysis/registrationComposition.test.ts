// R5 composition and deletion test of docs/specs/lesson-authoring-architecture.md for the analysis family (task 06 batch 12).
// The sixteen collections were entries of the shared function map; they stay in `functions/functionPresetCollections.ts` as
// `analysisFamilyPresetCollections`, and the family list orders them. The probability family took the last five entries in batch 13.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../demonstrations';
import {chapterOwnerRows} from '../../learning/content/chapterOwnedLessons';
import {getGuidedLessonOwners, guidedLessonOwners} from '../../learning/chapter/guidedLessonOwnership';
import {presetCollections} from '../base/presets/PresetImport';
import {checkRegistrations} from '../registrationIntegrity';
import {analysisCollections} from './collections';
import {analysisFamilyPresetCollections, functionPresetCollections, probabilityFamilyPresetCollections} from '../functions/functionPresetCollections';
import {analysisCollectionKeys, analysisDemonstrationRows, analysisPrimaryOwners} from './registration';
import {analysisGraphLoaders} from './runtime';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');
const expectedIds = [
    'bisection', 'root-finding', 'quadrature', 'euler-method', 'mean-value', 'accumulation', 'darboux', 'extrema',
    'convexity', 'taylor', 'sequence', 'uniform-convergence', 'fourier-series', 'fourier-coefficients', 'epicycles', 'fixed-point',
] as const;

const centralFiles = [
    'src/demonstrations.ts', 'src/graphs/graphLoaders.ts', 'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts', 'src/learning/chapter/guidedLessonOwnership.ts', 'scripts/probe-demonstration-clip-routes.cjs',
] as const;
const escape = (text: string) => text.replace(/[/-]/g, '\\$&');
const idPatterns = analysisDemonstrationRows.map(row => ({
    identity: row.id,
    pattern: new RegExp(`\\{id: '${escape(row.id)}'|^\\s*['"]?${escape(row.id)}['"]?:\\s*(\\{chapterId|\\(\\) =>)`, 'm'),
}));
const quotedPatterns = [...analysisDemonstrationRows.map(row => row.path), ...Object.values(analysisCollectionKeys)]
    .map(identity => ({identity, pattern: new RegExp(`['"\`]${escape(identity)}['"\`]`)}));

describe('R5 deletion test: no central analysis rows', () => {
    test.each(centralFiles)('%s names no analysis Demonstration id, path or collection key', file => {
        const source = read(file).split('\n').filter(line => !/caption:/.test(line)).join('\n');
        const derived = [...idPatterns, ...quotedPatterns].filter(({pattern}) => pattern.test(source)).map(({identity}) => identity);
        expect({file, derived}).toEqual({file, derived: []});
    });

    test('the family owns sixteen rows in catalog order, one loader each and sixteen collections with their keys', () => {
        expect(analysisDemonstrationRows.map(row => row.id)).toEqual(expectedIds);
        expect(Object.keys(analysisGraphLoaders)).toEqual(expectedIds);
        expect(analysisCollections.map(collection => collection.key)).toEqual(expectedIds.map(id => analysisCollectionKeys[id]));
        expect(Object.fromEntries(Object.entries(analysisCollectionKeys).filter(([id, key]) => id !== key)))
            .toEqual({'euler-method': 'euler', epicycles: 'epicycle'});
    });

    test('the family map holds exactly the sixteen entries; the full map is the union of the three families', () => {
        expect(Object.keys(analysisFamilyPresetCollections)).toEqual(['bisection', 'root-finding', 'quadrature', 'euler', 'mean-value', 'accumulation', 'darboux', 'extrema', 'convexity', 'taylor', 'sequence', 'uniform-convergence', 'fourier-series', 'fourier-coefficients', 'epicycles', 'fixed-point']);
        expect(Object.keys(probabilityFamilyPresetCollections)).toEqual(['prob-density', 'prob-binomial-normal', 'prob-clt', 'prob-summary', 'prob-correlation']);
        expect(Object.keys(functionPresetCollections)).toHaveLength(35);
        expect(analysisCollections).toEqual(Object.values(analysisFamilyPresetCollections));
    });

    test('the family passes integrity', () => {
        const none = {rows: [], factoryIds: [], collections: []};
        expect(checkRegistrations([{
            family: 'analysis', rows: analysisDemonstrationRows, loaderIds: Object.keys(analysisGraphLoaders),
            collectionKeys: analysisCollectionKeys, collections: analysisCollections,
        }], none)).toEqual([]);
    });

    test('every collection is importable exactly once under its key, and the probability entries are still there', () => {
        const keys = presetCollections.map(collection => collection.key);
        for (const key of Object.values(analysisCollectionKeys)) expect(keys.filter(item => item === key)).toEqual([key]);
        for (const collection of Object.values(probabilityFamilyPresetCollections)) expect(keys.filter(item => item === collection.key)).toEqual([collection.key]);
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.analysisDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/analysis\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.analysisGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/analysis\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.analysisCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/analysis\/collections["']/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /analysisPrimaryOwners/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /analysisDemonstrationRows/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/analysis\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });
});

describe('owners (R-owners)', () => {
    const oldOwners = {
        'bisection': {chapterId: 'analysis', sectionId: 'existence'},
        'root-finding': {chapterId: 'numerical-methods', sectionId: 'root-finding'},
        'quadrature': {chapterId: 'numerical-methods', sectionId: 'quadrature'},
        'euler-method': {chapterId: 'numerical-methods', sectionId: 'euler-method'},
        'mean-value': {chapterId: 'analysis', sectionId: 'derivative-results'},
        'accumulation': {chapterId: 'functions-and-calculus', sectionId: 'integrals'},
        'darboux': {chapterId: 'analysis', sectionId: 'integrability'},
        'extrema': {chapterId: 'analysis', sectionId: 'derivative-results'},
        'convexity': {chapterId: 'analysis', sectionId: 'derivative-results'},
        'taylor': {chapterId: 'analysis', sectionId: 'taylor'},
        'sequence': {chapterId: 'analysis', sectionId: 'convergence'},
        'uniform-convergence': {chapterId: 'analysis', sectionId: 'convergence'},
        'fourier-series': {chapterId: 'fourier-series', sectionId: 'fourier-series'},
        'fourier-coefficients': {chapterId: 'fourier-series', sectionId: 'fourier-coefficients'},
        'epicycles': {chapterId: 'fourier-series', sectionId: 'epicycles'},
        'fixed-point': {chapterId: 'analysis', sectionId: 'convergence'},
    } as const;
    const derivedIds = expectedIds.filter(id => !Object.hasOwn(analysisPrimaryOwners, id));

    test('ten owners are explicit family metadata and six are derived', () => {
        expect(Object.keys(analysisPrimaryOwners)).toHaveLength(10);
        expect(derivedIds).toEqual(['root-finding', 'quadrature', 'euler-method', 'fourier-series', 'fourier-coefficients', 'epicycles']);
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
    test('the analysis catalog family lists the sixteen first, then the other registered rows in their old order', () => {
        const {families} = getDemonstrationCatalog();
        const ids = families.find(family => family.id === 'analysis')!.demonstrations.map(entry => entry.id);
        expect(ids.slice(0, 16)).toEqual(expectedIds);
        expect(ids.slice(16)).toEqual(['recursion-cobweb', 'recursion-growth', 'phase-portrait', 'logistic-map', 'solids', 'contour-map', 'linear-program']);
    });
});
