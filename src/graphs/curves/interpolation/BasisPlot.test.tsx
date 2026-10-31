import React from 'react';
import {act, render, screen} from '@testing-library/react';
import {formatNumber} from '../../../analysis/format';
import {setLanguage} from '../../../localization';
import {BasisPlot, basisColor, pathOf, scaleOf} from './BasisPlot';
import {basisPlotData, bernsteinBasisAt} from './interpolationBasis';
import {curveParameters, lagrangeBasis} from '../../../analysis/interpolation';

const points = [[0, 0], [1, 2], [3, 3], [4, 0]] as const;
const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

test('the Lagrange basis is cardinal at the parameters and sums to 1 everywhere; the Bernstein basis sums to 1', () => {
    for (const rule of ['uniform', 'chord'] as const) {
        const nodes = curveParameters(points, rule);
        nodes.forEach((tj, j) => {
            const values = lagrangeBasis(nodes, tj);
            values.forEach((v, i) => expect(v).toBe(i === j ? 1 : 0));
        });
        for (const t of [0.13, 0.5, 1.7, nodes[3] * 0.93]) expect(sum(lagrangeBasis(nodes, t))).toBeCloseTo(1, 12);
    }
    for (const s of [0, 0.2, 0.5, 0.97, 1]) expect(sum(bernsteinBasisAt(3, s))).toBeCloseTo(1, 12);
});

test('the plotted samples are the library functions: every sample equals lagrangeBasis / Bernstein weights, with n + 1 curves', () => {
    const data = basisPlotData(points, 'chord', 0.3);
    const nodes = curveParameters(points, 'chord');
    expect(data.lagrange.length).toBe(4);
    expect(data.bernstein.length).toBe(4);
    expect(data.tEnd).toBeCloseTo(nodes[3], 12);
    for (const k of [0, 17, 80, 160]) {
        const [t] = data.lagrange[0][k];
        expect(t).toBeCloseTo(nodes[3] * k / 160, 12);
        const expected = lagrangeBasis(nodes, t);
        data.lagrange.forEach((curve, i) => expect(curve[k][1]).toBeCloseTo(expected[i], 12));
        const b = bernsteinBasisAt(3, k / 160);
        data.bernstein.forEach((curve, i) => { expect(curve[k][0]).toBeCloseTo(k / 160, 12); expect(curve[k][1]).toBeCloseTo(b[i], 12); });
    }
    // The end samples hit the nodes exactly: l_0(0) = 1 and l_3(t_n) = 1.
    expect(data.lagrange[0][0][1]).toBe(1);
    expect(data.lagrange[3][160][1]).toBe(1);
});

test('the markers sit at s on the Bernstein scale and at t = s t_n on the Lagrange scale with the basis values there', () => {
    const data = basisPlotData(points, 'uniform', 0.5);
    expect(data.bernsteinMarker.x).toBe(0.5);
    expect(data.lagrangeMarker.x).toBe(1.5);
    expect(data.lagrangeMarker.values.map(v => Math.round(v * 10000) / 10000)).toEqual([-0.0625, 0.5625, 0.5625, -0.0625]);
    expect(data.bernsteinMarker.values).toEqual([0.125, 0.375, 0.375, 0.125]);
});

