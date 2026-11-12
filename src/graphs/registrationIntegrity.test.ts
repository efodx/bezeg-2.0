import {describe, expect, test} from 'vitest';
import {DemonstrationId, getDemonstrationCatalog, legacyDemonstrationRows} from '../demonstrations';
import type {PresetCollection} from './base/presets/PresetCollection';
import {presetCollections} from './base/presets/PresetImport';
import {graphFactories} from './graphFactories';
import {registeredGraphLoaders} from './graphLoaders';
import {projectiveCollections} from './projective/collections';
import {projectiveCollectionKeys, projectiveDemonstrationRows} from './projective/registration';
import {projectiveGraphLoaders} from './projective/runtime';
import {bsplineCollections} from './curves/bspline/collections';
import {bsplineCollectionKeys, bsplineDemonstrationRows} from './curves/bspline/registration';
import {bsplineGraphLoaders} from './curves/bspline/runtime';
import {trigCollections} from './trig/collections';
import {trigCollectionKeys, trigDemonstrationRows} from './trig/registration';
import {trigGraphLoaders} from './trig/runtime';
import {lineCollections} from './lines/collections';
import {lineCollectionKeys, lineDemonstrationRows} from './lines/registration';
import {lineGraphLoaders} from './lines/runtime';
import {isometryCollections} from './isometry/collections';
import {isometryCollectionKeys, isometryDemonstrationRows} from './isometry/registration';
import {isometryGraphLoaders} from './isometry/runtime';
import {circleConstructionCollections} from './compgeo/circleConstruction/collections';
import {circleConstructionCollectionKeys, circleConstructionDemonstrationRows} from './compgeo/circleConstruction/registration';
import {circleConstructionGraphLoaders} from './compgeo/circleConstruction/runtime';
import {combinatoricsCollections} from './combinatorics/collections';
import {combinatoricsCollectionKeys, combinatoricsDemonstrationRows} from './combinatorics/registration';
import {combinatoricsGraphLoaders} from './combinatorics/runtime';
import {randomCollections} from './random/collections';
import {randomCollectionKeys, randomDemonstrationRows} from './random/registration';
import {randomGraphLoaders} from './random/runtime';
import {kinematicsCollections} from './curves/kinematics/collections';
import {kinematicsCollectionKeys, kinematicsDemonstrationRows} from './curves/kinematics/registration';
import {kinematicsGraphLoaders} from './curves/kinematics/runtime';
import {recursionCollections} from './recursion/collections';
import {recursionCollectionKeys, recursionDemonstrationRows} from './recursion/registration';
import {recursionGraphLoaders} from './recursion/runtime';
import {wavesCollections} from './functions/waves/collections';
import {wavesCollectionKeys, wavesDemonstrationRows} from './functions/waves/registration';
import {wavesGraphLoaders} from './functions/waves/runtime';
import {complexBatchDCollections} from './complex/batchD/collections';
import {complexBatchDCollectionKeys, complexBatchDDemonstrationRows} from './complex/batchD/registration';
import {complexBatchDGraphLoaders} from './complex/batchD/runtime';
import {mechanicsCollections} from './mechanics/collections';
import {mechanicsCollectionKeys, mechanicsDemonstrationRows} from './mechanics/registration';
import {mechanicsGraphLoaders} from './mechanics/runtime';
import {dynamicsCollections} from './dynamics/collections';
import {dynamicsCollectionKeys, dynamicsDemonstrationRows} from './dynamics/registration';
import {dynamicsGraphLoaders} from './dynamics/runtime';
import {solidsCollections} from './solids/collections';
import {solidsCollectionKeys, solidsDemonstrationRows} from './solids/registration';
import {solidsGraphLoaders} from './solids/runtime';
import {levelSetsCollections} from './levelsets/collections';
import {levelSetsCollectionKeys, levelSetsDemonstrationRows} from './levelsets/registration';
import {levelSetsGraphLoaders} from './levelsets/runtime';
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

