// R5 composition and deletion test of docs/specs/lesson-authoring-architecture.md for the splines family (task 06 batch 5).
// Five collections leave the aggregate curve map with their keys unchanged; the import-only `g1-spline` collection moves with them (R-g1).
// No `splines` chapter owner row exists, so all five primary owners are explicit family metadata (R-owners).
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {beforeEach, describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../../demonstrations';
import {chapterOwnerRows} from '../../../learning/content/chapterOwnedLessons';
import {getGuidedLessonOwners, guidedLessonOwners} from '../../../learning/chapter/guidedLessonOwnership';
import {setLanguage} from '../../../localization';
import {commitPresetImport, preflightPresetImport} from '../../base/presets/PresetImport';
import {checkRegistrations} from '../../registrationIntegrity';
import {legacyG1SplinePresetCollection, splineCollections, splineDemonstrationCollections} from './collections';
import {splineCollectionKeys, splineDemonstrationRows, splinePrimaryOwners} from './registration';
import {splineGraphLoaders} from './runtime';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');
const expectedIds = ['spline-cn', 'spline-c1', 'spline-c2', 'spline-g1', 'spline-g1-symmetric'] as const;

const centralFiles = [
    'src/demonstrations.ts', 'src/graphs/graphLoaders.ts', 'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts', 'src/learning/chapter/guidedLessonOwnership.ts', 'scripts/probe-demonstration-clip-routes.cjs',
    'src/graphs/curves/curvePresetCollections.ts',
] as const;
const escape = (text: string) => text.replace(/[/-]/g, '\\$&');
const idPatterns = splineDemonstrationRows.map(row => ({
    identity: row.id,
    pattern: new RegExp(`\\{id: '${escape(row.id)}'|^\\s*['"]?${escape(row.id)}['"]?:\\s*(\\{chapterId|\\(\\) =>)`, 'm'),
}));
const quotedPatterns = [...splineDemonstrationRows.map(row => row.path), ...Object.values(splineCollectionKeys), 'g1-spline']
    .map(identity => ({identity, pattern: new RegExp(`['"\`]${escape(identity)}['"\`]`)}));

describe('R5 deletion test: no central spline rows', () => {
    test.each(centralFiles)('%s names no spline Demonstration id, path or collection key', file => {
        const source = read(file).split('\n').filter(line => !/caption:/.test(line)).join('\n');
        const derived = [...idPatterns, ...quotedPatterns].filter(({pattern}) => pattern.test(source)).map(({identity}) => identity);
        expect({file, derived}).toEqual({file, derived: []});
    });

    test('the family owns five rows in catalog order, one loader each and five collections with their keys', () => {
        expect(splineDemonstrationRows.map(row => row.id)).toEqual(expectedIds);
        expect(Object.keys(splineGraphLoaders)).toEqual(expectedIds);
        expect(splineDemonstrationCollections.map(collection => collection.key)).toEqual(expectedIds.map(id => splineCollectionKeys[id]));
        expect(splineCollectionKeys).toEqual({
            'spline-cn': 'cn-spline', 'spline-c1': 'c1-spline-graph', 'spline-c2': 'c2-spline',
            'spline-g1': 'g1-spline-graph', 'spline-g1-symmetric': 'g1-symmetric-spline-graph',
        });
    });

    test('the family passes integrity, with the import-only collection unreferenced by any id', () => {
        const none = {rows: [], factoryIds: [], collections: []};
        expect(checkRegistrations([{
            family: 'spline', rows: splineDemonstrationRows, loaderIds: Object.keys(splineGraphLoaders),
            collectionKeys: splineCollectionKeys, collections: splineCollections,
        }], none)).toEqual([]);
    });
});

describe('R-g1: the import-only g1-spline collection lives with the splines', () => {
    beforeEach(() => { localStorage.clear(); setLanguage('sl'); });

    test('it is an import-only entry, in the family list, referenced by no Demonstration and not in the root curve module', () => {
        expect(legacyG1SplinePresetCollection.key).toBe('g1-spline');
        expect(splineCollections.at(-1)).toBe(legacyG1SplinePresetCollection);
        expect(splineDemonstrationCollections).not.toContain(legacyG1SplinePresetCollection);
        expect(Object.values(splineCollectionKeys)).not.toContain('g1-spline');
        expect(read('src/graphs/curves/curvePresetCollections.ts')).not.toMatch(/legacyCurvePresetCollections/);
    });

    test('an old g1-spline export still imports into storage unchanged', () => {
        const legacy = {data: [{id: 'G1', data: [['JSXQuadraticG1SplineCurve', {points: [[-4, -1], [-2, 2], [0, 0], [2, -2], [4, 1]],
            state: {showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false, b: [1, 1]}}]]}]};
        commitPresetImport(preflightPresetImport(JSON.stringify({'preset-g1-spline': legacy})));
        expect(JSON.parse(localStorage.getItem('preset-g1-spline')!)).toEqual(legacy);
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.splineDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/curves\/spline\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.splineGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/curves\/spline\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.splineCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/curves\/spline\/collections["']/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /splinePrimaryOwners/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/curves\/spline\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });
});

describe('owners (R-owners)', () => {
    test.each(expectedIds)('%s: no chapter owner row exists, so the primary owner is explicit family metadata, not a central row', id => {
        expect(Object.hasOwn(guidedLessonOwners, id)).toBe(false);
        expect(chapterOwnerRows().find(item => item.demonstrationId === id)).toBeUndefined();
        expect(getGuidedLessonOwners(id)[0]).toEqual(splinePrimaryOwners[id]);
    });

    test('the explicit primary owners are the ones the central table had', () => {
        expect(splinePrimaryOwners).toEqual({
            'spline-cn': {chapterId: 'splines', sectionId: 'continuity-levels'},
            'spline-c1': {chapterId: 'splines', sectionId: 'continuity-levels'},
            'spline-c2': {chapterId: 'splines', sectionId: 'continuity-levels'},
            'spline-g1': {chapterId: 'splines', sectionId: 'geometric-vs-parametric'},
            'spline-g1-symmetric': {chapterId: 'splines', sectionId: 'geometric-vs-parametric'},
        });
    });
});

describe('placement', () => {
    test('the spline catalog family keeps its five entries in order, with the same neighbours', () => {
        const {families} = getDemonstrationCatalog();
        expect(families.find(family => family.id === '/bezeg-2.0/spline')!.demonstrations.map(entry => entry.id)).toEqual(expectedIds);
        const order = families.map(family => family.id);
        const at = order.indexOf('/bezeg-2.0/spline');
        expect(order.slice(at - 1, at + 2)).toEqual(['/bezeg-2.0/rational', '/bezeg-2.0/spline', '/bezeg-2.0/ph']);
    });
});
