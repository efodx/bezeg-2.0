/**
 * Scene replacement contract (architecture task A3, slice S1). Each replacement entry runs three times on a real
 * graph; cycles 2 and 3 must leave what cycle 1 left: the same board objects (count per type, tick-label pool aside),
 * the same live default axes and infobox still on the board, the same event handler and board construction counts, and
 * the same number of live JSXGraph boards (the PH hodograph is one of them).
 *
 * Leak detection (A3 S4, the sweep is gone): after a reload or figure batch every registered family's board holds no
 * object from before the replacement except board infrastructure (`boardInfrastructureObjects`), and a second
 * replacement leaves as many scene objects as the first.
 *
 * Cases marked `it.fails` reproduce a real leak or duplication; flip each to `it` when the family's teardown owns
 * its objects (A3 S3). Lesson entries run on the three matrix families through the generic prepared-scene and
 * checkpoint capabilities.
 */
import {act} from '@testing-library/react';
import JXG from 'jsxgraph';
import {graphFactories} from '../graphFactories';
import BaseGraph, {BaseGraphState} from './BaseGraph';
import {appStorage} from '../../storage/appStorage';
import {createGraph, installBoardShims, mountGraph, type MountedGraph, REAL_GRAPH_TEST_TIMEOUT, settle} from './realGraphTestHarness';
import {internals} from './realGraphScenes';
import {CrossRatioGraph} from '../projective/CrossRatioGraph';
import {PascalGraph} from '../projective/PascalGraph';
import {boardInfrastructureObjects} from './BoardInfrastructure';

vi.mock('./export/FigureCapture', async () => ({
    ...await vi.importActual<typeof import('./export/FigureCapture')>('./export/FigureCapture'),
    capturePNGBlob: vi.fn(async () => new Blob(['png'])),
    waitForFigureCaptureReady: vi.fn(async () => undefined),
    downloadBlob: vi.fn(),
}));

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

type TestBoard = JXG.Board & {defaultAxes?: {x: unknown; y: unknown}; infobox?: unknown; eventHandlers: Record<string, unknown[]>};
type GraphLike = BaseGraph<BaseGraphState>;
type Entry = 'remount' | 'reload' | 'figure batch' | 'lesson default scene' | 'lesson checkpoint';
const ENTRIES: Entry[] = ['remount', 'reload', 'figure batch', 'lesson default scene', 'lesson checkpoint'];

const boardOf = (graph: GraphLike): TestBoard | undefined =>
    (graph as unknown as {hasBoard: boolean}).hasBoard ? internals(graph).board as TestBoard : undefined;

/** Board objects, tick labels aside: JSXGraph keeps a pool of them whose size depends on the views drawn before. */
function snapshot(graph: GraphLike) {
    const board = boardOf(graph);
    if (!board) return undefined;
    const objects = board.objectsList as unknown as Array<{elType: string; labels?: unknown[]}>;
    const tickLabels = new Set(objects.flatMap(object => object.elType === 'ticks' ? object.labels ?? [] : []));
    const owned = objects.filter(object => !tickLabels.has(object));
    const counts: Record<string, number> = {};
    for (const object of owned) counts[object.elType] = (counts[object.elType] ?? 0) + 1;
    const handlers: Record<string, number> = {};
    for (const [name, list] of Object.entries(board.eventHandlers ?? {})) handlers[name] = list.length;
    const axes = board.defaultAxes;
    const infrastructure = [axes?.x, axes?.y, board.infobox];
    return {
        board, total: owned.length, counts, handlers, infrastructure,
        infrastructureOnBoard: infrastructure.map(object => object === undefined || object === null || objects.includes(object as never)),
        boards: Object.keys(JXG.boards as Record<string, JXG.Board>).length,
        hodograph: (graph as unknown as {hodographBoard?: JXG.Board}).hodographBoard !== undefined,
    };
}

type Shot = ReturnType<typeof snapshot>;

