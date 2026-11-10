import {describe, expect, test} from 'vitest';
import {DemonstrationId, getDemonstrationCatalog, legacyDemonstrationRows} from '../demonstrations';
import {presetCollections} from './base/presets/PresetImport';
import {graphFactories} from './graphFactories';
import {registeredGraphLoaders} from './graphLoaders';
import {projectiveCollections} from './projective/collections';
import {projectiveCollectionKeys, projectiveDemonstrationRows} from './projective/registration';
import {projectiveGraphLoaders} from './projective/runtime';
import {checkRegistrations, FamilyRegistrationInput, LegacyRegistrationInput} from './registrationIntegrity';

const colA = Object.freeze({key: 'x-a'});
const colB = Object.freeze({key: 'x-b'});
const family = (patch: Partial<FamilyRegistrationInput> = {}): FamilyRegistrationInput => ({
    family: 'fam',
    rows: [{id: 'x-1', path: '/p/1'}, {id: 'x-2', path: '/p/2'}],
    loaderIds: ['x-1', 'x-2'],
    collectionKeys: {'x-1': 'x-a', 'x-2': 'x-a'},
    collections: [colA, colA, colB],
    ...patch,
});
const legacy: LegacyRegistrationInput = {rows: [{id: 'old', path: '/p/old'}], factoryIds: ['old'], collections: [Object.freeze({key: 'old-key'})]};

describe('registration integrity checker (synthetic)', () => {
    test('a complete registration passes, and one canonical collection may be referenced repeatedly', () => {
        expect(checkRegistrations([family()], legacy)).toEqual([]);
    });
    test('a missing loader names the family and id', () => {
        expect(checkRegistrations([family({loaderIds: ['x-1']})], legacy)).toEqual(['fam: id "x-2" has no runtime loader.']);
    });
    test('a loader without a row is reported', () => {
        expect(checkRegistrations([family({loaderIds: ['x-1', 'x-2', 'x-3']})], legacy)).toEqual(['fam: loader "x-3" has no row.']);
    });
    test('a duplicate id or path across families and against the legacy rows is reported', () => {
        const other = family({family: 'other', rows: [{id: 'x-1', path: '/p/9'}, {id: 'y', path: '/p/2'}], loaderIds: ['x-1', 'y'], collectionKeys: {'x-1': 'x-a', y: 'x-a'}, collections: [colA]});
        expect(checkRegistrations([family(), other], legacy)).toEqual([
            'other: id "x-1" is already registered by fam.',
            'other: path "/p/2" (id "y") is already registered by fam.',
        ]);
        const clash = family({rows: [{id: 'old', path: '/p/old'}], loaderIds: ['old'], collectionKeys: {old: 'x-a'}});
        expect(checkRegistrations([clash], legacy)).toEqual([
            'fam: id "old" is already registered by legacy.',
            'fam: path "/p/old" (id "old") is already registered by legacy.',
            'fam: id "old" is also in the legacy graph factory table.',
        ]);
    });
    test('an unknown or missing collection reference is reported', () => {
        expect(checkRegistrations([family({collectionKeys: {'x-1': 'x-zzz'}})], legacy)).toEqual([
            'fam: id "x-1" references unknown collection key "x-zzz".',
            'fam: id "x-2" has no collection reference.',
        ]);
    });
    test('two different collections on one storage key are reported, also against the legacy collections', () => {
        const rival = Object.freeze({key: 'x-a'});
        expect(checkRegistrations([family({collections: [colA, rival]})], legacy)).toEqual([
            'fam: collection key "x-a" is defined by a different collection than the one of fam.',
        ]);
        const shadow = Object.freeze({key: 'old-key'});
        expect(checkRegistrations([family({collections: [colA, shadow]})], legacy)).toEqual([
            'fam: collection key "old-key" is defined by a different collection than the one of legacy.',
        ]);
    });
});

describe('the real projective registration', () => {
    const legacyCollections = presetCollections.filter(collection => !projectiveCollections.includes(collection));
    test('is complete and disjoint from the legacy rows, factories and collections', () => {
        const issues = checkRegistrations([{
            family: 'projective', rows: projectiveDemonstrationRows, loaderIds: Object.keys(projectiveGraphLoaders),
            collectionKeys: projectiveCollectionKeys, collections: projectiveCollections,
        }], {rows: legacyDemonstrationRows, factoryIds: Object.keys(graphFactories), collections: legacyCollections});
        expect(issues).toEqual([]);
    });
    test('the root composition holds the registered loaders and the composed collections have unique storage keys', () => {
        expect(Object.keys(registeredGraphLoaders).sort()).toEqual(projectiveDemonstrationRows.map(row => row.id).sort());
        const keys = presetCollections.map(collection => collection.key);
        expect(new Set(keys).size).toBe(keys.length);
        expect(projectiveCollections.every(collection => presetCollections.includes(collection))).toBe(true);
    });
    test('projective rows stay last in the catalog, in registration order', () => {
        const ids = getDemonstrationCatalog().demonstrations.map(({id}) => id);
        expect(ids.slice(-projectiveDemonstrationRows.length)).toEqual(projectiveDemonstrationRows.map(row => row.id));
    });
});

// Type-level: the composed id stays a narrow literal union (exhaustive Records elsewhere depend on it). Widening to `string`
// makes the assignment below a type error in `just typecheck`.
const demonstrationIdIsNarrow: false = false as (string extends DemonstrationId ? true : false);
test('DemonstrationId is not string', () => {
    expect(demonstrationIdIsNarrow).toBe(false);
});