interface RealFamily {
    readonly family: string; readonly rows: readonly {readonly id: string; readonly path: string}[]; readonly loaders: object;
    readonly collectionKeys: Readonly<Record<string, string>>; readonly collections: readonly PresetCollection<unknown>[];
}
const realFamilies: readonly RealFamily[] = [
    {family: 'complex-batch-d', rows: complexBatchDDemonstrationRows, loaders: complexBatchDGraphLoaders, collectionKeys: complexBatchDCollectionKeys, collections: complexBatchDCollections},
    {family: 'projective', rows: projectiveDemonstrationRows, loaders: projectiveGraphLoaders, collectionKeys: projectiveCollectionKeys, collections: projectiveCollections},
    {family: 'trigonometry', rows: trigDemonstrationRows, loaders: trigGraphLoaders, collectionKeys: trigCollectionKeys, collections: trigCollections},
    {family: 'line-geometry', rows: lineDemonstrationRows, loaders: lineGraphLoaders, collectionKeys: lineCollectionKeys, collections: lineCollections},
    {family: 'isometries', rows: isometryDemonstrationRows, loaders: isometryGraphLoaders, collectionKeys: isometryCollectionKeys, collections: isometryCollections},
    {family: 'circle-construction', rows: circleConstructionDemonstrationRows, loaders: circleConstructionGraphLoaders, collectionKeys: circleConstructionCollectionKeys, collections: circleConstructionCollections},
    {family: 'combinatorics', rows: combinatoricsDemonstrationRows, loaders: combinatoricsGraphLoaders, collectionKeys: combinatoricsCollectionKeys, collections: combinatoricsCollections},
    {family: 'random', rows: randomDemonstrationRows, loaders: randomGraphLoaders, collectionKeys: randomCollectionKeys, collections: randomCollections},
    {family: 'kinematics', rows: kinematicsDemonstrationRows, loaders: kinematicsGraphLoaders, collectionKeys: kinematicsCollectionKeys, collections: kinematicsCollections},
    {family: 'mechanics', rows: mechanicsDemonstrationRows, loaders: mechanicsGraphLoaders, collectionKeys: mechanicsCollectionKeys, collections: mechanicsCollections},
    {family: 'recursion', rows: recursionDemonstrationRows, loaders: recursionGraphLoaders, collectionKeys: recursionCollectionKeys, collections: recursionCollections},
    {family: 'dynamics', rows: dynamicsDemonstrationRows, loaders: dynamicsGraphLoaders, collectionKeys: dynamicsCollectionKeys, collections: dynamicsCollections},
    {family: 'solids', rows: solidsDemonstrationRows, loaders: solidsGraphLoaders, collectionKeys: solidsCollectionKeys, collections: solidsCollections},
    {family: 'levelsets', rows: levelSetsDemonstrationRows, loaders: levelSetsGraphLoaders, collectionKeys: levelSetsCollectionKeys, collections: levelSetsCollections},
    {family: 'waves', rows: wavesDemonstrationRows, loaders: wavesGraphLoaders, collectionKeys: wavesCollectionKeys, collections: wavesCollections},
    {family: 'bspline', rows: bsplineDemonstrationRows, loaders: bsplineGraphLoaders, collectionKeys: bsplineCollectionKeys, collections: bsplineCollections},
];
const registeredRows = realFamilies.flatMap(entry => entry.rows);

describe('the real registered families', () => {
    const registeredCollections = realFamilies.flatMap(entry => entry.collections);
    const legacyCollections = presetCollections.filter(collection => !registeredCollections.includes(collection));
    test('each is complete and disjoint from the legacy rows, factories, collections and the other families', () => {
        const issues = checkRegistrations(realFamilies.map(entry => ({
            family: entry.family, rows: entry.rows, loaderIds: Object.keys(entry.loaders), collectionKeys: entry.collectionKeys, collections: entry.collections,
        })), {rows: legacyDemonstrationRows, factoryIds: Object.keys(graphFactories), collections: legacyCollections});
        expect(issues).toEqual([]);
    });
    test('the root composition holds the union of the family loaders and the composed collections have unique storage keys', () => {
        expect(Object.keys(registeredGraphLoaders).sort()).toEqual(realFamilies.flatMap(entry => Object.keys(entry.loaders)).sort());
        expect(Object.keys(registeredGraphLoaders).sort()).toEqual(registeredRows.map(row => row.id).sort());
        const keys = presetCollections.map(collection => collection.key);
        expect(new Set(keys).size).toBe(keys.length);
        expect(registeredCollections.every(collection => presetCollections.includes(collection))).toBe(true);
    });
    test('registered rows stay after the legacy rows in the catalog, in family registration order', () => {
        const ids = getDemonstrationCatalog().demonstrations.map(({id}) => id);
        expect(ids.slice(-registeredRows.length)).toEqual(registeredRows.map(row => row.id));
        expect(ids.slice(0, -registeredRows.length)).toEqual(legacyDemonstrationRows.map(row => row.id));
    });
});

// Type-level: the composed id stays a narrow literal union (exhaustive Records elsewhere depend on it). Widening to `string`
// makes the assignment below a type error in `just typecheck`.
const demonstrationIdIsNarrow: false = false as (string extends DemonstrationId ? true : false);
test('DemonstrationId is not string', () => {
    expect(demonstrationIdIsNarrow).toBe(false);
});
