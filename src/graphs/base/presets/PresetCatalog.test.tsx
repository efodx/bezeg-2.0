/**
 * Every Demonstration in `graphFactories`, mounted for real: its default Preset is exported to a file, preflighted and
 * committed by the file importer, and loaded back by the graph. Further checks tie each graph's Preset collection to the
 * definitions the file importer accepts.
 */
import {graphFactories} from '../../../Routes';
import type {DemonstrationId} from '../../../demonstrations';
import {appStorage} from '../../../storage/appStorage';
import {installBoardShims, mountGraph, observeScene, settle} from '../realGraphTestHarness';
import {commitPresetImport, preflightPresetImport, presetCollections} from './PresetImport';
import {legacyCurvePresetCollections} from '../../curves/curvePresetCollections';

beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

const ids = Object.keys(graphFactories) as DemonstrationId[];
/** No browser-local Preset collection. */
const NO_PRESET_COLLECTION = new Set<DemonstrationId>(['circle']);

/** The collection keys of release files before the definitions moved to their graph families; a file contract. */
const FILE_CONTRACT_KEYS = ["bernstein-graph", "bezier-curve", "decasteljau", "decasteljau2", "subdivision-1", "affine-transform", "elevation-graph",
    "bezier-extrapolation", "bezier-subdivision", "rational-bezier", "rational-bezier-farin", "rational-decasteljau",
    "rational-bezier-elevation", "rational-bezier-extrapolation", "rational-bezier-subdivision", "cubic-ph",
    "quintic-ph-graph", "c1-spline-graph", "c2-spline", "cn-spline", "g1-spline-graph",
    "g1-symmetric-spline-graph", "g1-spline", "alpha-param", "uniform-graph", "alfaparametrizacije", "linear-function", "exponential-function",
    "trigonometric-function", "piecewise-continuity", "derivative", "definite-integral", "area-between-curves", "arc-length", "bisection", "mean-value",
    "accumulation", "darboux", "extrema", "convexity", "taylor", "sequence", "uniform-convergence", "complex-multiplication", "fixed-point"];

/** Rounds away floating-point noise from view arithmetic (a bounding box computed from the container size). */
const rounded = (value: unknown) => JSON.parse(JSON.stringify(value, (_key, item) =>
    typeof item === 'number' ? Math.round(item * 1e9) / 1e9 : item));

describe('Preset collection definitions', () => {
    test('the accepted collection keys are the file contract, each defined once', () => {
        const keys = presetCollections.map(collection => collection.key);
        expect(new Set(keys).size).toBe(keys.length);
        expect([...keys].sort()).toEqual([...FILE_CONTRACT_KEYS].sort());
    });

    test('every Demonstration with Presets uses a definition the file importer accepts, and every definition has a graph apart from documented legacy keys', () => {
        const used = new Set<unknown>();
        for (const id of ids) {
            const collection = graphFactories[id]().presetCollection();
            if (NO_PRESET_COLLECTION.has(id)) {
                expect(collection, id).toBeUndefined();
                continue;
            }
            expect(presetCollections, id).toContain(collection);
            expect(used.has(collection), `${id} shares another Demonstration's collection`).toBe(false);
            used.add(collection);
        }
        const unused = presetCollections.filter(collection => !used.has(collection));
        expect(unused).toEqual([...legacyCurvePresetCollections]);
        expect(unused.map(collection => collection.key)).toEqual(['g1-spline']);
    });

    test('definitions are static: frozen and usable without a graph or board', () => {
        for (const collection of presetCollections) {
            expect(Object.isFrozen(collection), collection.key).toBe(true);
            expect('rejection' in collection.check(undefined), collection.key).toBe(true);
        }
    });
});

/**
 * Lesson scenes reset to the Demonstration's default scene (`prepared-scene` has only the `demonstration-default` source),
 * so every authored scene is a default Preset; it must pass its own collection, as a stored or exported copy will be checked.
 */
test.each(ids)('%s: the default scene passes its own Preset collection', id => {
    const graph = graphFactories[id]();
    const collection = graph.presetCollection();
    const data = JSON.parse(JSON.stringify(graph.defaultPreset()));
    if (collection) expect(collection.check(data)).toEqual({data});
});

/** A stored Preset seeded by the guided-lesson smoke test: a rational curve state from before the full curve state was written. */
test('rational-elevation: a stored Preset with a shorter curve state loads with its Farin points, not the default scene', async () => {
    const warn = vi.spyOn(console, 'warn');
    const mounted = mountGraph(graphFactories['rational-elevation']());
    const {graph} = mounted;
    graph.presetService!.savePreset({id: 'smoke-farin', data: [['JSXRationalBezierCurve', {
        points: [[-4, -3], [-3, 3], [3, 3], [4, -3]], weights: [1, 2, 1, 1],
        state: {showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false, subdivisionT: 0.5,
            extrapolationT: 1.2, showingWeights: false, weightNumber: 1, showingFarinPoints: true},
    }]]});
    await settle(() => graph.selectPreset('smoke-farin'));
    const curves = (graph as unknown as {jxgCurves: Array<{isShowingFarinPoints(): boolean; getCurve(): {getWeights(): number[]}}>}).jxgCurves;
    expect(curves).toHaveLength(1);
    expect(curves[0].isShowingFarinPoints()).toBe(true);
    curves[0].getCurve().getWeights().forEach((weight, i) => expect(weight).toBeCloseTo([1, 2, 1, 1][i], 9));
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Ignoring invalid Preset data'));
    mounted.view.unmount();
});

test.each(ids)('%s: the default Preset exports, preflights, imports and loads', async id => {
    const warn = vi.spyOn(console, 'warn');
    const mounted = mountGraph(graphFactories[id]());
    const {graph} = mounted;
    const collection = graph.presetCollection();
    if (!collection) {
        expect(NO_PRESET_COLLECTION.has(id)).toBe(true);
        mounted.view.unmount();
        return;
    }
    const exported = {...graph.exportPreset(), id: 'catalog'};
    // The graph's own import checks stored (serialized) data with the same definition.
    const stored = exported.data === undefined ? undefined : JSON.parse(JSON.stringify(exported.data));
    if (stored !== undefined) expect(collection.check(stored)).toEqual({data: stored});
    const before = observeScene(graph);
    const file = JSON.stringify({[`preset-${collection.key}`]: {data: [exported]}});
    const plan = preflightPresetImport(file, appStorage);
    expect(plan.replacements).toEqual([]);
    commitPresetImport(plan, appStorage);
    await settle(() => graph.reloadAfterImport());
    await settle(() => graph.selectPreset('catalog'));
    expect(graph.selectedPresetId).toBe('catalog');
    const after = observeScene(graph);
    expect(after.data).toEqual(before.data);
    expect(after.board).toEqual(before.board);
    expect(rounded({...graph.exportPreset(), id: 'catalog'})).toEqual(rounded(exported));
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Ignoring invalid Preset data'));
    mounted.view.unmount();
});
