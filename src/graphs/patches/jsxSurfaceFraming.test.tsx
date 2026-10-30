/**
 * Framing of the JSXGraph surface view on the real patch routes: where the board's SVG paths and point3d elements
 * sit, read from the board (not from the pure projection), against the independent pinhole oracle.
 */
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {collectFramingCases, controlNetPoints, measureJsx, measuredNetBounds, screenBounds, type FramingCase} from './jsxFraming.test-helper';
import {pinholeProject} from './surface-view/pinholeOracle.test-helper';

const TOLERANCE_PX = 0.5;
let cases: FramingCase[] = [];

describe('JSXGraph surface view framing on the patch routes', () => {
    beforeAll(() => {
        installBoardShims();
        cases = collectFramingCases();
    }, REAL_GRAPH_TEST_TIMEOUT);
    afterAll(() => { cases = []; });

    it('covers every patch route, stored and fitted cameras, both viewports', () => {
        expect(cases.length).toBeGreaterThanOrEqual(40);
        for (const route of ['tensor', 'triangular', 'decasteljau', 'derivatives', 'subdivision', 'joins']) {
            expect(cases.some(c => c.name.startsWith(`${route}/`) && c.name.includes('fit')), route).toBe(true);
        }
        expect(cases.some(c => c.name.includes('join-teapot'))).toBe(true);
        const sizes = new Set(cases.flatMap(c => c.viewports.map(v => v.name)));
        expect(sizes.size).toBe(2);
    });

    it('draws every vertex and point where the oracle puts it', async () => {
        let checked = 0, worst = 0;
        for (const framing of cases) {
            for (const viewport of framing.viewports) {
                const measurement = await measureJsx(framing.scene, viewport);
                expect(measurement.samples.length, `${framing.name} ${viewport.name} drew nothing`).toBeGreaterThan(0);
                expect(controlNetPoints(framing.scene).length, `${framing.name} has no control net`).toBeGreaterThan(0);
                for (const sample of measurement.samples) {
                    const expected = pinholeProject(framing.scene.camera, viewport, sample.world);
                    const dx = Math.abs(sample.x - expected.x), dy = Math.abs(sample.y - expected.y);
                    worst = Math.max(worst, dx, dy);
                    if (dx > TOLERANCE_PX || dy > TOLERANCE_PX) {
                        throw new Error(`${framing.name} @ ${viewport.name}: world ${sample.world.join(',')} drawn at ${sample.x.toFixed(2)},${sample.y.toFixed(2)}, oracle ${expected.x.toFixed(2)},${expected.y.toFixed(2)}`);
                    }
                    checked++;
                }
                const net = measuredNetBounds(framing.scene, measurement);
                const oracle = screenBounds(controlNetPoints(framing.scene).map(p => pinholeProject(framing.scene.camera, viewport, p)));
                for (const key of ['minX', 'maxX', 'minY', 'maxY'] as const) {
                    expect(Math.abs(net[key] - oracle[key]), `${framing.name} @ ${viewport.name} net ${key}`).toBeLessThanOrEqual(TOLERANCE_PX);
                }
            }
        }
        expect(checked).toBeGreaterThan(1000);
        console.log(`framing: ${cases.length} cases, ${checked} samples, worst ${worst.toExponential(2)} px`);
    }, 300_000);
});
