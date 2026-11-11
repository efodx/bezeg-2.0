import React from 'react';
import {writeFileSync} from 'node:fs';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {DIAGRAM_BINS, DIAGRAM_COLUMNS, diagramPolyline, LogisticMapGraph} from './LogisticMapGraph';

// Measurement behind docs/adr/0054 section 2 (phase-portraits task 03, logistic graph). Opt-in, so the shared unit suite neither
// times nor writes files: `BEZEG_PERF=1 just unit src/graphs/dynamics/LogisticMapGraph.perf` writes the numbers to BEZEG_PERF_OUT.
// JSDOM PLACEHOLDER, not frame times: a jsdom SVG board without paint or a browser; the browser measurement is owed at F2b.
beforeAll(installBoardShims);
vi.setConfig({testTimeout: 120000});

const OUT = process.env.BEZEG_PERF_OUT ?? '.command-logs/ph03e-perf-raw.txt';
const UPDATES = 60;

const median = (values: number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const p95 = (values: number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length * 0.95)];
const fmt = (label: string, values: number[]): string =>
    `${label}: median ${median(values).toFixed(3)} ms, p95 ${p95(values).toFixed(3)} ms, max ${Math.max(...values).toFixed(3)} ms (n=${values.length})`;

(process.env.BEZEG_PERF ? test : test.skip)('logistic graph: diagram build and the redraw after an r or step change (jsdom placeholder)', () => {
    const lines: string[] = [`JSDOM PLACEHOLDER (no paint, no browser). Raster ${DIAGRAM_COLUMNS} x ${DIAGRAM_BINS}.`];

    // Cold: the raster (1000 transient + 300 recorded iterations per column) and the polyline, built once per page.
    const t0 = performance.now();
    const diagram = diagramPolyline();
    const cold = performance.now() - t0;
    lines.push(`diagram build, cold (raster + polyline): ${cold.toFixed(1)} ms; polyline ${diagram.x.length} points`);
    const t1 = performance.now();
    diagramPolyline();
    lines.push(`diagram, second call (memoised): ${(performance.now() - t1).toFixed(4)} ms`);

    class Observed extends LogisticMapGraph {}
    const graph = new Observed();
    const t2 = performance.now();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    lines.push(`first mount, diagram already built: ${(performance.now() - t2).toFixed(1)} ms`);

    // An r change: the cursor, the map, the markers, the captions; the diagram is not redrawn. Periods are computed once per R (200000 steps), so the
    // first visit of an R is timed apart from the second.
    const first: number[] = [];
    const again: number[] = [];
    const start = 250;
    for (const pass of [first, again]) {
        for (let i = 0; i < UPDATES; i++) {
            const R = start + ((i * 7) % 151);
            const t = performance.now();
            act(() => { graph.setState({R}); });
            pass.push(performance.now() - t);
        }
    }
    lines.push(fmt('r change, first visit of each R (period detector runs)', first));
    lines.push(fmt('r change, R already visited (period cached)', again));

    const steps: number[] = [];
    for (let i = 1; i <= UPDATES; i++) {
        const t = performance.now();
        act(() => { graph.setState({step: i}); });
        steps.push(performance.now() - t);
    }
    lines.push(fmt('step change (cobweb path, one marker)', steps));

    writeFileSync(OUT, lines.join('\n') + '\n');
    expect(lines.length).toBeGreaterThan(3);
});
