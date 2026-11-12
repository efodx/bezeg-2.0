// R5 composition and deletion test of docs/specs/lesson-authoring-architecture.md for the parameterization family (task 06 batch 7). Its
// three collections come out of the aggregate curve map with their keys unchanged. No primary owner can be derived (the `parametrization`
// chapter owns no lesson rows), so the explicit owners are family metadata.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../../demonstrations';
import {chapterOwnerRows} from '../../../learning/content/chapterOwnedLessons';
import {getGuidedLessonOwner, guidedLessonOwners} from '../../../learning/chapter/guidedLessonOwnership';
import {curvePresetCollections} from '../curvePresetCollections';
import {parameterizationCollections} from './collections';
import {parameterizationCollectionKeys, parameterizationDemonstrationRows, parameterizationPrimaryOwners} from './registration';
import {parameterizationGraphLoaders} from './runtime';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');
const expectedIds = ['spline-parameterization', 'weighted-parameterization', 'uniform-parameterization'] as const;

const centralFiles = [
    'src/demonstrations.ts', 'src/graphs/graphFactories.ts', 'src/graphs/graphLoaders.ts', 'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts', 'src/learning/chapter/guidedLessonOwnership.ts', 'scripts/probe-demonstration-clip-routes.cjs',
    'src/graphs/curves/curvePresetCollections.ts',
] as const;
const identities = [...parameterizationDemonstrationRows.flatMap(row => [row.id, row.path]), 'alfaparametrizacije', 'alpha-param', 'uniform-graph'];
const escape = (text: string) => text.replace(/[/-]/g, '\\$&');

describe('R5 deletion test: no central parameterization rows', () => {
    test.each(centralFiles)('%s names no parameterization Demonstration id, path or collection key', file => {
        const source = read(file);
        const derived = identities.filter(identity => new RegExp(`['"\`]${escape(identity)}['"\`]|^\\s*${escape(identity)}:`, 'm').test(source));
        expect({file, derived}).toEqual({file, derived: []});
    });

    test('the family owns three rows in catalog order, their collection keys and one loader each', () => {
        expect(parameterizationDemonstrationRows.map(row => row.id)).toEqual(expectedIds);
        expect(Object.keys(parameterizationGraphLoaders)).toEqual(expectedIds);
        expect(parameterizationCollectionKeys).toEqual({'spline-parameterization': 'alfaparametrizacije', 'weighted-parameterization': 'alpha-param', 'uniform-parameterization': 'uniform-graph'});
        expect(parameterizationCollections.map(collection => collection.key)).toEqual(['alfaparametrizacije', 'alpha-param', 'uniform-graph']);
    });

    test('the aggregate map no longer holds the moved collections', () => {
        for (const id of expectedIds) expect(Object.hasOwn(curvePresetCollections, id)).toBe(false);
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.parameterizationDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/curves\/parametrisations\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.parameterizationGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/curves\/parametrisations\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.parameterizationCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/curves\/parametrisations\/collections["']/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /parameterizationPrimaryOwners/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/curves\/parametrisations\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });
});

describe('owners (R-owners)', () => {
    test.each(expectedIds)('%s: no chapter owner row exists, so the primary owner is explicit family metadata, not a central row', id => {
        expect(Object.hasOwn(guidedLessonOwners, id)).toBe(false);
        expect(chapterOwnerRows().find(item => item.demonstrationId === id)).toBeUndefined();
        expect(getGuidedLessonOwner(id)).toEqual(parameterizationPrimaryOwners[id]);
    });

    test('the primary owners are the ones the central table had', () => {
        expect(parameterizationPrimaryOwners).toEqual({
            'spline-parameterization': {chapterId: 'parametrization', sectionId: 'weighted-knot'},
            'weighted-parameterization': {chapterId: 'parametrization', sectionId: 'weighted-knot'},
            'uniform-parameterization': {chapterId: 'parametrization', sectionId: 'uniform-timing'},
        });
    });
});

describe('placement', () => {
    test('the parameterization catalog family keeps its three entries in order, with the same neighbours', () => {
        const {families} = getDemonstrationCatalog();
        expect(families.find(family => family.id === '/bezeg-2.0/param')!.demonstrations.map(entry => entry.id)).toEqual(expectedIds);
        const order = families.map(family => family.id);
        const at = order.indexOf('/bezeg-2.0/param');
        expect(order.slice(at - 1, at + 2)).toEqual(['/bezeg-2.0/ph', '/bezeg-2.0/param', '/bezeg-2.0/curve-geometry']);
    });
});
