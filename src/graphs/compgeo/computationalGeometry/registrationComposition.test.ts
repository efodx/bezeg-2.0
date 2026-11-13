// R5 composition and deletion test of docs/specs/lesson-authoring-architecture.md for the computational-geometry family (task 06 batch 16).
// The sixteen collections are reused unchanged; the owners of all sixteen derive from their chapter-owned sections.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../../demonstrations';
import {chapterOwnerRows} from '../../../learning/content/chapterOwnedLessons';
import {getGuidedLessonOwners, guidedLessonOwners} from '../../../learning/chapter/guidedLessonOwnership';
import {presetCollections} from '../../base/presets/PresetImport';
import {checkRegistrations} from '../../registrationIntegrity';
import {computationalGeometryCollections} from './collections';
import {computationalGeometryCollectionKeys, computationalGeometryDemonstrationRows} from './registration';
import {computationalGeometryGraphLoaders} from './runtime';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');
const expectedIds = [
    'orientation', 'polygon-area', 'convex-hull', 'point-in-polygon', 'hull-robustness', 'bezier-hulls', 'ear-clipping', 'point-set-triangulation', 'delaunay', 'voronoi', 'voronoi-degenerate', 'interval-sweep', 'segment-intersections', 'monotone-partition', 'monotone-triangulation', 'fortune',
] as const;

const centralFiles = [
    'src/demonstrations.ts', 'src/graphs/graphLoaders.ts', 'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts', 'src/learning/chapter/guidedLessonOwnership.ts', 'scripts/probe-demonstration-clip-routes.cjs',
] as const;
const escape = (text: string) => text.replace(/[/-]/g, '\\$&');
const idPatterns = computationalGeometryDemonstrationRows.map(row => ({
    identity: row.id,
    pattern: new RegExp(`\\{id: '${escape(row.id)}'|^\\s*['"]?${escape(row.id)}['"]?:\\s*(\\{chapterId|\\(\\) =>)`, 'm'),
}));
const quotedPatterns = computationalGeometryDemonstrationRows.map(row => row.path)
    .map(identity => ({identity, pattern: new RegExp(`['"\`]${escape(identity)}['"\`]`)}));

describe('R5 deletion test: no central computational-geometry rows', () => {
    test.each(centralFiles)('%s names no computational-geometry Demonstration id or path', file => {
        const source = read(file).split('\n').filter(line => !/caption:/.test(line)).join('\n');
        const derived = [...idPatterns, ...quotedPatterns].filter(({pattern}) => pattern.test(source)).map(({identity}) => identity);
        expect({file, derived}).toEqual({file, derived: []});
    });

    test('the family owns sixteen rows in catalog order, one loader each and sixteen collections with their keys', () => {
        expect(computationalGeometryDemonstrationRows.map(row => row.id)).toEqual(expectedIds);
        expect(Object.keys(computationalGeometryGraphLoaders)).toEqual(expectedIds);
        expect(computationalGeometryCollections.map(collection => collection.key)).toEqual(expectedIds.map(id => computationalGeometryCollectionKeys[id]));
        // The storage keys are a file contract and differ from the ids; they stay unchanged.
        expect(computationalGeometryCollectionKeys).toEqual({
        'orientation': 'compgeo-orientation',
        'polygon-area': 'compgeo-polygon-area',
        'convex-hull': 'compgeo-hull-trace',
        'point-in-polygon': 'compgeo-point-in-polygon',
        'hull-robustness': 'compgeo-hull-robustness',
        'bezier-hulls': 'compgeo-bezier-hulls',
        'ear-clipping': 'compgeo-ear-clipping',
        'point-set-triangulation': 'compgeo-triangulation',
        'delaunay': 'compgeo-delaunay',
        'voronoi': 'compgeo-voronoi',
        'voronoi-degenerate': 'compgeo-voronoi-degenerate',
        'interval-sweep': 'compgeo-interval-sweep',
        'segment-intersections': 'compgeo-bentley-ottmann',
        'monotone-partition': 'compgeo-monotone-partition',
        'monotone-triangulation': 'compgeo-monotone-triangulation',
        'fortune': 'compgeo-fortune',
        });
    });

    test('the family passes integrity', () => {
        const none = {rows: [], factoryIds: [], collections: []};
        expect(checkRegistrations([{
            family: 'computational-geometry', rows: computationalGeometryDemonstrationRows, loaderIds: Object.keys(computationalGeometryGraphLoaders),
            collectionKeys: computationalGeometryCollectionKeys, collections: computationalGeometryCollections,
        }], none)).toEqual([]);
    });

    test('every collection is importable exactly once under its key', () => {
        const keys = presetCollections.map(collection => collection.key);
        for (const key of Object.values(computationalGeometryCollectionKeys)) expect(keys.filter(item => item === key)).toEqual([key]);
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.computationalGeometryDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/compgeo\/computationalGeometry\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.computationalGeometryGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/compgeo\/computationalGeometry\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.computationalGeometryCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/compgeo\/computationalGeometry\/collections["']/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /computationalGeometryDemonstrationRows/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/compgeo\/computationalGeometry\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });
});

describe('owners (R-owners)', () => {
    const oldOwners = {
        'orientation': {chapterId: 'convexity-hulls', sectionId: 'orientation'},
        'polygon-area': {chapterId: 'convexity-hulls', sectionId: 'polygon-area'},
        'convex-hull': {chapterId: 'convexity-hulls', sectionId: 'convex-hull'},
        'point-in-polygon': {chapterId: 'convexity-hulls', sectionId: 'point-in-polygon'},
        'hull-robustness': {chapterId: 'convexity-hulls', sectionId: 'hull-robustness'},
        'bezier-hulls': {chapterId: 'convexity-hulls', sectionId: 'bezier-hulls'},
        'ear-clipping': {chapterId: 'triangulations-voronoi', sectionId: 'ear-clipping'},
        'point-set-triangulation': {chapterId: 'triangulations-voronoi', sectionId: 'point-set-triangulation'},
        'delaunay': {chapterId: 'triangulations-voronoi', sectionId: 'delaunay'},
        'voronoi': {chapterId: 'triangulations-voronoi', sectionId: 'voronoi'},
        'voronoi-degenerate': {chapterId: 'triangulations-voronoi', sectionId: 'voronoi-degenerate'},
        'interval-sweep': {chapterId: 'sweep-algorithms', sectionId: 'interval-sweep'},
        'segment-intersections': {chapterId: 'sweep-algorithms', sectionId: 'segment-intersections'},
        'monotone-partition': {chapterId: 'sweep-algorithms', sectionId: 'monotone-partition'},
        'monotone-triangulation': {chapterId: 'sweep-algorithms', sectionId: 'monotone-triangulation'},
        'fortune': {chapterId: 'sweep-algorithms', sectionId: 'fortune'},
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
    test('the computational-geometry catalog family lists the sixteen rows in order and no other row', () => {
        const {families} = getDemonstrationCatalog();
        const ids = families.find(family => family.id === 'computational-geometry')!.demonstrations.map(entry => entry.id);
        expect(ids).toEqual([...expectedIds]);
    });
});
