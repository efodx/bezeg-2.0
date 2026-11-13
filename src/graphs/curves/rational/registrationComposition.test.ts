// R5 composition and deletion test of docs/specs/lesson-authoring-architecture.md for the rational family (task 06 batch 4).
// Six collections leave the aggregate curve map with their keys unchanged; `circle` declares its absence explicitly (R-circle).
// No `rational-curves` chapter owner row exists, so all seven primary owners are explicit family metadata (R-owners).
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../../demonstrations';
import {chapterOwnerRows} from '../../../learning/content/chapterOwnedLessons';
import {getGuidedLessonOwners, guidedLessonOwners} from '../../../learning/chapter/guidedLessonOwnership';
import {checkRegistrations} from '../../registrationIntegrity';
import {rationalCollections} from './collections';
import {rationalCollectionKeys, rationalDemonstrationRows, rationalPrimaryOwners} from './registration';
import {rationalGraphLoaders} from './runtime';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');
const expectedIds = ['rational', 'rational-decasteljau', 'rational-elevation', 'rational-extrapolation', 'rational-subdivision', 'farin', 'circle'] as const;
const collectionIds = expectedIds.filter(id => id !== 'circle');

const centralFiles = [
    'src/demonstrations.ts', 'src/graphs/graphLoaders.ts', 'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts', 'src/learning/chapter/guidedLessonOwnership.ts', 'scripts/probe-demonstration-clip-routes.cjs',
    'src/graphs/curves/curvePresetCollections.ts',
] as const;
// Ids are matched as row or table entries, not as bare quoted text: other families' row titles and lesson sections share words like 'subdivision'.
const escape = (text: string) => text.replace(/[/-]/g, '\\$&');
const idPatterns = rationalDemonstrationRows.map(row => ({
    identity: row.id,
    pattern: new RegExp(`\\{id: '${escape(row.id)}'|^\\s*['"]?${escape(row.id)}['"]?:\\s*(\\{chapterId|\\(\\) =>)`, 'm'),
}));
const stringKeys = collectionIds.map(id => rationalCollectionKeys[id]);
const quotedPatterns = [...rationalDemonstrationRows.map(row => row.path), ...stringKeys]
    .map(identity => ({identity, pattern: new RegExp(`['"\`]${escape(identity)}['"\`]`)}));

describe('R5 deletion test: no central rational rows', () => {
    test.each(centralFiles)('%s names no rational Demonstration id, path or collection key', file => {
        // The home page's starting-example list (`caption:` lines) may name an id; it is not a registration row.
        const source = read(file).split('\n').filter(line => !/caption:/.test(line)).join('\n');
        const derived = [...idPatterns, ...quotedPatterns].filter(({pattern}) => pattern.test(source)).map(({identity}) => identity);
        expect({file, derived}).toEqual({file, derived: []});
    });

    test('the family owns seven rows in catalog order, one loader each and six collections with their keys', () => {
        expect(rationalDemonstrationRows.map(row => row.id)).toEqual(expectedIds);
        expect(Object.keys(rationalGraphLoaders)).toEqual(expectedIds);
        expect(rationalCollections.map(collection => collection.key)).toEqual(collectionIds.map(id => rationalCollectionKeys[id]));
        expect(rationalCollectionKeys['rational-elevation']).toBe('rational-bezier-elevation');
        expect(rationalCollectionKeys.farin).toBe('rational-bezier-farin');
    });
});

describe('R-circle: the absent collection is declared, not omitted', () => {
    test('circle declares its absence with a reason and no collection carries it', () => {
        const declared = rationalCollectionKeys.circle;
        expect(typeof declared).toBe('object');
        expect(declared.none.length).toBeGreaterThan(0);
        expect(rationalCollections.length).toBe(6);
    });

    test('the family passes integrity as declared, and fails once the declaration is omitted', () => {
        const input = {
            family: 'rational', rows: rationalDemonstrationRows, loaderIds: Object.keys(rationalGraphLoaders),
            collectionKeys: rationalCollectionKeys, collections: rationalCollections,
        };
        const none = {rows: [], factoryIds: [], collections: []};
        expect(checkRegistrations([input], none)).toEqual([]);
        const {circle: _circle, ...omitted} = rationalCollectionKeys;
        expect(checkRegistrations([{...input, collectionKeys: omitted}], none)).toEqual(['rational: id "circle" has no collection reference.']);
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.rationalDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/curves\/rational\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.rationalGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/curves\/rational\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.rationalCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/curves\/rational\/collections["']/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /rationalPrimaryOwners/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/curves\/rational\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });
});

describe('owners (R-owners)', () => {
    test.each(expectedIds)('%s: no chapter owner row exists, so the primary owner is explicit family metadata, not a central row', id => {
        expect(Object.hasOwn(guidedLessonOwners, id)).toBe(false);
        expect(chapterOwnerRows().find(item => item.demonstrationId === id)).toBeUndefined();
        // The primary owner leads the owner list; `getGuidedLessonOwner` may map it to a retained example home, which is not this table's concern.
        expect(getGuidedLessonOwners(id)[0]).toEqual(rationalPrimaryOwners[id]);
    });

    test('the explicit primary owners are the ones the central table had', () => {
        expect(rationalPrimaryOwners).toEqual({
            'rational': {chapterId: 'rational-curves', sectionId: 'why-rational'},
            'rational-decasteljau': {chapterId: 'rational-curves', sectionId: 'operations'},
            'rational-elevation': {chapterId: 'rational-curves', sectionId: 'operations'},
            'rational-subdivision': {chapterId: 'rational-curves', sectionId: 'operations'},
            'rational-extrapolation': {chapterId: 'rational-curves', sectionId: 'investigate-rational'},
            'farin': {chapterId: 'rational-curves', sectionId: 'operations'},
            'circle': {chapterId: 'rational-curves', sectionId: 'worked-conic'},
        });
    });
});

describe('placement', () => {
    test('the rational catalog family keeps its seven entries in order, with the same neighbours', () => {
        const {families} = getDemonstrationCatalog();
        expect(families.find(family => family.id === '/bezeg-2.0/rational')!.demonstrations.map(entry => entry.id)).toEqual(expectedIds);
        const order = families.map(family => family.id);
        const at = order.indexOf('/bezeg-2.0/rational');
        expect(order.slice(at - 1, at + 2)).toEqual(['/bezeg-2.0/bezier', '/bezeg-2.0/rational', '/bezeg-2.0/spline']);
    });
});