test('the component draws one path per basis function from the data, in the same colour per index in both plots, and the marker follows s', () => {
    const data = basisPlotData(points, 'uniform', 0.25);
    const {rerender} = render(<BasisPlot data={data}/>);
    for (const [id, curves] of [['basis-lagrange', data.lagrange], ['basis-bernstein', data.bernstein]] as const) {
        const paths = screen.getByTestId(id).querySelectorAll('path');
        expect(paths.length).toBe(4);
        const scale = scaleOf(curves, id === 'basis-lagrange' ? data.tEnd : 1);
        paths.forEach((path, i) => {
            expect(path.getAttribute('d')).toBe(pathOf(curves[i], scale));
            expect(path.getAttribute('stroke')).toBe(basisColor(i, 4));
        });
        expect(screen.getByTestId(id).querySelectorAll('circle').length).toBe(4);
    }
    const x1 = () => Number(screen.getByTestId('basis-bernstein-marker-line').getAttribute('x1'));
    const first = x1();
    rerender(<BasisPlot data={basisPlotData(points, 'uniform', 0.75)}/>);
    expect(x1()).toBeGreaterThan(first);
    // The left pad follows the text size; the plot spans padLeft .. 290 in viewBox units.
    const pad = scaleOf(data.bernstein, 1).padLeft;
    expect(first).toBeCloseTo(pad + 0.25 * (290 - pad), 6);
    expect(x1()).toBeCloseTo(pad + 0.75 * (290 - pad), 6);
});

test('a path built from fewer samples than the data is a different path', () => {
    const data = basisPlotData(points, 'uniform', 0.5);
    const scale = scaleOf(data.lagrange, data.tEnd);
    expect(pathOf(data.lagrange[1].slice(0, 80), scale)).not.toBe(pathOf(data.lagrange[1], scale));
    expect(pathOf(data.lagrange[1], scale).split('L').length).toBe(161);
});

const text = (id: string) => [...screen.getByTestId(id).querySelectorAll('text')].map(node => node.textContent);

test('tick labels follow the language: 0,5 in Slovenian, 0.5 in English, switched live', () => {
    const half = [[0, 0], [0.5, 0]] as const;
    render(<BasisPlot data={basisPlotData(half, 'chord', 0.5)}/>);
    try {
        expect(text('basis-lagrange')).toContain('0,5');
        act(() => setLanguage('en'));
        expect(text('basis-lagrange')).toContain('0.5');
        expect(text('basis-lagrange')).not.toContain('0,5');
        act(() => setLanguage('sl'));
        expect(text('basis-lagrange')).toContain('0,5');
    } finally {
        setLanguage('sl');
    }
});

test('the curve index is not conveyed by hue alone: a numbered legend, a title and a description with the marker values', () => {
    render(<BasisPlot data={basisPlotData(points, 'uniform', 0.5)}/>);
    expect(screen.getAllByTestId('basis-legend-item').map(item => item.textContent)).toEqual(['0', '1', '2', '3']);
    const svg = screen.getByTestId('basis-lagrange').querySelector('svg')!;
    expect(svg.querySelector('title')!.textContent).toContain('Lagrange');
    const desc = svg.querySelector('desc')!.textContent!;
    expect(desc).toContain('4 krivulj');
    expect(desc).toContain('-0,06; 0,56; 0,56; -0,06'.replace(/-/g, '−'));
    expect(svg.getAttribute('aria-labelledby')).toContain(svg.querySelector('desc')!.id);
});

test('the axis labels follow the display font size and name the extreme the curves reach', () => {
    const size = (fontSize: number) => {
        const view = render(<BasisPlot data={basisPlotData(points, 'uniform', 0.5)} fontSize={fontSize}/>);
        const sizes = [...screen.getByTestId('basis-lagrange').querySelectorAll('text')].map(node => parseFloat((node as unknown as SVGElement).style.fontSize));
        const labels = text('basis-lagrange');
        view.unmount();
        return {sizes, labels};
    };
    const small = size(16);
    const large = size(30);
    expect(Math.min(...large.sizes)).toBeGreaterThan(Math.max(...small.sizes));
    // The cubic's lobes leave [0, 1]: the highest value reached and the lowest are labelled besides 0 and 1.
    const data = basisPlotData(points, 'uniform', 0.5);
    const all = data.lagrange.flatMap(curve => curve.map(row => row[1]));
    expect(small.labels.length).toBe(3 + 2);
    expect(small.labels).toContain(formatNumber(Math.min(...all), 'sl', 2));
    expect(Math.min(...all)).toBeLessThan(-0.1);
});
