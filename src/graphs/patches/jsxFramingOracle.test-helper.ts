/**
 * The framing check of the JSXGraph surface view against the pinhole oracle, used by the framing test.
 */
import {expect} from 'vitest';
import {controlNetPoints, measureJsx, measuredNetBounds, screenBounds, type FramingCase} from './jsxFraming.test-helper';
import {pinholeProject} from './surface-view/pinholeOracle.test-helper';

const TOLERANCE_PX = 0.5;

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
