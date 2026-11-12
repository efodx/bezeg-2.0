// R5 composition and deletion test of docs/specs/lesson-authoring-architecture.md for the interpolation family (task 06 batch 8).
// Two fnMap entries (interp-runge, interp-least-squares) leave the function collection map; the other three collections were standalone.
// The `interpolation` chapter owns a lesson row per Demonstration, so all five primary owners are derived (R-owners).
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../../demonstrations';
import {chapterOwnerRows} from '../../../learning/content/chapterOwnedLessons';
import {getGuidedLessonOwners, guidedLessonOwners} from '../../../learning/chapter/guidedLessonOwnership';
import {functionPresetCollections} from '../../functions/functionPresetCollections';
import {presetCollections} from '../../base/presets/PresetImport';
import {checkRegistrations} from '../../registrationIntegrity';
import {interpolationCollections} from './collections';
import {interpolationCollectionKeys, interpolationDemonstrationRows} from './registration';
import {interpolationGraphLoaders} from './runtime';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');
const expectedIds = ['interp-lagrange', 'interp-hermite', 'interp-runge', 'interp-least-squares', 'interp-subdivision'] as const;

const centralFiles = [
    'src/demonstrations.ts', 'src/graphs/graphFactories.ts', 'src/graphs/graphLoaders.ts', 'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts', 'src/learning/chapter/guidedLessonOwnership.ts', 'scripts/probe-demonstration-clip-routes.cjs',
    'src/graphs/functions/functionPresetCollections.ts',
] as const;
const escape = (text: string) => text.replace(/[/-]/g, '\\$&');
const idPatterns = interpolationDemonstrationRows.map(row => ({
    identity: row.id,
    pattern: new RegExp(`\\{id: '${escape(row.id)}'|^\\s*['"]?${escape(row.id)}['"]?:\\s*(\\{chapterId|\\(\\) =>)`, 'm'),
}));
const quotedPatterns = [...interpolationDemonstrationRows.map(row => row.path), ...Object.values(interpolationCollectionKeys)]
    .map(identity => ({identity, pattern: new RegExp(`['"\`]${escape(identity)}['"\`]`)}));

describe('R5 deletion test: no central interpolation rows', () => {
    test.each(centralFiles)('%s names no interpolation Demonstration id, path or collection key', file => {
        const source = read(file).split('\n').filter(line => !/caption:/.test(line)).join('\n');
        const derived = [...idPatterns, ...quotedPatterns].filter(({pattern}) => pattern.test(source)).map(({identity}) => identity);
        expect({file, derived}).toEqual({file, derived: []});
    });

    test('the family owns six rows in catalog order, one loader each and six collections with their keys', () => {
        expect(interpolationDemonstrationRows.map(row => row.id)).toEqual(expectedIds);
        expect(Object.keys(interpolationGraphLoaders)).toEqual(expectedIds);
        expect(interpolationCollections.map(collection => collection.key)).toEqual(expectedIds.map(id => interpolationCollectionKeys[id]));
        expect(interpolationCollectionKeys).toEqual({
            'interp-lagrange': 'interp-lagrange', 'interp-hermite': 'interp-hermite', 'interp-runge': 'interp-runge',
            'interp-least-squares': 'interp-least-squares', 'interp-subdivision': 'interp-subdivision',
        });
    });

    test('the function collection map keeps its other entries and no longer holds the two moved ones', () => {
        expect(Object.hasOwn(functionPresetCollections, 'interp-runge')).toBe(false);
        expect(Object.hasOwn(functionPresetCollections, 'interp-least-squares')).toBe(false);
        expect(Object.hasOwn(functionPresetCollections, 'bisection')).toBe(true);
        expect(read('src/graphs/functions/functionPresetCollections.ts')).toMatch(/export function functionCollection[<(]/);
    });

    test('the family passes integrity', () => {
        const none = {rows: [], factoryIds: [], collections: []};
        expect(checkRegistrations([{
            family: 'interpolation', rows: interpolationDemonstrationRows, loaderIds: Object.keys(interpolationGraphLoaders),
            collectionKeys: interpolationCollectionKeys, collections: interpolationCollections,
        }], none)).toEqual([]);
    });

    test('every collection is still importable under its key', () => {
        const keys = presetCollections.map(collection => collection.key);
        for (const key of Object.values(interpolationCollectionKeys)) expect(keys.filter(item => item === key)).toEqual([key]);
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.interpolationDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/curves\/interpolation\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.interpolationGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/curves\/interpolation\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.interpolationCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/curves\/interpolation\/collections["']/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /interpolationDemonstrationRows/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/curves\/interpolation\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });
});

describe('owners (R-owners)', () => {
    test.each(expectedIds)('%s: the primary owner is derived from the chapter-owned section, not a central row', id => {
        expect(Object.hasOwn(guidedLessonOwners, id)).toBe(false);
        const row = chapterOwnerRows().find(item => item.demonstrationId === id)!;
        expect(row).toBeDefined();
        expect(getGuidedLessonOwners(id)[0]).toEqual({chapterId: row.chapterId, sectionId: row.sectionId});
    });

    test('the derived primary owners are the ones the central table had', () => {
        expect(Object.fromEntries(expectedIds.map(id => [id, getGuidedLessonOwners(id)[0]]))).toEqual({
            'interp-lagrange': {chapterId: 'interpolation', sectionId: 'lagrange'}, 'interp-hermite': {chapterId: 'interpolation', sectionId: 'hermite'},
            'interp-runge': {chapterId: 'interpolation', sectionId: 'runge'}, 'interp-least-squares': {chapterId: 'interpolation', sectionId: 'least-squares'},
            'interp-subdivision': {chapterId: 'interpolation', sectionId: 'subdivision'},
        });
    });
});

describe('placement', () => {
    test('the interpolation catalog family lists its five entries in order, with the same neighbour families', () => {
        const {families} = getDemonstrationCatalog();
        expect(families.find(family => family.id === '/bezeg-2.0/interpolation')!.demonstrations.map(entry => entry.id)).toEqual(expectedIds);
        const order = families.map(family => family.id);
        const at = order.indexOf('/bezeg-2.0/interpolation');
        expect(order.slice(at - 1, at + 2)).toEqual(['/bezeg-2.0/curve-geometry', '/bezeg-2.0/interpolation', '/bezeg-2.0/bspline']);
    });
});
