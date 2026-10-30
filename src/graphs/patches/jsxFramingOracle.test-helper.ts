/**
 * The framing check of the JSXGraph surface view against the pinhole oracle, shared by the framing test files. Every
 * mounted board stays reachable for a while after it is disposed, so the cases are split over two test files (each
 * runs in its own worker) to stay inside the default heap.
 */
import {expect} from 'vitest';
import {controlNetPoints, measureJsx, measuredNetBounds, screenBounds, type FramingCase} from './jsxFraming.test-helper';
import {pinholeProject} from './surface-view/pinholeOracle.test-helper';

const TOLERANCE_PX = 0.5;

/** The cases of half `half` (0 or 1) of `cases`: alternate cases, so both halves cover every route. */
export const framingHalf = (cases: FramingCase[], half: 0 | 1): FramingCase[] => cases.filter((_, index) => index % 2 === half);

export async function expectJsxFramingMatchesOracle(cases: FramingCase[]): Promise<void> {
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
}
