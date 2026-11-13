// R5 of docs/specs/lesson-authoring-architecture.md: the deletion test. Projective knowledge lives in registration.ts, collections.ts and
// runtime.ts; the central registrations only spread the family exports. A shallow wrapper around the old per-id tables fails both halves:
// no central file may name a projective id, path or collection key, and every root must reference the family export.
// Per-behaviour artifacts (preview/motion assets, preview recipes, lesson content, localization) legitimately name ids and are not scanned.
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {projectiveCollectionKeys, projectiveDemonstrationRows} from './registration';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8');

/** Central registrations that must not enumerate projective Demonstrations (and the loading surface each one is). */
const centralFiles = [
    'src/demonstrations.ts',
    'src/graphs/graphLoaders.ts',
    'src/graphs/allGraphFactories.ts',
    'src/graphs/base/presets/PresetImport.ts',
    'src/learning/chapter/guidedLessonOwnership.ts',
    'scripts/capture-guided-example-previews.cjs',
    'scripts/generate-guided-example-inventory.cjs',
    'scripts/probe-demonstration-clip-routes.cjs',
] as const;

/** Every identity a central file could use to name a projective Demonstration, derived from the family rows. */
const namedIdentities = [
    ...projectiveDemonstrationRows.flatMap(row => [row.id, row.path]),
    ...Object.values(projectiveCollectionKeys),
];
/** Backstop for a newly added row not yet in this build's derived list: any quoted `projective-<id>` or `/projective/<id>` literal. The chapter/family key `projective-conics` is a family, not a Demonstration. */
const projectiveLiteral = /['"`](?:\/bezeg-2\.0)?\/projective\/[a-z-]+|['"`]projective-(?!conics['"`.])[a-z-]+['"`]/g;

describe('R5 deletion test: no central projective rows', () => {
    test.each(centralFiles)('%s names no projective Demonstration id, path or collection key', file => {
        const source = read(file);
        const derived = namedIdentities.filter(identity => source.includes(`'${identity}'`) || source.includes(`"${identity}"`) || source.includes(`\`${identity}`));
        const literals = source.match(projectiveLiteral) ?? [];
        expect({file, derived, literals}).toEqual({file, derived: [], literals: []});
    });

    test('the derived identities are nonempty (a vacuous scan cannot pass)', () => {
        expect(projectiveDemonstrationRows.length).toBeGreaterThan(0);
        expect(namedIdentities.length).toBe(projectiveDemonstrationRows.length * 3);
    });
});

describe('R5 composition: every root references the family export', () => {
    const expectations: readonly (readonly [string, RegExp])[] = [
        ['src/demonstrations.ts', /\.\.\.projectiveDemonstrationRows\b/],
        ['src/demonstrations.ts', /from '\.\/graphs\/projective\/registration'/],
        ['src/graphs/graphLoaders.ts', /\.\.\.projectiveGraphLoaders\b/],
        ['src/graphs/graphLoaders.ts', /from '\.\/projective\/runtime'/],
        ['src/graphs/base/presets/PresetImport.ts', /\.\.\.projectiveCollections\b/],
        ['src/graphs/base/presets/PresetImport.ts', /from ["']\.\.\/\.\.\/projective\/collections["']/],
        ['src/learning/chapter/guidedLessonOwnership.ts', /projectiveDemonstrationRows/],
        ['scripts/capture-guided-example-previews.cjs', /identities: \{module: '\/src\/graphs\/projective\/registration\.ts', rows: 'projectiveDemonstrationRows'\}/],
        ['scripts/generate-guided-example-inventory.cjs', /identities: \{module: '\/src\/graphs\/projective\/registration\.ts', rows: 'projectiveDemonstrationRows'\}/],
        ['scripts/probe-demonstration-clip-routes.cjs', /src\/graphs\/projective\/registration\.ts/],
    ];
    test.each(expectations)('%s matches %s', (file, pattern) => {
        expect(read(file)).toMatch(pattern);
    });


    test('the legacy constructor table stays deleted and no route imports it', () => {
        expect(existsSync(resolve(repoRoot, 'src/graphs/graphFactories.ts'))).toBe(false);
        expect(read('src/Routes.tsx')).not.toMatch(/graphFactories/);
    });

    test('the eager test adapter derives from the registered loaders', () => {
        expect(read('src/graphs/allGraphFactories.ts')).toMatch(/Object\.entries\(registeredGraphLoaders\)/);
    });

    test('the primary owner of a projective Demonstration is derived from the chapter section, with no ownership row', () => {
        const source = read('src/learning/chapter/guidedLessonOwnership.ts');
        expect(source).toMatch(/chapterOwnerRows\(\)/);
        for (const row of projectiveDemonstrationRows) expect(source).not.toMatch(new RegExp(`['"]${row.id}['"]\\s*:`));
    });
});
