import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {interpolationGuidedLessons} from './interpolationGuidedLessons';
import type {LessonAction} from '../model';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import type {DemonstrationId} from '../../demonstrations';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => window.localStorage.clear());

/**
 * Decision 6 on the two lesson scenes that add points (inventory part 3b): the view refits only when the new point or its tangent tip is
 * outside it. The nominal boxes of the inventory are set after the default scene (the canvas aspect of a test would otherwise widen them). Each scene's actions run in one synchronous sequence; the box is read after every add. Nominal boxes (before JSXGraph's
 * aspect fit) are in the inventory; here the claim is "unchanged" / "changed at the second add".
 */
function sceneBoxes(demonstrationId: DemonstrationId, stepSceneId: string, nominal: number[]) {
    const lesson = interpolationGuidedLessons.find(entry => entry.demonstrationId === demonstrationId)!;
    const step = lesson.steps.find(candidate => candidate.scene?.id === stepSceneId)!;
    const actions: LessonAction[] = sceneActions(step.scene!);
    const graph = createGraph(demonstrationId);
    const mounted = mountGraph(graph);
    const board = (graph as unknown as {board: {getBoundingBox(): number[]; setBoundingBox(box: number[], keepAspect: boolean): void}}).board;
    const boxes: number[][] = [];
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        for (const action of actions) {
            capabilities.apply(action);
            if (action.kind === 'interpolation' || action.kind === 'hermite' ? action.operation === 'add-point' : false) boxes.push([...board.getBoundingBox()]);
            if (action.kind === 'prepared-scene') {
                // The nominal fitted box of part 3b; keepaspect off so that the canvas shape of the test cannot widen it.
                board.setBoundingBox(nominal, false);
                boxes.splice(0, boxes.length, [...board.getBoundingBox()]);
            }
        }
    });
    const points = (graph.state as unknown as {points: unknown[]}).points.length;
    mounted.view.unmount();
    return {boxes, points};
}

test('interp-fifth-point-added: the added point is inside the fitted view, so the view stays', () => {
    const {boxes, points} = sceneBoxes('interp-lagrange', 'interp-fifth-point-added', [-1.8, 4.8, 5.8, -1.8]);
    expect(points).toBe(5);
    // [after the default scene, after the add]
    expect(boxes).toHaveLength(2);
    expect(boxes[1]).toEqual(boxes[0]);
});

test('hermite-locality-six: the first add keeps the view, the second add (tangent tip past the edge) refits it', () => {
    const {boxes, points} = sceneBoxes('interp-hermite', 'hermite-locality-six', [-1.95, 5.45, 6.95, -4.95]);
    expect(points).toBe(6);
    // [after the default scene, after add 1, after add 2]
    expect(boxes).toHaveLength(3);
    expect(boxes[1]).toEqual(boxes[0]);
    expect(boxes[2]).not.toEqual(boxes[1]);
});
