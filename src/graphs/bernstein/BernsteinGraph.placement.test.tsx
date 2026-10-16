import React from 'react';
import {render, screen} from '@testing-library/react';
import {t} from '../../localization';
import BaseGraph from '../base/BaseGraph';
import {BernsteinGraph} from './BernsteinGraph';

beforeEach(() => {
    vi.spyOn(BaseGraph.prototype as any, 'workspaceGraphDisplay').mockReturnValue(null);
});
afterEach(() => {
    vi.restoreAllMocks();
});

function bernsteinGraph(isSumGraph: boolean) {
    const graph = Object.create(BernsteinGraph.prototype) as any;
    graph.store.replaceState({initialized: true, n: 4, isSumGraph, showLabels: false});
    return graph;
}

test('the stacked area chart switch is a representation option in Display', () => {
    const graph = bernsteinGraph(true);
    render(<>{graph.workspaceGraphDisplay()}</>);
    expect(screen.getByRole('checkbox', {name: t('stacked_area_chart')})).toBeChecked();
});

test('Edit keeps the degree stepper and no longer carries the representation switch', () => {
    const graph = bernsteinGraph(false);
    const labels = (graph.getGraphCommands() as React.ReactElement<{label?: string}>[]).map(element => element.props.label);
    expect(labels).toContain(t('polynomial_degree_label'));
    expect(labels).not.toContain(t('stacked_area_chart'));
});
