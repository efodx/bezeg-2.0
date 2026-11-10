/**
 * Kinematics motions: a DerivativeSource read as a motion in time (seconds, metres).
 * Pure plain-number kernel. Contract: docs/specs/kinematics-lessons.md, "Kinematics kernel".
 * Velocity is r'(t), acceleration is r''(t); both depend on the parametrization, the path does not.
 */
import type {DerivativeSource, DerivativeTuple} from "../bezeg/impl/curve/curvature";

/** The single model constant for gravity, in m/s^2 (ADR 0050 section 2). */
export const G = 9.81;

export const ALPHA_MIN_DEG = 5;
export const ALPHA_MAX_DEG = 85;
export const CIRCLE_R_MIN = 0.5;
export const CIRCLE_R_MAX = 4;
export const CIRCLE_OMEGA_MIN = 0.5;
export const CIRCLE_OMEGA_MAX = 4;
/** Upper limit of the speed-variation amplitude b; theta = t + b sin t is monotone for b < 1. */
export const WARP_B_MAX = 0.9;

/** Which exact classification of a_T applies (spec item 4). */
export type MotionId = 'circular' | 'projectile' | 'generic';

function requireFinite(name: string, value: number): void {
    if (!Number.isFinite(value)) {
        throw new RangeError(`${name} must be a finite number, got ${value}.`);
    }
}

function requireRange(name: string, value: number, lo: number, hi: number): void {
    requireFinite(name, value);
    if (value < lo || value > hi) {
        throw new RangeError(`${name} must be in [${lo}, ${hi}], got ${value}.`);
    }
}

/** Projectile r = (v0 cos(a) t, v0 sin(a) t - g t^2 / 2); alpha in degrees, in [5, 85]. */
export function projectileSource(v0: number, alphaDeg: number, g: number = G): DerivativeSource {
    requireFinite('v0', v0);
    if (v0 <= 0) {
        throw new RangeError(`v0 must be positive, got ${v0}.`);
    }
    requireRange('alpha', alphaDeg, ALPHA_MIN_DEG, ALPHA_MAX_DEG);
    requireFinite('g', g);
    if (g <= 0) {
        throw new RangeError(`g must be positive, got ${g}.`);
    }
    const a = alphaDeg * Math.PI / 180;
    const vx = v0 * Math.cos(a);
    const vy = v0 * Math.sin(a);
    return {
        scale: v0 * v0 / g,
        at(t) {
            return {
                point: [vx * t, vy * t - g * t * t / 2],
                d1: [vx, vy - g * t],
                d2: [0, -g],
            };
        },
    };
}

/** Uniform circular motion r = (R cos(w t), R sin(w t)); R, w in [0.5, 4]. */
export function circularSource(R: number, omega: number): DerivativeSource {
    requireRange('R', R, CIRCLE_R_MIN, CIRCLE_R_MAX);
    requireRange('omega', omega, CIRCLE_OMEGA_MIN, CIRCLE_OMEGA_MAX);
    return {
        scale: R,
        at(t) {
            const c = Math.cos(omega * t);
            const s = Math.sin(omega * t);
            return {
                point: [R * c, R * s],
                d1: [-R * omega * s, R * omega * c],
                d2: [-R * omega * omega * c, -R * omega * omega * s],
            };
        },
    };
}

/** phi(t), phi'(t), phi''(t) as one tuple. */
export type Reparametrization = (t: number) => readonly [number, number, number];

/**
 * r(phi(t)) with r'phi' and r''phi'^2 + r'phi'' (chain rule). The path is unchanged; speed,
 * acceleration and timing change.
 */
export function reparametrize(source: DerivativeSource, phi: Reparametrization): DerivativeSource {
    return {
        scale: source.scale,
        at(t): DerivativeTuple {
            const [p, p1, p2] = phi(t);
            if (!Number.isFinite(p) || !Number.isFinite(p1) || !Number.isFinite(p2)) {
                throw new RangeError(`Reparametrization is not finite at t=${t}.`);
            }
            const s = source.at(p);
            return {
                point: s.point,
                d1: [s.d1[0] * p1, s.d1[1] * p1],
                d2: [s.d2[0] * p1 * p1 + s.d1[0] * p2, s.d2[1] * p1 * p1 + s.d1[1] * p2],
            };
        },
    };
}

/** phi(t) = t + b sin t, the KN2 reparametrization; b in [0, 0.9] keeps phi monotone. */
export function sineWarp(b: number): Reparametrization {
    requireRange('b', b, 0, WARP_B_MAX);
    return t => [t + b * Math.sin(t), 1 + b * Math.cos(t), -b * Math.sin(t)];
}

export interface ProjectileSummary {
    vx: number;
    vy: number;
    /** 2 vy / g (s). */
    flightTime: number;
    /** vx * flightTime (m). */
    range: number;
    /** vy^2 / (2 g) (m). */
    maxHeight: number;
    /** vy / g (s). */
    apexTime: number;
}

/** Closed-form flight data for a launch from the ground. */
export function projectileSummary(v0: number, alphaDeg: number, g: number = G): ProjectileSummary {
    projectileSource(v0, alphaDeg, g); // validates
    const a = alphaDeg * Math.PI / 180;
    const vx = v0 * Math.cos(a);
    const vy = v0 * Math.sin(a);
    const flightTime = 2 * vy / g;
    return {vx, vy, flightTime, range: vx * flightTime, maxHeight: vy * vy / (2 * g), apexTime: vy / g};
}

export type TangentialStatus = 'constant-speed' | 'speeding-up' | 'slowing-down' | 'stationary-approx';

/** Relative threshold for a_T against |r''| (an acceleration scale, not SPEED_EPS). */
export const AT_THRESHOLD = 1e-9;

/**
 * Wording class of the speed change. Circular motion is "constant-speed" by construction (a_T = 0 exactly
 * in theory). Every other motion, the projectile included, is classified by the sign of the computed a_T
 * against 1e-9 |r''|; the projectile never gets "constant-speed". The result is approximate: never print
 * "exactly 0" for a computed value.
 */
export function tangentialStatus(id: MotionId, aT: number, accelerationNorm: number): TangentialStatus {
    requireFinite('aT', aT);
    requireFinite('accelerationNorm', accelerationNorm);
    if (id === 'circular') {
        return 'constant-speed';
    }
    if (Math.abs(aT) <= AT_THRESHOLD * Math.abs(accelerationNorm)) {
        return 'stationary-approx';
    }
    return aT > 0 ? 'speeding-up' : 'slowing-down';
}
