// R5 composition and deletion test of docs/specs/lesson-authoring-architecture.md for the polynomial Bezier family (task 06 batch 3).
// Its collections come out of the aggregate curve map and the compgeo list with their keys unchanged. Eight primary owners are explicit
// family metadata (the `bezier-curves` chapter owns no lesson rows); `reduction`, `arc-length-param` and `bezier-clipping` derive from
// `chapterOwnerRows()`, asserted per id below.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../../demonstrations';
import {chapterOwnerRows} from '../../../learning/content/chapterOwnedLessons';
import {getGuidedLessonOwner, guidedLessonOwners} from '../../../learning/chapter/guidedLessonOwnership';
import {compgeoPresetCollections} from '../../compgeo/compgeoPresetCollections';
import {bezierCollections} from './collections';
import {bezierCollectionKeys, bezierDemonstrationRows, bezierDerivedOwnerIds, bezierPrimaryOwners} from './registration';
import {bezierGraphLoaders} from './runtime';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');
const expectedIds = [
    'bezier', 'decasteljau', 'decasteljau-alternative', 'affine', 'subdivision', 'repeated-subdivision', 'extrapolation', 'elevation',
    'reduction', 'arc-length-param', 'bezier-clipping',
] as const;
const explicitIds = ['bezier', 'decasteljau', 'decasteljau-alternative', 'affine', 'subdivision', 'repeated-subdivision', 'extrapolation', 'elevation'] as const;

const centralFiles = [
    'src/demonstrations.ts', 'src/graphs/graphFactories.ts', 'src/graphs/graphLoaders.ts', 'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts', 'src/learning/chapter/guidedLessonOwnership.ts', 'scripts/probe-demonstration-clip-routes.cjs',
    'src/graphs/curves/curvePresetCollections.ts',
] as const;
// Ids are matched as row or table entries, not as bare quoted text: other families' row titles and lesson sections share words like 'subdivision'.
const escape = (text: string) => text.replace(/[/-]/g, '\\$&');
const idPatterns = bezierDemonstrationRows.map(row => ({
    identity: row.id,
    pattern: new RegExp(`\\{id: '${escape(row.id)}'|^\\s*['"]?${escape(row.id)}['"]?:\\s*(\\{chapterId|\\(\\) =>)`, 'm'),
}));
const quotedPatterns = [...bezierDemonstrationRows.map(row => row.path), ...Object.values(bezierCollectionKeys)]
    .map(identity => ({identity, pattern: new RegExp(`['"\`]${escape(identity)}['"\`]`)}));

describe('R5 deletion test: no central Bezier rows', () => {
    test.each(centralFiles)('%s names no Bezier Demonstration id, path or collection key', file => {
        // The home page's starting-example list (`caption:` lines) legitimately names `bezier` and `decasteljau`; it is not a registration row.
        const source = read(file).split('\n').filter(line => !/caption:/.test(line)).join('\n');
        const derived = [...idPatterns, ...quotedPatterns].filter(({pattern}) => pattern.test(source)).map(({identity}) => identity);
        expect({file, derived}).toEqual({file, derived: []});
    });

    test('the family owns eleven rows in catalog order, their collection keys and one loader each', () => {
        expect(bezierDemonstrationRows.map(row => row.id)).toEqual(expectedIds);
        expect(Object.keys(bezierGraphLoaders)).toEqual(expectedIds);
        expect(bezierCollections.map(collection => collection.key)).toEqual(expectedIds.map(id => bezierCollectionKeys[id]));
        expect(bezierCollectionKeys['decasteljau-alternative']).toBe('decasteljau2');
        expect(bezierCollectionKeys['bezier-clipping']).toBe('compgeo-bezier-clipping');
    });

    test('the compgeo list no longer holds the clipping collection, which the family lists last', () => {
        expect(compgeoPresetCollections.map(collection => collection.key)).not.toContain('compgeo-bezier-clipping');
        expect(bezierCollections.at(-1)!.key).toBe('compgeo-bezier-clipping');
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.bezierDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/curves\/bezier\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.bezierGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/curves\/bezier\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.bezierCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/curves\/bezier\/collections["']/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /bezierPrimaryOwners/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /bezierDerivedOwnerIds/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/curves\/bezier\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });
});

describe('owners (R-owners)', () => {
    test.each(explicitIds)('%s: no chapter owner row exists, so the primary owner is explicit family metadata, not a central row', id => {
        expect(Object.hasOwn(guidedLessonOwners, id)).toBe(false);
        expect(chapterOwnerRows().find(item => item.demonstrationId === id)).toBeUndefined();
        expect(getGuidedLessonOwner(id)).toEqual(bezierPrimaryOwners[id]);
    });

    test.each(bezierDerivedOwnerIds)('%s: the first chapter owner row is the former central primary owner, so the owner is derived', id => {
        expect(Object.hasOwn(guidedLessonOwners, id)).toBe(false);
        expect(chapterOwnerRows().find(item => item.demonstrationId === id)).toMatchObject({chapterId: 'advanced-bezier', sectionId: id});
        expect(getGuidedLessonOwner(id)).toEqual({chapterId: 'advanced-bezier', sectionId: id});
    });

    test('the explicit primary owners are the ones the central table had', () => {
        expect(bezierPrimaryOwners).toEqual({
            'bezier': {chapterId: 'bezier-curves', sectionId: 'control-points'},
            'decasteljau': {chapterId: 'bezier-curves', sectionId: 'interpolation'},
            'decasteljau-alternative': {chapterId: 'bezier-curves', sectionId: 'interpolation'},
            'affine': {chapterId: 'bezier-curves', sectionId: 'affine-transformations'},
            'subdivision': {chapterId: 'bezier-curves', sectionId: 'next-ideas'},
            'repeated-subdivision': {chapterId: 'bezier-curves', sectionId: 'next-ideas'},
            'extrapolation': {chapterId: 'bezier-curves', sectionId: 'next-ideas'},
            'elevation': {chapterId: 'bezier-curves', sectionId: 'next-ideas'},
        });
        expect([...bezierDerivedOwnerIds]).toEqual(['reduction', 'arc-length-param', 'bezier-clipping']);
    });
});

describe('placement', () => {
    test('the Bezier catalog family keeps its eleven entries in order, with the same neighbours', () => {
        const {families} = getDemonstrationCatalog();
        expect(families.find(family => family.id === '/bezeg-2.0/bezier')!.demonstrations.map(entry => entry.id)).toEqual(expectedIds);
        const order = families.map(family => family.id);
        const at = order.indexOf('/bezeg-2.0/bezier');
        expect(order.slice(at - 1, at + 2)).toEqual(['basics', '/bezeg-2.0/bezier', '/bezeg-2.0/rational']);
    });
});
