import JXG, {Board} from 'jsxgraph';
import {JXGPHBezierCurve} from './JXGPHBezierCurve';
import {GraphPalette} from '../../styles/GraphPalette';

// The offset distance property (every point at the set distance along the normal) is tested in
// src/bezeg/impl/curve/ph-math.test.ts ("offset curve lies at distance d from the PH curve along the normal").

let board: Board;

beforeEach(() => {
    const host = document.createElement('div');
    host.id = 'ph-offset-family';
    document.body.appendChild(host);
    board = JXG.JSXGraph.initBoard(host.id, {boundingbox: [-2, 6, 8, -2], renderer: 'no', showCopyright: false, showNavigation: false});
});

afterEach(() => {
    JXG.JSXGraph.freeBoard(board);
    document.body.innerHTML = '';
});

describe('PH offsets are drawn as one ordered family', () => {
    function offsets(count: number) {
        const curve = new JXGPHBezierCurve([[0, 0], [1, 2], [3, 2], [4, 0]], board);
        curve.setOffsetCurveNumber(count);
        curve.generateJsxOffsetCurves();
        const drawn = (curve as any).jsxOffsetCurves as JXG.Curve[];
        return {curve, drawn};
    }
    const prop = (object: JXG.GeometryElement, name: string) => (object as any).evalVisProp(name);

    it('all offsets are blue and solid, equally thin, and fade outward', () => {
        const {curve, drawn} = offsets(3);
        expect(drawn).toHaveLength(3);
        const baseWidth = prop((curve as any).jxgCurve, 'strokewidth');
        const widths = drawn.map(o => prop(o, 'strokewidth'));
        drawn.forEach(o => {
            expect(prop(o, 'strokecolor')).toBe(GraphPalette.comparisonCurve);
            expect(prop(o, 'dash')).toBe(0);
        });
        expect(new Set(widths).size).toBe(1);
        expect(widths[0]).toBeLessThan(baseWidth);
        const opacities = drawn.map(o => prop(o, 'strokeopacity'));
        expect(opacities[0]).toBe(1);
        opacities.slice(1).forEach((value, i) => expect(value).toBeLessThanOrEqual(opacities[i]));
        expect(opacities[2]).toBeCloseTo(0.64, 12);
        expect(Math.min(...opacities)).toBeGreaterThanOrEqual(0.4);
    });
});