/** What a later cycle must keep of the first. A new board (remount) has new axes; those only have to be on it. */
function expectSameAs(first: Shot, later: Shot, sameBoard: boolean) {
    if (!first || !later) {
        expect(later).toBe(first);
        return;
    }
    expect(later.counts).toEqual(first.counts);
    expect(later.total).toBe(first.total);
    expect(later.handlers).toEqual(first.handlers);
    expect(later.boards).toBe(first.boards);
    expect(later.hodograph).toBe(first.hodograph);
    expect(later.infrastructureOnBoard).toEqual([true, true, true]);
    if (sameBoard) {
        expect(later.board).toBe(first.board);
        later.infrastructure.forEach((object, index) => expect(object).toBe(first.infrastructure[index]));
    }
}

interface Rig {
    graph: GraphLike;
    mounted: MountedGraph;
    creates: ReturnType<typeof vi.spyOn>;
    disposes: ReturnType<typeof vi.spyOn>;
}

function open(make: () => GraphLike): Rig {
    const graph = make();
    const creates = vi.spyOn(JXG.Board.prototype, 'create');
    const disposes = vi.spyOn(graph as unknown as {disposeFigureScene(): void}, 'disposeFigureScene');
    return {graph, mounted: mountGraph(graph), creates, disposes};
}

/** Runs one replacement of `entry` on the rig. */
async function replace(entry: Entry, rig: Rig, checkpoint: unknown): Promise<void> {
    const {graph} = rig;
    const capabilities = graph.getLessonCapabilities();
    switch (entry) {
        case 'remount':
            rig.mounted.view.unmount();
            rig.mounted = mountGraph(graph);
            return;
        case 'reload':
            await settle(() => graph.reset());
            return;
        case 'figure batch':
            await settle(() => internals(graph).exportPresetFigures([{...graph.exportPreset(), id: 'contract-figure'}]));
            return;
        case 'lesson default scene':
            act(() => capabilities.apply({kind: 'prepared-scene', sceneId: 'contract-default', source: 'demonstration-default'}));
            return;
        case 'lesson checkpoint':
            act(() => capabilities.restoreState(checkpoint as never));
            return;
    }
}

/** Runs the entry three times, checks cycle 1 against the fresh mount (not for remount) and cycles 2 and 3 against cycle 1. */
async function runCycles(make: () => GraphLike, entry: Entry, prepare?: (rig: Rig) => void, selectionSurvives = true): Promise<void> {
    const rig = open(make);
    prepare?.(rig);
    const baseline = snapshot(rig.graph);
    const checkpoint = entry === 'lesson checkpoint' ? rig.graph.getLessonCapabilities().captureState() : undefined;
    const cycles: Array<{shot: Shot; creates: number}> = [];
    for (let cycle = 0; cycle < 3; cycle++) {
        rig.creates.mockClear();
        await replace(entry, rig, checkpoint);
        cycles.push({
            shot: snapshot(rig.graph),
            creates: rig.creates.mock.calls.length,
        });
    }
    try {
        // A scene replacement that loads a fresh scene drops the curve selection (and its hodograph handlers), so the
        // selected PH variant skips this comparison for those two entries; later cycles are still compared with cycle 1.
        // The first replacement must also leave what the fresh mount showed (a remount builds a new board, so it is excluded).
        if (entry !== 'remount' && (selectionSurvives || (entry !== 'reload' && entry !== 'lesson default scene'))) expectSameAs(baseline, cycles[0].shot, true);
        for (const later of cycles.slice(1)) {
            expectSameAs(cycles[0].shot, later.shot, entry !== 'remount');
            expect(later.creates).toBe(cycles[0].creates);
        }
    } finally {
        rig.mounted.view.unmount();
    }
}

const selectFirstCurve = (rig: Rig) => {
    const graph = rig.graph as unknown as {selectCurve?(curve: unknown): void; jxgCurves?: unknown[]};
    if (graph.selectCurve && graph.jxgCurves?.length) act(() => graph.selectCurve!(graph.jxgCurves![0]));
};

