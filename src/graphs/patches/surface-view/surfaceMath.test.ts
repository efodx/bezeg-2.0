import {describe, expect, it} from 'vitest';
import * as THREE from 'three';
import {
    boundsOf,
    CAMERA_PRESETS,
    cameraPosition,
    clampElevation,
    fitCameraTo,
    fitDistance,
    FOV_DEG,
    horizontalDrag,
    intersectHorizontalPlane,
    MAX_DISTANCE,
    MAX_ELEVATION,
    orbit,
    zModeDrag,
    Z_DRAG_MIN_COS_ELEVATION,
    zoom,
} from './surfaceMath';
import type {SurfaceCamera, Xyz} from './surfaceScene';

const camera: SurfaceCamera = {az: 0.3, el: 0.4, distance: 10, projection: 'perspective', target: [0, 0, 0]};

function netPoints(): Xyz[] {
    const pts: Xyz[] = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) pts.push([i * 2 - 3, j * 2 - 3, ((i * 3 + j * 5) % 4) - 1.5]);
    return pts;
}

describe('surface camera math', () => {
    it('places the camera z-up on the sphere around the target', () => {
        const [x, y, z] = cameraPosition(0, 0, 5);
        expect([x, y, z]).toEqual([0, -5, 0]);
        const p = cameraPosition(0.7, 0.5, 8, [1, 2, 3]);
        expect(Math.hypot(p[0] - 1, p[1] - 2, p[2] - 3)).toBeCloseTo(8, 10);
        expect(cameraPosition(0, Math.PI / 2, 4)[2]).toBeCloseTo(4, 10);
    });

    it('keeps the named presets', () => {
        expect(CAMERA_PRESETS.front).toEqual({az: 0, el: 0});
        expect(CAMERA_PRESETS.top.el).toBe(1.54);
        expect(CAMERA_PRESETS.isometric.az).toBeCloseTo(Math.PI / 4, 12);
    });

    it('every preset lies within the orbit limit, so a drag from a preset does not jump', () => {
        for (const preset of Object.values(CAMERA_PRESETS)) {
            expect(orbit({...camera, ...preset}, 0, 0).el).toBe(preset.el);
        }
        expect(orbit({...camera, ...CAMERA_PRESETS.top}, 0, 1).el).toBe(CAMERA_PRESETS.top.el);
    });

    it('clamps elevation and distance', () => {
        expect(clampElevation(5)).toBe(MAX_ELEVATION);
        expect(orbit(camera, 0, 100000).el).toBe(MAX_ELEVATION);
        expect(zoom(camera, 1e9).distance).toBe(MAX_DISTANCE);
    });

    it.each([[390, 844], [1440, 1000], [1000, 1000]])(
        'fits all net corners inside NDC for %ix%i at every preset', (w, h) => {
            const pts = netPoints();
            for (const name of ['front', 'top', 'side', 'isometric'] as const) {
                const cam = fitCameraTo(pts, w / h, {...camera, ...CAMERA_PRESETS[name]});
                const three = new THREE.PerspectiveCamera(FOV_DEG, w / h, 0.05, 500);
                three.up.set(0, 0, 1);
                three.position.set(...cameraPosition(cam.az, cam.el, cam.distance, cam.target));
                three.lookAt(...cam.target);
                three.updateMatrixWorld(true);
                three.updateProjectionMatrix();
                for (const p of pts) {
                    const v = new THREE.Vector3(...p).project(three);
                    expect(Math.abs(v.x), `${name} x`).toBeLessThanOrEqual(1);
                    expect(Math.abs(v.y), `${name} y`).toBeLessThanOrEqual(1);
                }
            }
        });

    it('needs more distance at narrow aspect ratios', () => {
        const b = boundsOf(netPoints());
        expect(fitDistance(b, 390 / 844)).toBeGreaterThan(fitDistance(b, 1440 / 1000));
    });

    it('intersects the horizontal plane exactly', () => {
        expect(intersectHorizontalPlane([0, -4, 4], [0, 1, -1], 1)).toEqual([0, -1, 1]);
        expect(intersectHorizontalPlane([0, 0, 4], [1, 0, 0], 1)).toBeNull();
        expect(intersectHorizontalPlane([0, 0, 4], [0, 0, 1], 1)).toBeNull();
    });

    it('horizontal drag keeps z exactly and follows the plane hit offset', () => {
        expect(horizontalDrag([1, 2, 3.5], [1.2, 2, 3.5], [2.2, 3, 3.5])).toEqual([2, 3, 3.5]);
    });

    it('z-mode drag changes only z, upward screen motion raising z, at the real field of view', () => {
        const worldPerPx = (2 * Math.tan((FOV_DEG * Math.PI) / 360) * 10) / 500;
        const out = zModeDrag([1, 2, 3], -50, 10, 500, 0, FOV_DEG);
        expect(out[0]).toBe(1);
        expect(out[1]).toBe(2);
        expect(out[2]).toBeCloseTo(3 + 50 * worldPerPx, 12);
    });

    it('z-mode drag keeps the point under the cursor through the real projection', () => {
        const heightPx = 500;
        for (const el of [0, 0.55, 1.0]) {
            const cam = new THREE.PerspectiveCamera(FOV_DEG, 1, 0.05, 500);
            const [cx, cy, cz] = cameraPosition(0.3, el, 10);
            cam.position.set(cx, cy, cz);
            cam.up.set(0, 0, 1);
            cam.lookAt(0, 0, 0);
            cam.updateMatrixWorld(true);
            cam.updateProjectionMatrix();
            const screenY = (z: number) => -new THREE.Vector3(0, 0, z).project(cam).y * (heightPx / 2);
            const dz = zModeDrag([0, 0, 0], -20, 10, heightPx, el)[2];
            // Dragging the cursor 20 px up must move the point 20 px up on screen (small offset from the centre).
            expect(Math.abs(screenY(0) - screenY(dz) - 20)).toBeLessThan(1.5); // perspective foreshortening of the moved point
        }
    });

    it('z-mode drag stays bounded at the top preset', () => {
        const worldPerPx = (2 * Math.tan((FOV_DEG * Math.PI) / 360) * 10) / 500;
        const top = zModeDrag([0, 0, 0], -100, 10, 500, CAMERA_PRESETS.top.el)[2];
        expect(top).toBeCloseTo((100 * worldPerPx) / Z_DRAG_MIN_COS_ELEVATION, 12);
    });
});
