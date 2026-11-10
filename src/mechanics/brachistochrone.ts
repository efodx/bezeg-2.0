import { G } from './descentTime';
import { cycloidTrack, type Track, type Vec2 } from './tracks';

export const BRACHISTOCHRONE_BISECTIONS = 200;

export interface Brachistochrone {
    /** Parameter θ_B of the end point on the cycloid, in (0, 2π). */
    theta: number;
    /** Radius of the rolling circle. */
    r: number;
    /** Descent time θ_B sqrt(r / g). */
    time: number;
    track: Track;
}

/** (θ - sin θ) / (1 - cos θ), strictly increasing on (0, 2π). A series avoids cancellation near 0. */
function cycloidRatio(theta: number): number {
    const numerator = theta < 0.01 ? (theta ** 3 / 6) * (1 - (theta * theta) / 20) : theta - Math.sin(theta);
    return numerator / (1 - Math.cos(theta));
}

/**
 * The cycloid x = r(θ - sin θ), y = r(1 - cos θ) from the origin through B = (xB, yB), with xB, yB > 0.
 * θ_B solves (θ - sin θ)/(1 - cos θ) = xB/yB by 200 bisection steps; r = yB / (1 - cos θ_B).
 */
export function brachistochrone(b: Vec2, g: number = G): Brachistochrone {
    const [xB, yB] = b;
    if (!(xB > 0) || !(yB > 0)) throw new RangeError('The end point needs x > 0 and depth y > 0.');
    const target = xB / yB;
    let lo = 0;
    let hi = 2 * Math.PI;
    for (let i = 0; i < BRACHISTOCHRONE_BISECTIONS; i++) {
        const mid = (lo + hi) / 2;
        if (cycloidRatio(mid) < target) lo = mid;
        else hi = mid;
    }
    const theta = (lo + hi) / 2;
    const r = yB / (1 - Math.cos(theta));
    return { theta, r, time: theta * Math.sqrt(r / g), track: cycloidTrack(r, 0, theta) };
}
