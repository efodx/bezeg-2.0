/**
 * Test support: the restoration contract for guided lessons, run by the `lessonRestoration.part*.test.tsx` files.
 * Every guided lesson, run through the real `LessonSession` on its real graph: the graph is edited, the lesson is
 * started, walked through every frame (exploration, frame actions, animations, a step back) and closed, then entered
 * again across a scene boundary and closed.
 * Each close must restore the edited scene (Preset data, scene and transient state, drawn board, controls, child-board
 * view) and leave no extra board objects, child boards or running animations, and the graph must keep responding to
 * later edits like a graph that never ran the lesson. Completion keeps the final scene; a disposed graph is left alone.
 */
import {act} from '@testing-library/react';
import JXG from 'jsxgraph';
import BaseGraph, {BaseGraphState} from '../../graphs/base/BaseGraph';
import {createGraph, installBoardShims, type MountedGraph, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {applyActions, changeScene, flipSwitches, full, hodograph, internals, sceneActions} from '../../graphs/base/realGraphScenes';
import type {DemonstrationId} from '../../demonstrations';
import {appStorage} from '../../storage/appStorage';
import {framesForLessonStep, type LessonAction, type LessonAnimationId} from '../model';
import {AnimationDriver} from './animation';
import {PatchSweeps} from '../../graphs/patches/patchSweep';
import {GUIDED_LESSON_AVAILABLE_IDS, getLessonForDemonstration} from './lessonCatalog';
import {LessonSession} from './LessonSession';

/** The contract is split across this many test files, so each runs in its own worker with its own memory. */
export const LESSON_RESTORATION_PARTS = 4;

/** Animation drivers the graph owns, directly or through a controller (an iteration controller's driver). */
function drivers(graph: BaseGraph<BaseGraphState>): Pick<AnimationDriver, 'isRunning'>[] {
    return Object.values(graph as object).flatMap(value => {
        if (value instanceof AnimationDriver) return [value];
        if (value instanceof PatchSweeps) return [
            {isRunning: () => value.isRunning('u')},
            {isRunning: () => value.isRunning('v')},
        ];
        const nested = (value as {driver?: unknown} | null)?.driver;
        return nested instanceof AnimationDriver ? [nested] : [];
    });
}

/**
 * Board objects the scene owns. Axis tick labels are left out: JSXGraph keeps a pool of them, hiding spares, and its
 * size depends on which views were drawn before.
 */
function owned(board: JXG.Board | undefined): number | null {
    if (!board) return null;
    const objects = board.objectsList as unknown as Array<{elType: string; labels?: unknown[]}>;
    const tickLabels = new Set(objects.flatMap(object => object.elType === 'ticks' ? object.labels ?? [] : []));
    return objects.filter(object => !tickLabels.has(object)).length;
}

/** What a scene owns besides what it shows: board objects, live boards (child boards included) and running animations. */
function resources(graph: BaseGraph<BaseGraphState>) {
    return {
        objects: owned(internals(graph).board),
        hodographObjects: owned(hodograph(graph)),
        boards: Object.keys(JXG.boards as Record<string, JXG.Board>).length,
        runningAnimations: drivers(graph).filter(driver => driver.isRunning()).length,
    };
}

function session(id: DemonstrationId, mounted: MountedGraph): LessonSession {
    return new LessonSession(getLessonForDemonstration(id)!, mounted.graph.getLessonCapabilities());
}

const atLastFrame = (lesson: LessonSession) => {
    const {stepIndex, frameIndex} = lesson.snapshot();
    return stepIndex === lesson.lesson.steps.length - 1
        && frameIndex === framesForLessonStep(lesson.lesson.steps[stepIndex]).length - 1;
};

/** Actions that build on the current curve (each subdivision doubles it) and so are explored once per walk. */
const COMPOUNDING = new Set(['subdivide', 'degree-elevation']);

/**
 * A learner's changes while exploring: the scene actions, with subdivision last so it uses the explored parameter, and
 * compounding actions only on the first exploration.
 */
function exploration(graph: BaseGraph<BaseGraphState>, explored: boolean, variant: 'a' | 'b' = 'b'): LessonAction[] {
    const actions = sceneActions(graph, variant);
    const once = explored ? [] : actions.filter(action => COMPOUNDING.has(action.kind));
    return [...actions.filter(action => !COMPOUNDING.has(action.kind)), ...once];
}

/**
 * Starts the lesson and walks it the way a learner would, one host commit per transition: explores each observation
 * frame (leaving and re-entering it, then changing the scene), applies each frame's action and plays each frame's
 * animation, up to the last frame or the first frame of step `lastStep`; then steps back once and forward again and
 * plays the last animation once more.
 */
function walk(mounted: MountedGraph, lesson: LessonSession, lastStep = Infinity): void {
    const {graph} = mounted;
    let explored = false;
    let animation: LessonAnimationId | undefined;
    act(() => lesson.start());
    for (;;) {
        const {stepIndex, frameIndex} = lesson.snapshot();
        const frame = framesForLessonStep(lesson.lesson.steps[stepIndex])[frameIndex];
        if (frame.kind === 'observation') {
            act(() => lesson.showContent());
            act(() => lesson.explore());
            act(() => applyActions(graph, exploration(graph, explored)));
            explored = true;
        }
        if (frame.action) act(() => lesson.applyCurrentAction());
        if (frame.animation) {
            animation = frame.animation.animationId;
            act(() => lesson.applyAnimation(animation!, 'play'));
        }
        if (atLastFrame(lesson) || stepIndex >= lastStep) break;
        act(() => lesson.next());
    }
    const reached = lesson.snapshot();
    act(() => lesson.back());
    act(() => lesson.next());
    expect(lesson.snapshot()).toEqual(reached);
    // Leave playback running, so the session's close has to stop it.
    if (animation) {
        act(() => lesson.applyAnimation(animation!, 'play'));
        expect(drivers(graph).some(driver => driver.isRunning())).toBe(true);
    }
}

/** Runs the contract for every `LESSON_RESTORATION_PARTS`-th guided lesson from `part` (0-based); the part files cover the catalog. */
export function describeLessonRestoration(part: number): void {
    vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
    beforeAll(installBoardShims);
    beforeEach(() => appStorage.clear());
    afterEach(() => vi.restoreAllMocks());
    const ids = GUIDED_LESSON_AVAILABLE_IDS.filter((_id, index) => index % LESSON_RESTORATION_PARTS === part);

    describe.each(ids)('%s', id => {
        test('closing the lesson restores the edited graph and its resources, twice; it stays interactive; finishing keeps the final scene', () => {
            const mounted = mountGraph(createGraph(id));
            changeScene(mounted, 'a');
            // The edit can leave hidden leftovers a restore does not rebuild (the Elevation overlay's replaced polygon), so
            // the baseline is the edited scene as its own checkpoint restores it; the scene itself is unchanged by that.
            const capabilities = mounted.graph.getLessonCapabilities();
            const edited = full(mounted);
            act(() => capabilities.restoreState(capabilities.captureState()));
            const captured = full(mounted);
            expect(captured).toEqual(edited);
            expect(captured.board.length).toBeGreaterThan(0);
            const baseline = resources(mounted.graph);

            // The first session walks every frame; the second re-enters the restored graph and crosses one scene
            // boundary each way, which is where a stale checkpoint or a resource kept between sessions would show.
            for (const lastStep of [Infinity, 1]) {
                const lesson = session(id, mounted);
                walk(mounted, lesson, lastStep);
                expect(full(mounted)).not.toEqual(captured);
                act(() => lesson.close());
                expect(lesson.snapshot().status).toBe('closed');
                expect(full(mounted)).toEqual(captured);
                expect(resources(mounted.graph)).toEqual(baseline);
            }

            // Restorable state that is not drawn shows only after a later change: the same change on a twin that never
            // ran the lesson must look the same.
            const twin = mountGraph(createGraph(id));
            changeScene(twin, 'a');
            expect(full(twin)).toEqual(captured);
            for (const graph of [mounted, twin]) {
                flipSwitches(graph);
                act(() => applyActions(graph.graph, sceneActions(graph.graph, 'b')));
            }
            const continued = full(mounted);
            expect(continued).toEqual(full(twin));
            expect(resources(mounted.graph)).toEqual(resources(twin.graph));
            twin.view.unmount();

            // Completion needs only the last frame, reached in one tick; then a change of the learner's own, which differs
            // from the one made above so the final scene shows.
            const lesson = session(id, mounted);
            act(() => {
                lesson.start();
                while (!atLastFrame(lesson)) lesson.next();
            });
            act(() => applyActions(mounted.graph, exploration(mounted.graph, true, 'a')));
            act(() => lesson.next());
            expect(lesson.snapshot().status).toBe('complete');
            const finished = full(mounted);
            expect(finished).not.toEqual(continued);
            act(() => lesson.close());
            expect(full(mounted)).toEqual(finished);
            mounted.view.unmount();
        // Three sessions on a real graph: up to 20 s alone for the slowest lessons, about twice that under parallel load.
        }, 120000);

        test('closing the lesson after its graph is disposed leaves the graph alone', () => {
            const mounted = mountGraph(createGraph(id));
            const lesson = session(id, mounted);
            act(() => lesson.start());
            act(() => lesson.next());
            mounted.view.unmount();
            expect(mounted.graph.getLessonCapabilities().isAvailable?.()).toBe(false);
            const disposed = mounted.graph.state;
            expect(() => lesson.close()).not.toThrow();
            expect(mounted.graph.state).toBe(disposed);
            expect(lesson.snapshot().status).toBe('closed');
        });
    });
}
