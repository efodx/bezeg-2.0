/**
 * Test-only pinhole camera, written independently of `jsxProjection.ts` and of Three: it builds the eye from the
 * documented `SurfaceCamera` convention (eye = target + distance * (cos el sin az, -cos el cos az, sin el), world z up,
 * vertical field of view `fovDeg`, aspect = width / height) and a look-at basis, then projects with the textbook
 * pinhole formula. It imports nothing from the surface view on purpose.
 */

type V3 = [number, number, number];

export interface OracleCamera {
    az: number;
    el: number;
    distance: number;
    target: [number, number, number];
}

export interface OraclePoint {
    ndcX: number;
    ndcY: number;
    /** Depth in NDC for a clip range `[near, far]` (OpenGL convention, as Three's `project`). */
    ndcZ: number;
    depth: number;
    /** Pixels from the viewport's top-left corner. */
    x: number;
    y: number;
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V3): V3 => {
    const n = Math.hypot(a[0], a[1], a[2]);
    return [a[0] / n, a[1] / n, a[2] / n];
};

export const ORACLE_FOV_DEG = 38;
export const ORACLE_NEAR = 0.05;
export const ORACLE_FAR = 500;

export function pinholeProject(
    camera: OracleCamera, viewport: {width: number; height: number}, point: readonly [number, number, number],
    fovDeg: number = ORACLE_FOV_DEG,
): OraclePoint {
    const target: V3 = [camera.target[0], camera.target[1], camera.target[2]];
    const eye: V3 = [
        target[0] + camera.distance * Math.cos(camera.el) * Math.sin(camera.az),
        target[1] - camera.distance * Math.cos(camera.el) * Math.cos(camera.az),
        target[2] + camera.distance * Math.sin(camera.el),
    ];
    const forward = unit(sub(target, eye));
    const right = unit(cross(forward, [0, 0, 1]));
    const up = cross(right, forward);
    const rel = sub([point[0], point[1], point[2]], eye);
    const depth = dot(rel, forward);
    const focal = 1 / Math.tan((fovDeg * Math.PI) / 360);
    const aspect = viewport.width / viewport.height;
    const ndcX = (focal / aspect) * dot(rel, right) / depth;
    const ndcY = focal * dot(rel, up) / depth;
    const ndcZ = (ORACLE_FAR + ORACLE_NEAR) / (ORACLE_FAR - ORACLE_NEAR)
        - (2 * ORACLE_FAR * ORACLE_NEAR) / ((ORACLE_FAR - ORACLE_NEAR) * depth);
    return {
        ndcX, ndcY, ndcZ, depth,
        x: (ndcX + 1) * viewport.width / 2,
        y: (1 - ndcY) * viewport.height / 2,
    };
}

export const ORACLE_VIEWPORTS: Array<{width: number; height: number}> = [
    {width: 390, height: 844}, {width: 1440, height: 1000}, {width: 800, height: 600}, {width: 1280, height: 400},
    {width: 1000, height: 1000}, {width: 420, height: 260},
];

export const ORACLE_PROBES: Array<[number, number, number]> = [
    [0, 0, 0], [4, 0, 0.3], [2, 3, -0.5], [-3, 4, 1], [1.3, -2.7, 0.2], [0.1, 0.2, 2.5],
];

/** Deterministic random cameras; every tenth sits at the steepest elevation (1.54 rad) and every tenth at the lowest. */
export function randomOracleCameras(
    count: number, seed = 123456789,
): Array<{camera: OracleCamera & {projection: 'perspective'}; viewport: {width: number; height: number}}> {
    let s = seed;
    const rnd = (lo: number, hi: number): number => lo + ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648) * (hi - lo);
    return Array.from({length: count}, (_, i) => ({
        camera: {
            az: rnd(-Math.PI, Math.PI),
            el: i % 10 === 0 ? 1.54 : i % 10 === 1 ? -1.54 : rnd(-1.54, 1.54),
            distance: rnd(7.5, 80),
            projection: 'perspective' as const,
            target: [rnd(-4, 4), rnd(-4, 4), rnd(-2, 2)] as [number, number, number],
        },
        viewport: ORACLE_VIEWPORTS[i % ORACLE_VIEWPORTS.length],
    }));
}
