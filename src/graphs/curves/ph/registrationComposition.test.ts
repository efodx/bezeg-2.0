// R5 composition and deletion test of docs/specs/lesson-authoring-architecture.md for the PH family (task 06 batch 6). Its two collections
// come out of the aggregate curve map with their keys unchanged. Neither primary owner can be derived (the `ph-curves` chapter owns no
// lesson rows), so the explicit owners are family metadata.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../../demonstrations';
import {chapterOwnerRows} from '../../../learning/content/chapterOwnedLessons';
import {getGuidedLessonOwner, guidedLessonOwners} from '../../../learning/chapter/guidedLessonOwnership';
import {curvePresetCollections} from '../curvePresetCollections';
import {phCollections} from './collections';
import {phCollectionKeys, phDemonstrationRows, phPrimaryOwners} from './registration';
import {phGraphLoaders} from './runtime';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');
const expectedIds = ['ph-cubic', 'ph-quintic'] as const;

const centralFiles = [
    'src/demonstrations.ts', 'src/graphs/graphFactories.ts', 'src/graphs/graphLoaders.ts', 'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts', 'src/learning/chapter/guidedLessonOwnership.ts', 'scripts/probe-demonstration-clip-routes.cjs',
    'src/graphs/curves/curvePresetCollections.ts',
] as const;
const identities = [...phDemonstrationRows.flatMap(row => [row.id, row.path]), 'cubic-ph', 'quintic-ph-graph'];
const escape = (text: string) => text.replace(/[/-]/g, '\\$&');

describe('R5 deletion test: no central PH rows', () => {
    test.each(centralFiles)('%s names no PH Demonstration id, path or collection key', file => {
        // The home page's starting-example list (`caption:` lines) legitimately names `ph-cubic`; it is not a registration row.
        const source = read(file).split('\n').filter(line => !/caption:/.test(line)).join('\n');
        const derived = identities.filter(identity => new RegExp(`['"\`]${escape(identity)}['"\`]|^\\s*${escape(identity)}:`, 'm').test(source));
        expect({file, derived}).toEqual({file, derived: []});
    });

    test('the family owns two rows in catalog order, their collection keys and one loader each', () => {
        expect(phDemonstrationRows.map(row => row.id)).toEqual(expectedIds);
        expect(Object.keys(phGraphLoaders)).toEqual(expectedIds);
        expect(phCollectionKeys).toEqual({'ph-cubic': 'cubic-ph', 'ph-quintic': 'quintic-ph-graph'});
        expect(phCollections.map(collection => collection.key)).toEqual(['cubic-ph', 'quintic-ph-graph']);
    });

    test('the aggregate map no longer holds the moved collections', () => {
        for (const id of expectedIds) expect(Object.hasOwn(curvePresetCollections, id)).toBe(false);
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.phDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/curves\/ph\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.phGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/curves\/ph\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.phCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/curves\/ph\/collections["']/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /phPrimaryOwners/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/curves\/ph\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });
});

describe('owners (R-owners)', () => {
    test.each(expectedIds)('%s: no chapter owner row exists, so the primary owner is explicit family metadata, not a central row', id => {
        expect(Object.hasOwn(guidedLessonOwners, id)).toBe(false);
        expect(chapterOwnerRows().find(item => item.demonstrationId === id)).toBeUndefined();
        expect(getGuidedLessonOwner(id)).toEqual(phPrimaryOwners[id]);
    });

    test('the primary owners are the ones the central table had', () => {
        expect(phPrimaryOwners).toEqual({
            'ph-cubic': {chapterId: 'ph-curves', sectionId: 'arc-length-problem'},
            'ph-quintic': {chapterId: 'ph-curves', sectionId: 'offsets'},
        });
    });
});

describe('placement', () => {
    test('the PH catalog family keeps its two entries in order, with the same neighbours', () => {
        const {families} = getDemonstrationCatalog();
        expect(families.find(family => family.id === '/bezeg-2.0/ph')!.demonstrations.map(entry => entry.id)).toEqual(expectedIds);
        const order = families.map(family => family.id);
        const at = order.indexOf('/bezeg-2.0/ph');
        expect(order.slice(at - 1, at + 2)).toEqual(['/bezeg-2.0/spline', '/bezeg-2.0/ph', '/bezeg-2.0/param']);
    });
});
