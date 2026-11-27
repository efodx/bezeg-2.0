import React from 'react';
import {render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {PointInPolygonGraph} from '../compgeo/PointInPolygonGraph';
import {GraphHost} from './GraphHost';
import {installBoardShims} from './realGraphTestHarness';
import {directorEligible} from '../../workspace/view/viewDirector';
import type {GraphDeclaration} from './declare/graphDeclaration';

beforeAll(() => installBoardShims());

class UndeclaredPointInPolygon extends PointInPolygonGraph {
    protected override declaration(): GraphDeclaration | undefined {
        return undefined;
    }
}

function mount(graph: PointInPolygonGraph): PointInPolygonGraph {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
}

const eligible = (graph: PointInPolygonGraph) =>
    directorEligible({marks: {} as never, boundKeys: graph.parameters?.keys(), surface: false});

test('a declared graph with no parameter bindings binds view, so its view director is eligible', () => {
    const graph = mount(new PointInPolygonGraph());
    expect(graph.parameters).toBeDefined();
    expect(graph.parameters!.keys()).toContain('view');
    expect(eligible(graph)).toBe(true);
});

test('an undeclared graph with no parameter bindings gets no arbiter and no director', () => {
    const graph = mount(new UndeclaredPointInPolygon());
    expect(graph.parameters).toBeUndefined();
    expect(eligible(graph)).toBe(false);
});
