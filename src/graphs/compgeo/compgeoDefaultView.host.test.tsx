import React from 'react';
import {render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {Board} from 'jsxgraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {Preset} from '../base/presets/Presets';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {EarClippingGraph} from './EarClippingGraph';
import {IntervalSweepGraph} from './IntervalSweepGraph';
import {BentleyOttmannGraph} from './BentleyOttmannGraph';
import {NotablePointsGraph} from './NotablePointsGraph';
import {InscribedAngleGraph} from './InscribedAngleGraph';
import {EAR_CLIPPING_EXAMPLE_1} from './earClippingPresetCollection';
import {INTERVAL_SWEEP_EXAMPLE_1} from './intervalSweepPresetCollection';
import {BENTLEY_OTTMANN_EXAMPLE_1} from './bentleyOttmannPresetCollection';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => window.localStorage.clear());

class ObservedEar extends EarClippingGraph { liveBoard(): Board { return this.board; } }
class ObservedInterval extends IntervalSweepGraph { liveBoard(): Board { return this.board; } }
class ObservedSweep extends BentleyOttmannGraph { liveBoard(): Board { return this.board; } }

type Observed = (ObservedEar | ObservedInterval | ObservedSweep);
const cases: [string, () => Observed, PointSetModel][] = [
    ['ear clipping', () => new ObservedEar(), EAR_CLIPPING_EXAMPLE_1],
    ['interval sweep', () => new ObservedInterval(), INTERVAL_SWEEP_EXAMPLE_1],
    ['segment intersections', () => new ObservedSweep(), BENTLEY_OTTMANN_EXAMPLE_1],
];

describe.each(cases)('%s default view', (_name, create, example) => {
    test('the first view holds the default example with a margin of at least half a unit on every side', () => {
        const graph = create();
        const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
        const [left, top, right, bottom] = graph.liveBoard().getBoundingBox();
        for (const {x, y} of example.points) {
            expect(x - left).toBeGreaterThanOrEqual(0.5);
            expect(right - x).toBeGreaterThanOrEqual(0.5);
            expect(top - y).toBeGreaterThanOrEqual(0.5);
            expect(y - bottom).toBeGreaterThanOrEqual(0.5);
        }
        view.unmount();
    });

    test("a Preset's own view still replaces the default view", () => {
        const graph = create();
        const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
        const fit = vi.spyOn(graph.liveBoard(), 'setBoundingBox');
        graph.importPreset({name: 'saved', data: graph.defaultPreset(), boardState: {boundingBox: [-50, 60, 70, -40]}} as unknown as Preset);
        expect(fit.mock.calls[fit.mock.calls.length - 1][0]).toEqual([-50, 60, 70, -40]);
        view.unmount();
    });
});

class ObservedNotable extends NotablePointsGraph { liveBoard(): Board { return this.board; } }
class ObservedInscribed extends InscribedAngleGraph { liveBoard(): Board { return this.board; } }

// The default triangle (0,0), (7,0), (2,5); its circumcircle has centre (7/2,3/2) and R^2 = 29/2.
const R = Math.sqrt(29 / 2);
const triangleExtent: [number, number][] = [[0, 0], [7, 0], [2, 5], [3.5 - R, 1.5], [3.5 + R, 1.5], [3.5, 1.5 + R], [3.5, 1.5 - R]];

describe.each([
    ['notable points', () => new ObservedNotable()],
    ['inscribed angle', () => new ObservedInscribed()],
] as const)('%s default view', (_name, create) => {
    test('the first view holds the default triangle and its whole circumcircle with a margin', () => {
        const graph = create();
        const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
        const [left, top, right, bottom] = graph.liveBoard().getBoundingBox();
        for (const [x, y] of triangleExtent) {
            expect(x - left).toBeGreaterThanOrEqual(0.5);
            expect(right - x).toBeGreaterThanOrEqual(0.5);
            expect(top - y).toBeGreaterThanOrEqual(0.5);
            expect(y - bottom).toBeGreaterThanOrEqual(0.5);
        }
        view.unmount();
    });
});