/** Cases that reproduce a real leak or duplication, by `family/entry`. */
const KNOWN_FAILURES: Partial<Record<string, string>> = {
    // A3 S3: ph-cubic leaks no objects but remounting the used graph throws: unmount drops the curves, and the PH offset
    // controls render (getFirstJxgCurveAsPHCurve() is undefined) before the new mount rebuilds them. Flip to it() when mount owns that.
};

const MATRIX: Array<[string, () => GraphLike, ((rig: Rig) => void)?]> = [
    ['bezier curve', () => graphFactories.bezier()],
    ['function (derivative)', () => graphFactories.derivative()],
    ['ph-cubic', () => graphFactories['ph-cubic']()],
];

describe.each(MATRIX)('%s', (family, make, prepare) => {
    for (const entry of ENTRIES) {
        const run = KNOWN_FAILURES[`${family}/${entry}`] ? it.fails : it;
        run(`${entry} three times leaves the scene as the first did`, async () => {
            await runCycles(make, entry, prepare);
        });
    }
});

/** The hodograph board exists only while a curve is selected: the same cycles with the auxiliary board alive. */
describe('ph-cubic (curve selected)', () => {
    for (const entry of ENTRIES) {
        const run = KNOWN_FAILURES[`ph-cubic (curve selected)/${entry}`] ? it.fails : it;
        run(`${entry} three times leaves the scene as the first did`, async () => {
            await runCycles(() => graphFactories['ph-cubic'](), entry, selectFirstCurve, false);
        });
    }
});

/** Figure-path-only families: reload three times. */
const FIGURE_FAMILIES: Array<[string, () => GraphLike]> = [
    ['spline (c2)', () => graphFactories['spline-c2']()],
    ['hermite', () => graphFactories['interp-hermite']()],
    ['subdivision curve', () => graphFactories['interp-subdivision']()],
    ['point set (convex hull)', () => graphFactories['convex-hull']()],
    ['cross ratio', () => new CrossRatioGraph() as unknown as GraphLike],
    ['pascal', () => new PascalGraph() as unknown as GraphLike],
    ['coons patch', () => createGraph('patch-coons')],
    ['b-spline basis', () => graphFactories['bspline-basis']()],
    ['de Boor', () => graphFactories['bspline-deboor']()],
    ['B-spline insertion', () => graphFactories['bspline-insertion']()],
    ['linear map', () => graphFactories['linear-map']()],
    ['complex function', () => graphFactories['complex-reciprocal']()],
];

describe.each(FIGURE_FAMILIES)('%s (figure path)', (family, make) => {
    const run = KNOWN_FAILURES[`${family}/reload`] ? it.fails : it;
    run('reload three times leaves the scene as the first did', async () => {
        await runCycles(make, 'reload');
    });
});

/** Families whose own teardown still leaves objects behind, by `id/entry`, with the reason. */
const LEAKERS: Partial<Record<string, string>> = {};

/** The board's scene objects: everything on it that is not JSXGraph infrastructure. */
function sceneObjects(graph: GraphLike): object[] {
    // Surface families draw in a 3D view and have no board.
    if (!(graph as unknown as {hasBoard: boolean}).hasBoard) return [];
    const board = (graph as unknown as {board: JXG.Board}).board;
    const infrastructure = boardInfrastructureObjects(board);
    return (board.objectsList as object[]).filter(object => !infrastructure.has(object));
}

/**
 * Teardown follows owned objects (A3 S3a, S4): on the figure path every registered family's own `disposeFigureScene`
 * removes what it created and nothing sweeps behind it. Two replacements per family and entry: no scene object from
 * before a replacement survives it, and the second leaves as many scene objects as the first.
 */
