/**
 * Framing of the JSXGraph surface view on the real patch routes: where the board's SVG paths and point3d elements
 * sit, read from the board (not from the pure projection), against the independent pinhole oracle.
 */
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {collectFramingCases, measureJsx, NARROW, type FramingCase} from './jsxFraming.test-helper';
import {expectJsxFramingMatchesOracle} from './jsxFramingOracle.test-helper';

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
        await expectJsxFramingMatchesOracle(cases);
    }, 300_000);

    it('shows every control point of the tensor and triangular default views inside a 390x844 host', async () => {
        const defaults = cases.filter(c => /^(tensor|triangular)\/default\/stored$/.test(c.name));
        expect(defaults.map(c => c.name).sort()).toEqual(['tensor/default/stored', 'triangular/default/stored']);
        const fits = cases.filter(c => /^(tensor|triangular)\/.+\/fit narrow/.test(c.name));
        expect(fits.length).toBeGreaterThanOrEqual(2);
        for (const framing of [...defaults, ...fits]) {
            const measurement = await measureJsx(framing.scene, NARROW);
            expect(framing.scene.points.length, framing.name).toBeGreaterThan(0);
            for (const point of framing.scene.points) {
                const sample = measurement.samples.find(s => s.world.every((v, k) => Math.abs(v - point.xyz[k]) < 1e-9));
                expect(sample, `${framing.name} point ${point.id} was not drawn`).toBeDefined();
                expect(sample!.x, `${framing.name} ${point.id} x`).toBeGreaterThanOrEqual(0);
                expect(sample!.x, `${framing.name} ${point.id} x`).toBeLessThanOrEqual(NARROW.width);
                expect(sample!.y, `${framing.name} ${point.id} y`).toBeGreaterThanOrEqual(0);
                expect(sample!.y, `${framing.name} ${point.id} y`).toBeLessThanOrEqual(NARROW.height);
            }
        }
    }, 120_000);
});
