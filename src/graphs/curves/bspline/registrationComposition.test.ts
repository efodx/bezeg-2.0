// R5 composition and deletion test of docs/specs/lesson-authoring-architecture.md for the B-spline family: B-spline knowledge lives in
// registration.ts, collections.ts and runtime.ts; the central registrations only spread the family exports. A shallow wrapper around the
// old per-id tables fails both halves. The six Demonstrations share one Preset collection (`bspline-curve`).
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../../demonstrations';
import {chapterOwnerRows} from '../../../learning/content/chapterOwnedLessons';
import {getGuidedLessonOwner, guidedLessonOwners} from '../../../learning/chapter/guidedLessonOwnership';
import {bsplineCollections} from './collections';
import {bsplineCollectionKeys, bsplineDemonstrationRows} from './registration';
import {bsplineGraphLoaders} from './runtime';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');

const expectedIds = ['bspline-basis', 'bspline-deboor', 'bspline-insertion', 'bspline-extraction', 'bspline-nurbs', 'bspline-blossom'] as const;

/** Central registrations that must not enumerate B-spline Demonstrations. */
const centralFiles = [
    'src/demonstrations.ts', 'src/graphs/graphLoaders.ts', 'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts', 'src/learning/chapter/guidedLessonOwnership.ts', 'scripts/probe-demonstration-clip-routes.cjs',
] as const;
const namedIdentities = [...bsplineDemonstrationRows.flatMap(row => [row.id, row.path]), 'bspline-curve'];
const bsplineLiteral = /['"`](?:\/bezeg-2\.0)?\/bspline\/[a-z-]+|['"`]bspline-[a-z-]+['"`]/g;

describe('R5 deletion test: no central B-spline rows', () => {
    test.each(centralFiles)('%s names no B-spline Demonstration id, path or collection key', file => {
        const source = read(file);
        const derived = namedIdentities.filter(identity => source.includes(`'${identity}'`) || source.includes(`"${identity}"`) || source.includes(`\`${identity}`));
        const literals = source.match(bsplineLiteral) ?? [];
        expect({file, derived, literals}).toEqual({file, derived: [], literals: []});
    });

    test('the family owns exactly the six rows in catalog order, one shared collection and one loader each', () => {
        expect(bsplineDemonstrationRows.map(row => row.id)).toEqual(expectedIds);
        expect(Object.keys(bsplineGraphLoaders)).toEqual(expectedIds);
        expect(Object.values(bsplineCollectionKeys)).toEqual(expectedIds.map(() => 'bspline-curve'));
        expect(bsplineCollections.map(collection => collection.key)).toEqual(['bspline-curve']);
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.bsplineDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/curves\/bspline\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.bsplineGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/curves\/bspline\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.bsplineCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/curves\/bspline\/collections["']/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /bsplineDemonstrationRows/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/curves\/bspline\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });

});

describe('primary owner derivation (R-owners)', () => {
    test.each(expectedIds)('%s: the first chapter owner row is b-splines#<id>, so no ownership row is needed', id => {
        expect(Object.hasOwn(guidedLessonOwners, id)).toBe(false);
        const first = chapterOwnerRows().find(item => item.demonstrationId === id);
        expect(first && {chapterId: first.chapterId, sectionId: first.sectionId}).toEqual({chapterId: 'b-splines', sectionId: id});
        expect(getGuidedLessonOwner(id)).toEqual({chapterId: 'b-splines', sectionId: id});
    });
});

describe('placement', () => {
    test('the B-spline catalog family keeps its six entries in the same order, with the same neighbours', () => {
        const {families} = getDemonstrationCatalog();
        expect(families.find(family => family.id === '/bezeg-2.0/bspline')!.demonstrations.map(entry => entry.id)).toEqual(expectedIds);
        const order = families.map(family => family.id);
        const at = order.indexOf('/bezeg-2.0/bspline');
        expect(order.slice(at - 1, at + 2)).toEqual(['/bezeg-2.0/interpolation', '/bezeg-2.0/bspline', '/bezeg-2.0/patches']);
    });
});