describe.each(['reload', 'figure batch'] as Entry[])('figure-path replacement leaves no scene object behind (%s)', entry => {
    for (const id of Object.keys(graphFactories) as Array<keyof typeof graphFactories>) {
        const run = LEAKERS[`${id}/${entry}`] ? it.fails : it;
        run(`${id}`, async () => {
            const rig = open(() => graphFactories[id]());
            try {
                const before = new Set(sceneObjects(rig.graph));
                await replace(entry, rig, undefined);
                const first = sceneObjects(rig.graph);
                expect(first.filter(object => before.has(object)).length, `${id} first replacement kept old objects`).toBe(0);
                const firstSet = new Set(first);
                await replace(entry, rig, undefined);
                const second = sceneObjects(rig.graph);
                expect(second.filter(object => firstSet.has(object)).length, `${id} second replacement kept old objects`).toBe(0);
                expect(second.length, `${id} scene object count`).toBe(first.length);
            } finally {
                rig.mounted.view.unmount();
            }
        });
    }
});

/** Disposal is idempotent and safe once the board is gone, for the families this slice changed. */
describe.each(['projective-cross-ratio', 'projective-pascal', 'projective-pole-polar', 'convex-hull', 'inscribed-angle', 'triangle-centres', 'accumulation'] as const)('%s disposal', id => {
    it('disposing twice, and after unmount, does not throw', () => {
        const rig = open(() => graphFactories[id]());
        const dispose = () => (rig.graph as unknown as {disposeFigureScene(): void}).disposeFigureScene();
        dispose();
        dispose();
        rig.mounted.view.unmount();
        expect(dispose).not.toThrow();
    });
});

/**
 * Disposal count per replacement (A3 S2): `disposeFigureScene` runs exactly once for an entry that disposes (the figure
 * path always; mount and the lesson paths for curve families, which used to dispose inside `importPresetData`) and not at
 * all otherwise. Mount is counted on the remount only.
 */
describe('disposal per replacement', () => {
    const FAMILIES: Array<[string, () => GraphLike, boolean]> = [
        ['bezier curve', () => graphFactories.bezier(), true],
        ['function (derivative)', () => graphFactories.derivative(), false],
        ['ph-cubic', () => graphFactories['ph-cubic'](), true],
        ['hermite', () => graphFactories['interp-hermite'](), false],
        ['point set (convex hull)', () => graphFactories['convex-hull'](), false],
    ];
    const DISPOSING_ENTRIES: Entry[] = ['reload', 'figure batch'];

    describe.each(FAMILIES)('%s', (family, make, curveFamily) => {
        for (const entry of ENTRIES) {
            const batchSize = entry === 'figure batch' ? 2 : 1;
            // A batch figure disposes for the figure and again for the restored entry scene.
            const expected = DISPOSING_ENTRIES.includes(entry) ? batchSize : curveFamily ? 1 : 0;
            it(`${entry} disposes ${expected} time(s) per replacement`, async () => {
                const rig = open(make);
                const checkpoint = entry === 'lesson checkpoint' ? rig.graph.getLessonCapabilities().captureState() : undefined;
                try {
                    for (let cycle = 0; cycle < 2; cycle++) {
                        rig.disposes.mockClear();
                        await replace(entry, rig, checkpoint);
                        // A remount replaces the instance's session, so the spy keeps counting on the same graph.
                        expect(rig.disposes).toHaveBeenCalledTimes(expected);
                    }
                } finally {
                    rig.mounted.view.unmount();
                }
            });
        }
    });

    it('a curve checkpoint without Preset data keeps the curves and disposes nothing', () => {
        const rig = open(() => graphFactories.bezier());
        const graph = rig.graph as unknown as {jxgCurves: unknown[]};
        try {
            const capabilities = rig.graph.getLessonCapabilities();
            const checkpoint = capabilities.captureState() as {value: Record<string, unknown>};
            const curves = graph.jxgCurves.length;
            expect(curves).toBeGreaterThan(0);
            delete checkpoint.value.data;
            rig.disposes.mockClear();
            act(() => capabilities.restoreState(checkpoint as never));
            expect(rig.disposes).not.toHaveBeenCalled();
            expect(graph.jxgCurves).toHaveLength(curves);
        } finally {
            rig.mounted.view.unmount();
        }
    }, REAL_GRAPH_TEST_TIMEOUT);
});

