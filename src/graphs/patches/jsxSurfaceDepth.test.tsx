/**
 * Depth check of the JSXGraph surface view on the real patch routes at the four camera presets: no control net or
 * construction line is painted on the wrong side of the surface, judged per element against the pinhole oracle.
 */
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {collectDepthCases, DESKTOP, type FramingCase} from './jsxFraming.test-helper';
import {checkDepthOrder} from './jsxDepthCheck.test-helper';

/** Lines within this many mean mesh edges of the surface count as lying on it: the painter orders by the triangle centroid and gives lines a half-edge bias, so a closer line cannot be told apart (iso lines, boundaries). Control nets hover well beyond it. */
const ON_SURFACE_EDGES = 1.25;
let cases: FramingCase[] = [];

describe('JSXGraph surface view depth order on the patch routes', () => {
    beforeAll(() => {
        installBoardShims();
        cases = collectDepthCases();
    }, REAL_GRAPH_TEST_TIMEOUT);
    afterAll(() => { cases = []; });

    it('covers tensor, triangular, joins and the teapot at the four camera presets', () => {
        expect(cases.length).toBe(16);
        for (const route of ['tensor/', 'triangular/', 'joins/', 'joins/join-teapot/']) {
            for (const preset of ['front', 'top', 'side', 'isometric']) {
                expect(cases.some(c => c.name.startsWith(route) && c.name.endsWith(`/${preset}`)), `${route}${preset}`).toBe(true);
            }
        }
    });

    it('paints every line on the right side of the surface', async () => {
        const failures: string[] = [];
        let decisiveTotal = 0;
        for (const framing of cases) {
            const report = await checkDepthOrder(framing.scene, DESKTOP, ON_SURFACE_EDGES);
            console.log(`depth ${framing.name}: ${report.triangles} tris, ${report.pieces} pieces, ${report.tested} tested, ${report.decisive} decisive, ${report.violations.length} violations ${JSON.stringify(report.byRole)}`);
            expect(report.triangles, `${framing.name} has no mesh`).toBeGreaterThan(0);
            expect(report.pieces, `${framing.name} has no line pieces`).toBeGreaterThan(0);
            expect(report.tested, `${framing.name}: no line piece overlapped the mesh`).toBeGreaterThan(0);
            decisiveTotal += report.decisive;
            if (framing.name.startsWith('joins/')) expect(report.decisive, `${framing.name}: no line was clearly off the surface`).toBeGreaterThan(0);
            if (report.violations.length) failures.push(`${framing.name}: ${report.violations.length} ${JSON.stringify(report.byRole)}`);
        }
        expect(decisiveTotal, 'the check never saw a line clearly off the surface').toBeGreaterThan(0);
        expect(failures).toEqual([]);
    }, 300_000);
});
