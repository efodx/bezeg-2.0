import BaseCurveGraph from './BaseCurveGraph';
import {JXGRationalBezierCurve} from '../curves/object/JXGRationalBezierCurve';

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
