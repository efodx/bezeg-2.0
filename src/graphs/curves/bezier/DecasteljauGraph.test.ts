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
    graph.state = {t: 0.5, wholeCurve: false};
    graph.getFirstJxgCurve = jest.fn(() => curve);

    const importPresetData = jest.spyOn(BaseCurveGraph.prototype, 'importPresetData')
        .mockImplementation(() => undefined);

    try {
        graph.importPresetData([]);

        expect(importPresetData).toHaveBeenCalledWith([]);
        expect(curve.setIntervalEnd).toHaveBeenCalledTimes(1);
        const intervalEnd = curve.setIntervalEnd.mock.calls[0][0];
        expect(intervalEnd()).toBe(0.5);

        graph.state = {t: 0.5, wholeCurve: true};
        expect(intervalEnd()).toBe(1);
        expect(curve.setAttributes).toHaveBeenCalledWith(Attributes.bezierDisabled);
        expect(curve.showDecasteljauPoints).toHaveBeenCalledTimes(1);
    } finally {
        importPresetData.mockRestore();
    }
});
