import BaseCurveGraph from './BaseCurveGraph';
import {JXGRationalBezierCurve} from '../curves/object/JXGRationalBezierCurve';
import DecasteljauGraph from '../curves/bezier/DecasteljauGraph';

test('routes the rational weight-label scene action to the curve owner', () => {
    const graph = Object.create(BaseCurveGraph.prototype) as any;
    const curve = Object.create(JXGRationalBezierCurve.prototype) as any;
    curve.showwWeights = vi.fn();
    graph.getFirstJxgCurve = vi.fn(() => curve);
    graph.boardUpdate = vi.fn();

    graph.applyLessonAction({kind: 'curve-visibility', target: 'weights', visible: true});

    expect(curve.showwWeights).toHaveBeenCalledWith(true);
    expect(graph.boardUpdate).toHaveBeenCalledTimes(1);
});

// Decision 57: an accepted point edit pauses a running De Casteljau run; a refused one does not.
function playingDecasteljau() {
    const graph = Object.create(DecasteljauGraph.prototype) as any;
    graph.parameter = 0.4;
    graph.store.replaceState({t: 0.4, v: 1, animationStatus: 'playing', wholeCurve: false});
    graph.lessonAnimation = {isRunning: () => true, pause: vi.fn()};
    graph.boardUpdate = vi.fn();
    graph.refreshWorkspace = vi.fn();
    graph.requestRender = vi.fn();
    graph.refusalChannel = {clear: vi.fn(), refuse: vi.fn()};
    graph.getFirstJxgCurve = vi.fn(() => ({setDecasteljauT: vi.fn()}));
    graph.unsuspendBoardUpdate = vi.fn();
    graph.board = {suspendUpdate: vi.fn(), getBoundingBox: () => [-100, 100, 100, -100]};
    return graph;
}
const editableCurve = (count: number) => ({getCurve: () => ({getPoints: () => new Array(count).fill(0)}), removePoint: vi.fn()});

test('a typed point edit pauses a playing run', () => {
    const graph = playingDecasteljau();
    graph.afterTypedPointEdit([1, 2]);
    expect(graph.state.animationStatus).toBe('paused');
});

test('removing a point pauses a playing run', () => {
    const graph = playingDecasteljau();
    graph.removePointAt(editableCurve(4), 1);
    expect(graph.state.animationStatus).toBe('paused');
});

test('a refused removal at the minimum keeps the run playing', () => {
    const graph = playingDecasteljau();
    const curve = editableCurve(1);
    graph.removePointAt(curve, 1);
    expect(curve.removePoint).not.toHaveBeenCalled();
    expect(graph.state.animationStatus).toBe('playing');
});
