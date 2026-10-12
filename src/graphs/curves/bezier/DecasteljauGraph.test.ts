import DecasteljauGraph from './DecasteljauGraph';
import BaseCurveGraph from '../../base/BaseCurveGraph';
import {Attributes} from '../../attributes/Attributes';

test('keeps the De Casteljau curve clipped after preset data is restored', () => {
    const curve = {
        setIntervalEnd: jest.fn(),
        setAttributes: jest.fn(),
        showDecasteljauPoints: jest.fn(),
    };
    const graph = Object.create(DecasteljauGraph.prototype) as any;
    graph.store.replaceState({t: 0.5, wholeCurve: false});
    graph.parameter = 0.5;
    graph.getFirstJxgCurve = jest.fn(() => curve);

    const importPresetData = jest.spyOn(BaseCurveGraph.prototype, 'importPresetData')
        .mockImplementation(() => undefined);

    try {
        graph.importPresetData([]);

        expect(importPresetData).toHaveBeenCalledWith([]);
        expect(curve.setIntervalEnd).toHaveBeenCalledTimes(1);
        const intervalEnd = curve.setIntervalEnd.mock.calls[0][0];
        expect(intervalEnd()).toBe(0.5);

        graph.store.replaceState({t: 0.5, wholeCurve: true});
        expect(intervalEnd()).toBe(1);
        expect(curve.setAttributes).toHaveBeenCalledWith(Attributes.bezierDisabled);
        expect(curve.showDecasteljauPoints).toHaveBeenCalledTimes(1);
    } finally {
        importPresetData.mockRestore();
    }
});

function graphWithParameter(t: number) {
    const curve = {setDecasteljauT: jest.fn()};
    const graph = Object.create(DecasteljauGraph.prototype) as any;
    const props = {};
    graph.props = props;
    graph.parameter = t;
    graph.store.replaceState({t, v: 1, animationStatus: 'playing', wholeCurve: false});
    graph.graphSession = {isAlive: true};
    graph.board = {suspendUpdate: jest.fn()};
    graph.getFirstJxgCurve = () => curve;
    graph.boardUpdate = jest.fn();
    graph.unsuspendBoardUpdate = jest.fn();
    return {graph, curve, props};
}

test('keeps drawing ahead of a lagging published playback value', () => {
    const {graph, curve, props} = graphWithParameter(0.3);
    graph.publishedParameter = 0.3;
    graph.parameter = 0.42;
    const previous = {...graph.state, t: 0.2};

    graph.onStateChange(previous);

    expect(graph.parameter).toBe(0.42);
    expect(curve.setDecasteljauT).not.toHaveBeenCalled();
    expect(graph.unsuspendBoardUpdate).not.toHaveBeenCalled();
});

test('draws an externally restored parameter with an ordinary update', () => {
    const {graph, curve, props} = graphWithParameter(0.42);
    graph.publishedParameter = 0.42;
    const previous = {...graph.state};
    graph.store.replaceState({...graph.state, t: 0.75, animationStatus: 'paused'});

    graph.onStateChange(previous);

    expect(graph.parameter).toBe(0.75);
    expect(curve.setDecasteljauT).toHaveBeenCalledWith(0.75);
    expect(graph.boardUpdate).toHaveBeenCalledTimes(1);
    expect(graph.unsuspendBoardUpdate).not.toHaveBeenCalled();
});

test('keeps the full refresh for other graph state changes', () => {
    const {graph, curve, props} = graphWithParameter(0.42);
    graph.publishedParameter = 0.3;
    const previous = {...graph.state};
    graph.store.replaceState({...graph.state, curveSelected: true});

    graph.onStateChange(previous);

    expect(curve.setDecasteljauT).toHaveBeenCalledWith(0.42);
    expect(graph.unsuspendBoardUpdate).toHaveBeenCalledTimes(1);
});

test('exports the drawn parameter rather than the lagging display state', () => {
    const {graph} = graphWithParameter(0.3);
    graph.parameter = 0.42;
    const exportPreset = jest.spyOn(BaseCurveGraph.prototype, 'exportPreset')
        .mockImplementation(() => ({id: 'decasteljau', graphState: {t: 0.3}, data: []} as any));
    try {
        expect(graph.exportPreset().graphState.t).toBe(0.42);
    } finally {
        exportPreset.mockRestore();
    }
});
