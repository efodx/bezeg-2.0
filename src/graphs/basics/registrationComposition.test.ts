// R5 composition and deletion test of docs/specs/lesson-authoring-architecture.md for the basics family (task 06 batch 2). The family spans
// two implementation directories (`bernstein`, `complex`), so its module lives in `graphs/basics`. Its two collections come out of the
// aggregate curve and function maps with their keys unchanged. Neither primary owner can be derived (chapters without owned lessons),
// so the explicit owners are family metadata.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../demonstrations';
import {chapterOwnerRows} from '../../learning/content/chapterOwnedLessons';
import {getGuidedLessonOwners, guidedLessonOwners} from '../../learning/chapter/guidedLessonOwnership';
import {curvePresetCollections} from '../curves/curvePresetCollections';
import {functionPresetCollections} from '../functions/functionPresetCollections';
import {basicsCollections} from './collections';
import {basicsAdditionalOwners, basicsCollectionKeys, basicsDemonstrationRows, basicsPrimaryOwners} from './registration';
import {basicsGraphLoaders} from './runtime';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');
const expectedIds = ['bernstein', 'complex-multiplication'] as const;

const centralFiles = [
    'src/demonstrations.ts', 'src/graphs/graphFactories.ts', 'src/graphs/graphLoaders.ts', 'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts', 'src/learning/chapter/guidedLessonOwnership.ts', 'scripts/probe-demonstration-clip-routes.cjs',
    'src/graphs/curves/curvePresetCollections.ts', 'src/graphs/functions/functionPresetCollections.ts',
] as const;
const identities = [...basicsDemonstrationRows.flatMap(row => [row.id, row.path]), 'bernstein-graph', 'complex-multiplication'];
const escape = (text: string) => text.replace(/[/-]/g, '\\$&');

describe('R5 deletion test: no central basics rows', () => {
    test.each(centralFiles)('%s names no basics Demonstration id, path or collection key', file => {
        const source = read(file);
        const derived = identities.filter(identity => new RegExp(`['"\`]${escape(identity)}['"\`]|^\\s*${escape(identity)}:`, 'm').test(source));
        expect({file, derived}).toEqual({file, derived: []});
    });

    test('the family owns two rows in catalog order, their collection keys and one loader each', () => {
        expect(basicsDemonstrationRows.map(row => row.id)).toEqual(expectedIds);
        expect(Object.keys(basicsGraphLoaders)).toEqual(expectedIds);
        expect(basicsCollectionKeys).toEqual({bernstein: 'bernstein-graph', 'complex-multiplication': 'complex-multiplication'});
        expect(basicsCollections.map(collection => collection.key)).toEqual(['bernstein-graph', 'complex-multiplication']);
    });

    test('the aggregate maps no longer hold the moved collections', () => {
        expect(Object.hasOwn(curvePresetCollections, 'bernstein')).toBe(false);
        expect(Object.hasOwn(functionPresetCollections, 'complex-multiplication')).toBe(false);
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.basicsDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/basics\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.basicsGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/basics\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.basicsCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/basics\/collections["']/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /basicsPrimaryOwners/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/basics\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });
});

describe('owners (R-owners)', () => {
    test.each(expectedIds)('%s: no chapter owner row exists, so the primary owner is explicit family metadata, not a central row', id => {
        expect(Object.hasOwn(guidedLessonOwners, id)).toBe(false);
        expect(chapterOwnerRows().find(item => item.demonstrationId === id)).toBeUndefined();
        expect(getGuidedLessonOwners(id)[0]).toEqual(basicsPrimaryOwners[id]);
    });

    test('the primary owners are the ones the central table had, and the Bernstein extra owner is kept after the primary', () => {
        expect(basicsPrimaryOwners).toEqual({
            bernstein: {chapterId: 'foundations', sectionId: 'why-weights'},
            'complex-multiplication': {chapterId: 'foundations', sectionId: 'complex-plane'},
        });
        expect(basicsAdditionalOwners.bernstein).toEqual([{chapterId: 'bezier-curves', sectionId: 'bernstein-form'}]);
        expect(getGuidedLessonOwners('bernstein').slice(0, 2)).toEqual([basicsPrimaryOwners.bernstein, ...basicsAdditionalOwners.bernstein]);
    });
});

describe('placement', () => {
    test('the basics catalog family keeps its two entries in order and stays the first family', () => {
        const {families} = getDemonstrationCatalog();
        expect(families[0].id).toBe('basics');
        expect(families[0].demonstrations.map(entry => entry.id)).toEqual(expectedIds);
    });
});
