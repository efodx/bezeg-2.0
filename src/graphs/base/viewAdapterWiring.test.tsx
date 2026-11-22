import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {TaylorGraph} from '../functions/TaylorGraph';
import {GraphHost} from './GraphHost';
import {installBoardShims, settle} from './realGraphTestHarness';
import {runAs} from './writes/writeSource';
import {viewBoxesEqual, type ViewBox} from './writes/viewAdapter';
import type {LeaseEndReason} from './writes/parameterArbiter';

beforeAll(() => installBoardShims());

/** A real graph (Taylor, a pilot with an arbiter) through the real host and board, with its view exposed. */
class ViewTaylorGraph extends TaylorGraph {
    viewAdapter() {
        return this.boardView;
    }
}

function mountTaylor(): ViewTaylorGraph {
    const graph = new ViewTaylorGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
}

const OTHER_BOX: ViewBox = [-3, 4, 5, -4];

test('a pilot binds its view as the view key, and a learner Reset ends a lease on it', async () => {
    const graph = mountTaylor();
    expect(graph.parameters!.keys()).toContain('view');
    const ended: LeaseEndReason[] = [];
    const lease = graph.parameters!.lease(['view'], reason => ended.push(reason));
    expect(lease).toBeDefined();
    expect(lease!.active).toBe(true);
    await settle(() => graph.reset());
    expect(lease!.active).toBe(false);
    expect(ended).toHaveLength(1);
});

test('a preset exported while a fitted box is shown stores and restores the intent box, not the fitted one', () => {
    const graph = mountTaylor();
    const adapter = graph.viewAdapter();
    act(() => runAs('learner', () => { adapter.setIntent(OTHER_BOX, {keepAspectRatio: false}); }));
    const intent = adapter.intent().box;
    const lease = graph.parameters!.lease(['view'])!;
    const fitted: ViewBox = [-100, 100, 100, -100];
    expect(adapter.setFitted(fitted, lease)).toBe(true);
    expect(viewBoxesEqual(adapter.fitted()!, fitted)).toBe(true);

    const exported = graph.exportPreset();
    expect(viewBoxesEqual(exported.boardState!.boundingBox, intent)).toBe(true);
    expect(viewBoxesEqual(exported.boardState!.boundingBox, fitted)).toBe(false);

    const other = mountTaylor();
    act(() => runAs('learner', () => { other.importPreset(exported); }));
    expect(viewBoxesEqual(other.viewAdapter().intent().box, intent)).toBe(true);
});