/**
 * Teardown once per replacement (A3 S3b): the scene-owning curve families remove their scene exactly once per replacement.
 * The figure path disposes first, so the importer's `ensureScene` must not tear down again; the lesson entries do not
 * dispose, so there the importer's own teardown is the one.
 */
describe('scene teardown once per replacement', () => {
    const FAMILIES: Array<[string, () => GraphLike]> = [
        ['hermite', () => graphFactories['interp-hermite']()],
        ['interpolation', () => graphFactories['interp-lagrange']()],
        ['parametric', () => graphFactories['curve-parametric']()],
    ];
    describe.each(FAMILIES)('%s', (_family, make) => {
        for (const entry of ['reload', 'lesson default scene', 'lesson checkpoint'] as Entry[]) {
            it(`${entry} removes the scene once`, async () => {
                const rig = open(make);
                const removals = vi.spyOn(rig.graph as unknown as {removeScene(): void}, 'removeScene');
                const checkpoint = entry === 'lesson checkpoint' ? rig.graph.getLessonCapabilities().captureState() : undefined;
                try {
                    for (let cycle = 0; cycle < 2; cycle++) {
                        removals.mockClear();
                        await replace(entry, rig, checkpoint);
                        expect(removals).toHaveBeenCalledTimes(1);
                    }
                } finally {
                    rig.mounted.view.unmount();
                }
            });
        }
    });
});

/**
 * A stored scene state that disagrees with its Preset data (a hand-edited Preset, A3 S3b review): the figure path
 * imports the data, then lays the stored state over it. The standing scene must end up built for the state, as it was
 * before `initialize` stopped rebuilding a scene the import had just built.
 */
describe('figure path with a stored scene state that disagrees with the Preset data', () => {
    type FigurePath = {
        graphSession: {signal: AbortSignal};
        applyFigurePreset(session: unknown, preset: unknown, signal: AbortSignal): Promise<void>;
    };
    const loadFigure = async (graph: GraphLike, graphState: Record<string, unknown>) => {
        const path = graph as unknown as FigurePath;
        const preset = {...graph.exportPreset(), id: 'contract-mismatch', boardState: undefined};
        await settle(() => path.applyFigurePreset(path.graphSession, {...preset, graphState: {...preset.graphState, ...graphState}}, path.graphSession.signal));
    };

    it.each([['hermite', 'interp-hermite'], ['interpolation', 'interp-lagrange']] as const)('%s rebuilds for the state\'s point count', async (_family, id) => {
        const rig = open(() => graphFactories[id]());
        try {
            const graph = rig.graph as unknown as {state: {points: Array<readonly [number, number]>}; scene?: {pointCount: number}};
            const points = graph.state.points;
            const last = points[points.length - 1];
            await loadFigure(rig.graph, {points: [...points, [last[0] + 1, last[1]]]});
            expect(graph.state.points).toHaveLength(points.length + 1);
            expect(graph.scene?.pointCount).toBe(points.length + 1);
        } finally {
            rig.mounted.view.unmount();
        }
    });

    it('parametric rebuilds for the state\'s curve', async () => {
        const rig = open(() => graphFactories['curve-parametric']());
        try {
            const graph = rig.graph as unknown as {state: {curve: string}; sceneCurve?: string};
            const other = graph.state.curve === 'rose' ? 'cardioid' : 'rose';
            await loadFigure(rig.graph, {curve: other});
            expect(graph.state.curve).toBe(other);
            expect(graph.sceneCurve).toBe(other);
        } finally {
            rig.mounted.view.unmount();
        }
    });
});
