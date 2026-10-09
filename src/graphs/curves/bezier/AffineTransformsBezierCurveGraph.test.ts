import AffineTransformBezierCurveGraph from './AffineTransformsBezierCurveGraph';

test('owns affine guided actions and updates the board after each operation', () => {
    const curve = {
        moveFor: jest.fn(),
        scale: jest.fn(),
        rotate: jest.fn(),
        flip: jest.fn(),
    };
    const graph = Object.create(AffineTransformBezierCurveGraph.prototype) as any;
    graph.getFirstCurve = jest.fn(() => curve);
    graph.boardUpdate = jest.fn();

    graph.applyLessonAction({kind: 'affine-transform', operation: 'translate-x', value: 0.5});
    graph.applyLessonAction({kind: 'affine-transform', operation: 'translate-y', value: -0.25});
    graph.applyLessonAction({kind: 'affine-transform', operation: 'scale', value: 1.2});
    graph.applyLessonAction({kind: 'affine-transform', operation: 'rotate', value: Math.PI / 10});
    graph.applyLessonAction({kind: 'affine-transform', operation: 'reflect-x'});
    graph.applyLessonAction({kind: 'affine-transform', operation: 'reflect-y'});

    expect(curve.moveFor).toHaveBeenNthCalledWith(1, 0.5, 0);
    expect(curve.moveFor).toHaveBeenNthCalledWith(2, 0, -0.25);
    expect(curve.scale).toHaveBeenCalledWith(1.2);
    expect(curve.rotate).toHaveBeenCalledWith(Math.PI / 10);
    expect(curve.flip).toHaveBeenNthCalledWith(1, false, true);
    expect(curve.flip).toHaveBeenNthCalledWith(2, true, false);
    expect(graph.boardUpdate).toHaveBeenCalledTimes(6);
});
