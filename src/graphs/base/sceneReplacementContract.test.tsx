/**
 * Scene replacement contract (architecture task A3, slice S1). Each replacement entry runs three times on a real
 * graph; cycles 2 and 3 must leave what cycle 1 left: the same board objects (count per type, tick-label pool aside),
 * the same live default axes and infobox still on the board, the same event handler and board construction counts, and
 * the same number of live JSXGraph boards (the PH hodograph is one of them).
 *
 * Figure-path sweep seam (`BaseGraph.sweepSceneBoardObjects`): objects the sweep removed per replacement. Non-zero
 * means the family's own `disposeFigureScene` / `importPresetData` leaves objects for the sweep to remove (a suspected
 * reliance, not yet a failure). Observed counts (every cycle equal):
 *   remount, lesson default scene, lesson checkpoint: no sweep (not on those paths).
 *   reload (1 sweep): bezier 0, derivative 0, ph-cubic 0 (hodograph selected or not), spline c2 0, hermite 0,
 *   subdivision curve 0, linear map 0, complex reciprocal 0, coons patch 0 (no board), point set (convex hull) 18,
 *   cross ratio 43, pascal 59. Figure batch (2 sweeps): bezier 0+0, derivative 0+0, ph-cubic 0+0.
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
    sweeps: ReturnType<typeof vi.spyOn>;
    creates: ReturnType<typeof vi.spyOn>;
    disposes: ReturnType<typeof vi.spyOn>;
}

function open(make: () => GraphLike): Rig {
    const graph = make();
    const sweeps = vi.spyOn(graph as unknown as {sweepSceneBoardObjects(): unknown[]}, 'sweepSceneBoardObjects');
    const creates = vi.spyOn(JXG.Board.prototype, 'create');
    const disposes = vi.spyOn(graph as unknown as {disposeFigureScene(): void}, 'disposeFigureScene');
    return {graph, mounted: mountGraph(graph), sweeps, creates, disposes};
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

/** Runs the entry three times, checks cycle 1 against the fresh mount (not for remount) and cycles 2 and 3 against cycle 1, and returns the objects the sweep removed per cycle. */
async function runCycles(make: () => GraphLike, entry: Entry, prepare?: (rig: Rig) => void, selectionSurvives = true): Promise<number[][]> {
    const rig = open(make);
    prepare?.(rig);
    const baseline = snapshot(rig.graph);
    const checkpoint = entry === 'lesson checkpoint' ? rig.graph.getLessonCapabilities().captureState() : undefined;
    const cycles: Array<{shot: Shot; creates: number; removed: number[]}> = [];
    for (let cycle = 0; cycle < 3; cycle++) {
        rig.creates.mockClear();
        rig.sweeps.mockClear();
        await replace(entry, rig, checkpoint);
        cycles.push({
            shot: snapshot(rig.graph),
            creates: rig.creates.mock.calls.length,
            removed: rig.sweeps.mock.results.map((result: {value: unknown}) => (result.value as unknown[]).length),
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
            expect(later.removed).toEqual(cycles[0].removed);
        }
    } finally {
        rig.mounted.view.unmount();
    }
    return cycles.map(cycle => cycle.removed);
}

const selectFirstCurve = (rig: Rig) => {
    const graph = rig.graph as unknown as {selectCurve?(curve: unknown): void; jxgCurves?: unknown[]};
    if (graph.selectCurve && graph.jxgCurves?.length) act(() => graph.selectCurve!(graph.jxgCurves![0]));
};

/** Cases that reproduce a real leak or duplication, by `family/entry`. */
const KNOWN_FAILURES: Partial<Record<string, string>> = {
    // A3 S3: ph-cubic leaks no objects but remounting the used graph throws: unmount drops the curves, and the PH offset
    // controls render (getFirstJxgCurveAsPHCurve() is undefined) before the new mount rebuilds them. Flip to it() when mount owns that.
    'ph-cubic/remount': 'controls render before the curves are rebuilt',
    'ph-cubic (curve selected)/remount': 'controls render before the curves are rebuilt',
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
    ['linear map', () => graphFactories['linear-map']()],
    ['complex function', () => graphFactories['complex-reciprocal']()],
];

describe.each(FIGURE_FAMILIES)('%s (figure path)', (family, make) => {
    const run = KNOWN_FAILURES[`${family}/reload`] ? it.fails : it;
    run('reload three times leaves the scene as the first did', async () => {
        await runCycles(make, 'reload');
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
            if (entry === 'remount' && family === 'ph-cubic') continue; // known remount failure, see KNOWN_FAILURES
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
