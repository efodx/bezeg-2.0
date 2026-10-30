import {describe, expect, it} from 'vitest';
import {makeCameraModel, projectToScreen} from './jsxProjection';
import {ORACLE_PROBES, pinholeProject, randomOracleCameras} from './pinholeOracle.test-helper';
import type {SurfaceCamera} from './surfaceScene';

describe('jsxProjection against the independent pinhole oracle', () => {
    it('agrees in NDC, screen position and depth over 240 random cameras and aspect ratios', () => {
        let worstNdc = 0, worstPx = 0, worstDepth = 0, count = 0;
        for (const {camera, viewport} of randomOracleCameras(240)) {
            const model = makeCameraModel(camera, viewport);
            for (const p of ORACLE_PROBES) {
                const mine = projectToScreen(model, ...p);
                const ref = pinholeProject(camera, viewport, p);
                worstNdc = Math.max(worstNdc, Math.abs(mine.ndcX - ref.ndcX), Math.abs(mine.ndcY - ref.ndcY));
                worstPx = Math.max(worstPx, Math.abs(mine.x - ref.x), Math.abs(mine.y - ref.y));
                worstDepth = Math.max(worstDepth, Math.abs(mine.depth - ref.depth));
                count++;
            }
        }
        console.log(`PROJECTION_VS_ORACLE ndc ${worstNdc} px ${worstPx} depth ${worstDepth} over ${count} projections`);
        expect(count).toBe(240 * ORACLE_PROBES.length);
        expect(worstNdc).toBeLessThan(1e-9);
        expect(worstPx).toBeLessThan(1e-6);
        expect(worstDepth).toBeLessThan(1e-9);
    });

    it('puts the target at the viewport centre and one world unit equally wide in both directions', () => {
        const camera: SurfaceCamera = {az: 0.4, el: 0.3, distance: 9, projection: 'perspective', target: [1, 2, 0.5]};
        const model = makeCameraModel(camera, {width: 390, height: 844});
        const centre = projectToScreen(model, 1, 2, 0.5);
        expect(centre.x).toBeCloseTo(195, 9);
        expect(centre.y).toBeCloseTo(422, 9);
        // One unit along the screen-right axis and one along the screen-up axis cover the same number of pixels.
        const right = projectToScreen(model, 1 + Math.cos(0.4), 2 + Math.sin(0.4), 0.5);
        const up = projectToScreen(model, 1 - Math.sin(0.3) * Math.sin(0.4), 2 + Math.sin(0.3) * Math.cos(0.4), 0.5 + Math.cos(0.3));
        expect(Math.abs(right.x - centre.x)).toBeCloseTo(Math.abs(up.y - centre.y), 0);
    });
});
